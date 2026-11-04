import Phaser from "phaser";
import { FONT } from "../config";
import { DialogBox } from "../ui/DialogBox";

/** Interface por cima do mundo (sem zoom): nome do mundo, dicas e caixa de diálogo. */
export class UIScene extends Phaser.Scene {
  dialog!: DialogBox;

  constructor() {
    super("UI");
  }

  create({ worldName }: { worldName: string }) {
    const style = { fontFamily: FONT, color: "#ffffff", backgroundColor: "#1b1f2acc" };

    this.add.text(20, 20, worldName, { ...style, fontSize: "26px", fontStyle: "bold", padding: { x: 14, y: 8 } });
    this.add
      .text(this.scale.width - 20, 20, "Setas / WASD: andar   ·   Espaço: conversar", {
        ...style, fontSize: "18px", padding: { x: 12, y: 8 },
      })
      .setOrigin(1, 0)
      .setAlpha(0.85);

    this.dialog = new DialogBox(this);
  }
}
