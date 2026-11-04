import Phaser from "phaser";
import type { AuthUser, NpcTask, TaskResult, WorldDetail } from "@school-class/shared";
import { api, ApiError } from "../api/client";
import { DEPTH, FONT, INTERACT_DISTANCE, WORLD_ZOOM } from "../config";
import { Npc } from "../entities/Npc";
import { Player } from "../entities/Player";
import type { UIScene } from "./UIScene";

/** Cena principal: mapa, jogador, NPCs e interação. */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private npcs: Npc[] = [];
  private nearby?: Npc;
  private talkingTo?: Npc;
  private ui!: UIScene;

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
    this.player = new Player(this, spawn?.x ?? map.widthInPixels / 2, spawn?.y ?? map.heightInPixels / 2, user.name);
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
  }

  update() {
    this.player.update();

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

      if (count > 0) {
        await this.ui.dialog.open(name, [
          npc.data_.greeting,
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

      await this.ui.dialog.open(name, [this.farewell(tasks)]);
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
    return "Já recebi suas respostas. Assim que seu professor corrigir, você ganha o XP!";
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
