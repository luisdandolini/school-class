import Phaser from "phaser";
import type { AuthUser, TaskResult } from "@school-class/shared";
import { logout } from "../auth/login";
import { FONT } from "../config";
import { DialogBox } from "../ui/DialogBox";
import { Hud } from "../ui/Hud";
import { TaskPanel } from "../ui/TaskPanel";

/** Interface por cima do mundo (sem zoom): jogador, nome do mundo, dicas e diálogo. */
export class UIScene extends Phaser.Scene {
  dialog!: DialogBox;
  hud!: Hud;
  readonly taskPanel = new TaskPanel();
  private controlsHint!: Phaser.GameObjects.Text;

  constructor() {
    super("UI");
  }

  create({ worldName }: { worldName: string }) {
    const user = this.registry.get("user") as AuthUser;
    const { width } = this.scale;
    const style = { fontFamily: FONT, color: "#ffffff", backgroundColor: "#1b1f2acc" };

    this.hud = new Hud(this, 20, 20, user);

    // Nome do mundo, centralizado no topo.
    this.add
      .text(width / 2, 20, worldName, { ...style, fontSize: "22px", fontStyle: "bold", padding: { x: 14, y: 8 } })
      .setOrigin(0.5, 0);

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

    // Dica de controles, no canto inferior direito.
    this.controlsHint = this.add
      .text(width - 20, this.scale.height - 20, "Setas / WASD: andar   ·   Espaço: conversar", {
        ...style, fontSize: "16px", padding: { x: 12, y: 6 },
      })
      .setOrigin(1, 1)
      .setAlpha(0.8);

    this.dialog = new DialogBox(this);
  }

  /** Aplica o resultado de uma resposta: atualiza o HUD e comemora a subida de nível. */
  applyResult(result: TaskResult) {
    this.registry.set("user", result.user);
    this.hud.setUser(result.user);
    if (result.leveledUp) {
      this.time.delayedCall(900, () => this.toast(`⭐ Subiu para o nível ${result.user.level}!`));
    }
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
  }
}
