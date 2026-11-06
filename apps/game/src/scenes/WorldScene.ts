import Phaser from "phaser";
import { EMOTES, WS_CLOSE, type AuthUser, type NpcTask, type RemotePlayerState, type ServerMessage, type TaskResult, type WorldDetail } from "@school-class/shared";
import { api, ApiError } from "../api/client";
import { AVATAR_BASE, ensureAvatarTexture } from "../avatar";
import { DEPTH, FONT, INTERACT_DISTANCE, WORLD_ZOOM } from "../config";
import { Npc } from "../entities/Npc";
import { Player } from "../entities/Player";
import { RemotePlayer } from "../entities/RemotePlayer";
import { Realtime } from "../net/Realtime";
import { editAvatar } from "../ui/avatarCreator";
import { showBubble } from "../ui/bubble";
import type { UIScene } from "./UIScene";

/** Cena principal: mapa, jogador, NPCs e interação. */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private npcs: Npc[] = [];
  private nearby?: Npc;
  private talkingTo?: Npc;
  private ui!: UIScene;
  private realtime?: Realtime;
  private remotes = new Map<string, RemotePlayer>();

  constructor() {
    super("World");
  }

  create({ world }: { world: WorldDetail }) {
    // --- mapa ---
    const map = this.make.tilemap({ key: world.mapKey });
    const tiles = map.addTilesetImage("tiles", "tiles")!;
    const ground = map.createLayer("Chao", tiles)!.setDepth(DEPTH.ground);
    const objects = map.createLayer("Objetos", tiles)!.setDepth(DEPTH.objects);
    map.createLayer("Topo", tiles)!.setDepth(DEPTH.top);
    ground.setCollisionByProperty({ collides: true }); // água
    objects.setCollisionByProperty({ collides: true });
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- jogador ---
    const spawn = map.findObject("Pontos", (o) => o.name === "spawn");
    const user = this.registry.get("user") as AuthUser;
    const skin = ensureAvatarTexture(this, user.avatar);
    this.player = new Player(this, spawn?.x ?? map.widthInPixels / 2, spawn?.y ?? map.heightInPixels / 2, user.name, skin);
    this.physics.add.collider(this.player, [ground, objects]);

    // --- NPCs (vindos do backend) ---
    this.npcs = world.npcs.map((data) => new Npc(this, data));
    this.physics.add.collider(this.player, this.npcs);

    // --- câmera ---
    this.cameras.main
      .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
      .setZoom(WORLD_ZOOM)
      .startFollow(this.player, true, 0.15, 0.15)
      .fadeIn(400);

    // --- interface (diálogo, HUD) roda numa cena separada, sem zoom ---
    this.scene.launch("UI", { worldName: world.name });
    this.ui = this.scene.get("UI") as UIScene;

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard!.addKey(K.SPACE).on("down", () => this.interact());
    this.input.keyboard!.addKey(K.E).on("down", () => this.interact());

    // Emotes: teclas 1 a 6 (ou o botão de emotes na interface).
    const digits = [K.ONE, K.TWO, K.THREE, K.FOUR, K.FIVE, K.SIX];
    EMOTES.forEach((e, i) => this.input.keyboard!.addKey(digits[i]).on("down", () => this.sendEmote(i)));
    this.ui.events.on("emote", (i: number) => this.sendEmote(i));
    this.ui.events.on("edit-avatar", () => void this.changeAvatar());

    this.connectRealtime(world.id);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.realtime?.destroy());
  }

  // ---------- multiplayer ----------

  private connectRealtime(worldId: string) {
    const rt = new Realtime(worldId);
    this.realtime = rt;
    const countOnline = () => this.ui.setOnline(this.remotes.size + 1, rt.connected);

    rt.on("welcome", (m: Extract<ServerMessage, { t: "welcome" }>) => {
      // Ao (re)conectar, a lista do servidor é a verdade.
      this.remotes.forEach((r) => r.destroy());
      this.remotes.clear();
      m.players.forEach((p) => this.remotes.set(p.id, this.addRemote(p)));
      countOnline();
    });
    rt.on("join", (m: Extract<ServerMessage, { t: "join" }>) => {
      this.remotes.get(m.player.id)?.destroy();
      const r = this.addRemote(m.player);
      this.remotes.set(m.player.id, r);
      showBubble(this, r, "👋", 1500);
      countOnline();
    });
    rt.on("move", (m: Extract<ServerMessage, { t: "move" }>) => this.remotes.get(m.id)?.setState_(m.x, m.y, m.facing, m.moving));
    rt.on("leave", (m: Extract<ServerMessage, { t: "leave" }>) => {
      this.remotes.get(m.id)?.destroy();
      this.remotes.delete(m.id);
      countOnline();
    });
    rt.on("emote", (m: Extract<ServerMessage, { t: "emote" }>) => {
      const r = this.remotes.get(m.id);
      const e = EMOTES.find((x) => x.id === m.emote);
      if (r && e) showBubble(this, r, e.text);
    });
    rt.on("levelup", (m: Extract<ServerMessage, { t: "levelup" }>) => {
      const r = this.remotes.get(m.id);
      if (r) {
        r.setLevel(m.level);
        showBubble(this, r, `⭐ Nível ${m.level}!`);
      }
      this.ui.notify(`🎉 ${m.name} subiu para o nível ${m.level}!`);
    });
    rt.on("avatar", (m: Extract<ServerMessage, { t: "avatar" }>) => {
      this.remotes.get(m.id)?.setSkin(ensureAvatarTexture(this, m.avatar));
    });
    rt.on("status", countOnline);
    // A interface é criada logo depois desta cena: atualiza o contador quando ela estiver pronta.
    this.ui.events.once(Phaser.Scenes.Events.CREATE, countOnline);
    rt.on("stopped", (code: number) => {
      this.ui.notify(
        code === WS_CLOSE.replaced
          ? "Você abriu o jogo em outra aba. Os colegas agora veem você por lá."
          : "Não foi possível entrar no modo multiplayer deste mundo.",
        8000,
      );
      this.remotes.forEach((r) => r.destroy());
      this.remotes.clear();
      this.ui.setOnline(null, false);
    });
    countOnline();
  }

  private addRemote(state: RemotePlayerState) {
    return new RemotePlayer(this, state, ensureAvatarTexture(this, state.avatar));
  }

  /** Botão "🎨 Visual": abre a tela de personagem e aplica a escolha. */
  private async changeAvatar() {
    if (this.talkingTo || this.player.frozen) return;
    this.player.frozen = true;
    try {
      const user = this.registry.get("user") as AuthUser;
      const base = this.textures.get(AVATAR_BASE).getSourceImage() as HTMLImageElement;
      const updated = await this.withKeyboardPaused(() => editAvatar(base, user.avatar));
      if (!updated) return;
      this.registry.set("user", updated);
      this.player.setSkin(ensureAvatarTexture(this, updated.avatar));
      showBubble(this, this.player, "✨");
    } finally {
      this.player.frozen = false;
    }
  }

  private sendEmote(index: number) {
    const e = EMOTES[index];
    if (!e || this.talkingTo) return;
    showBubble(this, this.player, e.text);
    this.realtime?.sendEmote(e.id);
  }

  update(_time: number, delta: number) {
    this.player.update();
    this.realtime?.sendMove(this.player.x, this.player.y, this.player.facing, this.player.body.velocity.lengthSq() > 0);
    this.remotes.forEach((r) => r.tick(delta));

    // Mostra "Espaço" sobre o NPC mais próximo ao alcance.
    let closest: Npc | undefined;
    let best = INTERACT_DISTANCE;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < best) {
        best = d;
        closest = npc;
      }
    }
    this.nearby = closest;
    for (const npc of this.npcs) npc.setPromptVisible(npc === closest && !this.talkingTo);
  }

  private interact() {
    // Com diálogo aberto, Espaço avança a conversa.
    if (this.ui.dialog.isOpen) {
      this.ui.dialog.advance();
      return;
    }
    if (this.talkingTo || !this.nearby) return;
    void this.talkTo(this.nearby);
  }

  /** Conversa completa: saudação → desafios disponíveis → despedida. */
  private async talkTo(npc: Npc) {
    this.talkingTo = npc;
    this.player.frozen = true;
    npc.faceTowards(this.player.x, this.player.y);
    const name = npc.data_.name;

    try {
      let tasks: NpcTask[];
      try {
        tasks = await api.npcTasks(npc.data_.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return window.location.reload();
        await this.ui.dialog.open(name, ["Hmm... não consegui falar com você agora. Tente de novo daqui a pouco."]);
        return;
      }

      const available = () => tasks.filter((t) => t.status === "AVAILABLE");
      const count = available().length;
      const notes = teacherNotes(tasks);

      if (count > 0) {
        await this.ui.dialog.open(name, [
          npc.data_.greeting,
          ...notes,
          count === 1 ? "Tenho um desafio para você. Vamos lá?" : `Tenho ${count} desafios para você. Vamos lá?`,
        ]);

        // Um desafio por vez, até acabarem ou o aluno sair.
        for (let next = available()[0]; next; next = available()[0]) {
          const action = await this.withKeyboardPaused(() =>
            this.ui.taskPanel.run(next, {
              npcName: name,
              index: tasks.indexOf(next) + 1,
              total: tasks.length,
              hasNext: () => available().length > 0,
              onResult: (result) => this.onTaskResult(npc, tasks, result),
            }),
          );
          if (action === "close") break;
        }
      }

      await this.ui.dialog.open(name, count > 0 ? [this.farewell(tasks)] : [...notes, this.farewell(tasks)]);
    } finally {
      npc.resetFacing();
      this.talkingTo = undefined;
      this.player.frozen = false;
    }
  }

  /** Fala de despedida conforme o progresso. */
  private farewell(tasks: NpcTask[]): string {
    if (tasks.length === 0) return "Por enquanto não tenho desafios. Volte mais tarde!";
    if (tasks.every((t) => t.status === "COMPLETED")) return "Você completou todos os meus desafios. Parabéns! 🎉";
    if (tasks.some((t) => t.status === "AVAILABLE")) return "Volte quando quiser continuar!";
    return "Já recebi suas respostas. Assim que forem corrigidas, você ganha o XP!";
  }

  private onTaskResult(npc: Npc, tasks: NpcTask[], result: TaskResult) {
    const task = tasks.find((t) => t.id === result.taskId);
    if (task) {
      if (result.outcome === "CORRECT" || result.outcome === "ALREADY_COMPLETED") task.status = "COMPLETED";
      if (result.outcome === "PENDING_REVIEW") task.status = "PENDING_REVIEW";
    }
    npc.setProgress({
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      pendingReview: tasks.filter((t) => t.status === "PENDING_REVIEW").length,
    });
    this.ui.applyResult(result);
    if (result.xpGained > 0) this.floatText(`+${result.xpGained} XP`);
  }

  /** Texto que sobe e some acima do jogador (ex.: "+20 XP"). */
  private floatText(message: string) {
    const t = this.add
      .text(this.player.x, this.player.y - 14, message, {
        fontFamily: FONT, fontSize: "8px", fontStyle: "bold", color: "#6fcf6f",
        stroke: "#1b1f2a", strokeThickness: 2, resolution: 8,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels + 1);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 1400, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  /**
   * Enquanto uma janela HTML está aberta, o Phaser não pode "engolir" as teclas
   * (senão W, A, S, D e Espaço não funcionariam ao digitar a resposta).
   */
  private async withKeyboardPaused<T>(fn: () => Promise<T>): Promise<T> {
    const kb = this.input.keyboard!;
    kb.enabled = false;
    kb.disableGlobalCapture();
    try {
      return await fn();
    } finally {
      kb.resetKeys();
      kb.enableGlobalCapture();
      kb.enabled = true;
    }
  }
}

const SEEN_KEY = "school-class:comentarios-vistos";

/**
 * Falas do NPC sobre as respostas abertas que o professor corrigiu:
 * - corrigida como certa, com comentário: repassa o comentário uma única vez;
 * - "precisa melhorar": avisa sempre, até o aluno reenviar (o comentário aparece na janela do desafio).
 */
function teacherNotes(tasks: NpcTask[]): string[] {
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    /* sem armazenamento: mostra de novo, sem problema */
  }
  const notes: string[] = [];
  for (const t of tasks) {
    if (!t.review) continue;
    if (t.review.correct && t.status === "COMPLETED" && t.review.feedback) {
      const key = `${t.id}:${t.review.feedback}`;
      if (!seen.includes(key)) {
        notes.push(`Sua resposta foi corrigida e veio com um recado: “${t.review.feedback}”`);
        seen.push(key);
      }
    } else if (!t.review.correct && t.status === "AVAILABLE") {
      notes.push("Uma das suas respostas voltou da correção com um pedido para melhorar. Vamos tentar de novo?");
    }
  }
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-200)));
  } catch {
    /* ignora */
  }
  return notes;
}
