import Phaser from "phaser";
import { EMOTES, achievementDef, type AuthUser, type EarnedAchievement, type TaskResult } from "@school-class/shared";
import { api } from "../api/client";
import { logout } from "../auth/login";
import { FONT } from "../config";
import { DialogBox } from "../ui/DialogBox";
import { switchWorld } from "../ui/worldSelect";
import { Hud } from "../ui/Hud";
import { TaskPanel } from "../ui/TaskPanel";

/** Interface por cima do mundo (sem zoom): jogador, nome do mundo, dicas e diálogo. */
export class UIScene extends Phaser.Scene {
  dialog!: DialogBox;
  hud!: Hud;
  readonly taskPanel = new TaskPanel();
  private controlsHint!: Phaser.GameObjects.Text;
  private onlineText!: Phaser.GameObjects.Text;
  private emoteButton!: Phaser.GameObjects.Text;
  private emoteMenu!: Phaser.GameObjects.Container;
  private notices: Phaser.GameObjects.Text[] = [];
  /** Conquistas esperando a vez de serem comemoradas (uma por vez). */
  private celebrations: EarnedAchievement[] = [];
  private celebrating = false;
  private celebrated = new Set<string>();

  constructor() {
    super("UI");
  }

  create({ worldName }: { worldName: string }) {
    const user = this.registry.get("user") as AuthUser;
    const { width } = this.scale;
    const style = { fontFamily: FONT, color: "#ffffff", backgroundColor: "#1b1f2acc" };

    this.hud = new Hud(this, 20, 20, user);

    // Nome do mundo, centralizado no topo, e quantos estão online.
    const title = this.add
      .text(width / 2, 20, worldName, { ...style, fontSize: "22px", fontStyle: "bold", padding: { x: 14, y: 8 } })
      .setOrigin(0.5, 0);
    this.onlineText = this.add
      .text(width / 2, title.y + title.height + 6, "", { ...style, fontSize: "15px", padding: { x: 10, y: 4 } })
      .setOrigin(0.5, 0)
      .setAlpha(0.9);

    // Botão "Sair".
    const exit = this.add
      .text(width - 20, 20, "Sair", {
        fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#c0504d", padding: { x: 14, y: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    exit.on("pointerover", () => exit.setBackgroundColor("#d9625e"));
    exit.on("pointerout", () => exit.setBackgroundColor("#c0504d"));
    exit.on("pointerdown", () => logout());

    // Botão "Visual" (trocar o personagem), ao lado do Sair.
    const look = this.add
      .text(exit.x - exit.width - 10, 20, "🎨 Visual", {
        fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 14, y: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    look.on("pointerover", () => look.setBackgroundColor("#ffe27a"));
    look.on("pointerout", () => look.setBackgroundColor("#f6d55c"));
    look.on("pointerdown", () => {
      if (!this.dialog.isOpen) this.events.emit("edit-avatar");
    });

    // Botão "Medalhas".
    const medals = this.add
      .text(look.x - look.width - 10, 20, "🏅 Medalhas", {
        fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 14, y: 8 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    medals.on("pointerover", () => medals.setBackgroundColor("#ffe27a"));
    medals.on("pointerout", () => medals.setBackgroundColor("#f6d55c"));
    medals.on("pointerdown", () => {
      if (!this.dialog.isOpen) this.events.emit("show-achievements");
    });

    // Botão "Mundos", quando o aluno tem mais de um mundo.
    if ((this.registry.get("worldCount") as number) > 1) {
      const worlds = this.add
        .text(medals.x - medals.width - 10, 20, "🗺️ Mundos", {
          fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#1b1f2a",
          backgroundColor: "#f6d55c", padding: { x: 14, y: 8 },
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });
      worlds.on("pointerover", () => worlds.setBackgroundColor("#ffe27a"));
      worlds.on("pointerout", () => worlds.setBackgroundColor("#f6d55c"));
      worlds.on("pointerdown", () => switchWorld());
    }

    // Dica de controles, no canto inferior direito.
    this.controlsHint = this.add
      .text(width - 20, this.scale.height - 20, "Setas / WASD: andar   ·   Espaço: conversar   ·   1–6: emotes", {
        ...style, fontSize: "16px", padding: { x: 12, y: 6 },
      })
      .setOrigin(1, 1)
      .setAlpha(0.8);

    this.createEmoteMenu();
    this.dialog = new DialogBox(this);
  }

  /** Botão "😀 Emotes" (canto inferior esquerdo) com as frases prontas — bom para mouse e tablet. */
  private createEmoteMenu() {
    const { height } = this.scale;
    this.emoteButton = this.add
      .text(20, height - 20, "😀 Emotes", {
        fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 14, y: 8 },
      })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });

    this.emoteMenu = this.add.container(20, height - 70).setVisible(false);
    EMOTES.forEach((e, i) => {
      const item = this.add
        .text(0, -i * 44, `${i + 1}  ${e.text}`, {
          fontFamily: FONT, fontSize: "18px", color: "#ffffff",
          backgroundColor: "#1b1f2aee", padding: { x: 12, y: 8 }, fixedWidth: 260,
        })
        .setOrigin(0, 1)
        .setInteractive({ useHandCursor: true });
      item.on("pointerover", () => item.setBackgroundColor("#3a4154"));
      item.on("pointerout", () => item.setBackgroundColor("#1b1f2aee"));
      item.on("pointerdown", () => {
        this.events.emit("emote", i);
        this.emoteMenu.setVisible(false);
      });
      this.emoteMenu.add(item);
    });
    this.emoteButton.on("pointerdown", () => this.emoteMenu.setVisible(!this.emoteMenu.visible));
  }

  /** Atualiza "👥 N no mundo" (null = multiplayer indisponível). */
  setOnline(count: number | null, connected: boolean) {
    if (!this.onlineText) return; // interface ainda não criada
    if (count === null) return this.onlineText.setText("").setVisible(false);
    this.onlineText
      .setVisible(true)
      .setText(connected ? `👥 ${count} ${count === 1 ? "pessoa" : "pessoas"} no mundo` : "⚠️ Reconectando...");
  }

  /** Aviso discreto no canto (ex.: "Maria subiu para o nível 3!"). Empilha até 3. */
  notify(message: string, durationMs = 4000) {
    if (!this.sys.isActive()) return;
    const { width } = this.scale;
    const n = this.add
      .text(width - 20, 76, message, {
        fontFamily: FONT, fontSize: "17px", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 12, y: 8 }, wordWrap: { width: 420 },
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    this.notices.push(n);
    if (this.notices.length > 3) this.notices.shift()?.destroy();
    this.layoutNotices();
    this.tweens.add({ targets: n, alpha: 1, duration: 200 });
    this.time.delayedCall(durationMs, () =>
      this.tweens.add({
        targets: n,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.notices = this.notices.filter((x) => x !== n);
          n.destroy();
          this.layoutNotices();
        },
      }),
    );
  }

  private layoutNotices() {
    let y = 76;
    for (const n of this.notices) {
      n.setY(y);
      y += n.height + 8;
    }
  }

  /** Aplica o resultado de uma resposta: atualiza o HUD e comemora a subida de nível. */
  applyResult(result: TaskResult) {
    this.registry.set("user", result.user);
    this.hud.setUser(result.user);
    if (result.leveledUp) {
      this.time.delayedCall(900, () => this.toast(`⭐ Subiu para o nível ${result.user.level}!`));
    }
    // Conquistas depois do aviso de nível (para não ficarem uma em cima da outra).
    for (const a of result.achievements ?? []) this.celebrate(a, result.leveledUp ? 3800 : 900);
  }

  /**
   * Comemora uma conquista (cartão no centro da tela). Várias entram na fila.
   * Depois de mostrar, avisa o servidor para não repetir no próximo login.
   */
  celebrate(a: EarnedAchievement, delayMs = 0) {
    if (this.celebrated.has(a.key)) return;
    this.celebrated.add(a.key);
    this.celebrations.push(a);
    if (!this.celebrating) {
      this.celebrating = true;
      this.time.delayedCall(delayMs, () => this.nextCelebration());
    }
  }

  private nextCelebration(): void {
    const a = this.celebrations.shift();
    if (!a || !this.sys.isActive()) {
      this.celebrating = false;
      return;
    }
    const def = achievementDef(a.id);
    if (!def) return this.nextCelebration();
    const { width, height } = this.scale;
    const detail = a.worldName ? `${def.description}\n${a.worldName}` : def.description;
    const box = this.add.container(width / 2, height * 0.42).setDepth(1001).setAlpha(0).setScale(0.6);
    const text = this.add
      .text(0, 0, `🏅 Nova conquista!\n\n${def.icon}  ${def.name}\n${detail}`, {
        fontFamily: FONT, fontSize: "24px", color: "#ffffff", align: "center", lineSpacing: 6,
        backgroundColor: "#262b3a", padding: { x: 32, y: 22 }, wordWrap: { width: 520 },
      })
      .setOrigin(0.5);
    const border = this.add.rectangle(0, 0, text.width + 8, text.height + 8).setStrokeStyle(4, 0xf6d55c);
    box.add([border, text]);
    this.tweens.chain({
      targets: box,
      tweens: [
        { scale: 1, alpha: 1, duration: 300, ease: "Back.out" },
        { scale: 1, duration: 2600 },
        {
          alpha: 0, y: box.y - 30, duration: 400,
          onComplete: () => {
            box.destroy();
            this.nextCelebration();
          },
        },
      ],
    });
    if (!a.seen) void api.markAchievementsSeen([a.key]).catch(() => {});
  }

  /** Aviso grande e temporário no centro da tela. */
  toast(message: string) {
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height * 0.3, message, {
        fontFamily: FONT, fontSize: "40px", fontStyle: "bold", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 28, y: 16 },
      })
      .setOrigin(0.5)
      .setScale(0.4)
      .setAlpha(0)
      .setDepth(1000);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1, alpha: 1, duration: 300, ease: "Back.out" },
        { scale: 1, duration: 1800 },
        { alpha: 0, y: t.y - 30, duration: 400, onComplete: () => t.destroy() },
      ],
    });
  }

  update() {
    // A dica fica escondida enquanto o diálogo está aberto (ocupariam o mesmo espaço).
    this.controlsHint.setVisible(!this.dialog.isOpen);
    this.emoteButton.setVisible(!this.dialog.isOpen);
    if (this.dialog.isOpen) this.emoteMenu.setVisible(false);
  }
}
