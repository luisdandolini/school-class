import Phaser from "phaser";
import { FONT } from "../config";

const PADDING = 28;
const HEIGHT = 170;
const MARGIN = 32;
const CHARS_PER_SECOND = 45;

/**
 * Caixa de diálogo estilo RPG: texto aparece letra por letra.
 * Espaço → completa a fala atual; se já completa, vai para a próxima; no fim, fecha.
 */
export class DialogBox extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private nameTag: Phaser.GameObjects.Text;
  private body_: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private lines: string[] = [];
  private index = 0;
  private visibleChars = 0;
  private typing = false;
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    super(scene, MARGIN, height - HEIGHT - MARGIN);
    const w = width - MARGIN * 2;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x1b1f2a, 0.94).fillRoundedRect(0, 0, w, HEIGHT, 14);
    this.bg.lineStyle(4, 0xf6d55c, 1).strokeRoundedRect(0, 0, w, HEIGHT, 14);

    this.nameTag = scene.add.text(PADDING, -22, "", {
      fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color: "#1b1f2a",
      backgroundColor: "#f6d55c", padding: { x: 14, y: 6 },
    });

    this.body_ = scene.add.text(PADDING, PADDING + 8, "", {
      fontFamily: FONT, fontSize: "28px", color: "#ffffff",
      wordWrap: { width: w - PADDING * 2 }, lineSpacing: 8,
    });

    this.arrow = scene.add.text(w - PADDING, HEIGHT - PADDING / 2, "▼", {
      fontFamily: FONT, fontSize: "22px", color: "#f6d55c",
    }).setOrigin(1, 1);
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });

    this.add([this.bg, this.nameTag, this.body_, this.arrow]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  get isOpen() {
    return this.visible;
  }

  open(name: string, lines: string[]) {
    this.nameTag.setText(name);
    this.lines = lines;
    this.index = 0;
    this.setVisible(true);
    this.showLine();
  }

  /** Avança o diálogo. Retorna false quando o diálogo terminou e fechou. */
  advance(): boolean {
    if (this.typing) {
      this.finishTyping();
      return true;
    }
    this.index++;
    if (this.index >= this.lines.length) {
      this.close();
      return false;
    }
    this.showLine();
    return true;
  }

  close() {
    this.timer?.remove();
    this.typing = false;
    this.setVisible(false);
  }

  private showLine() {
    const line = this.lines[this.index] ?? "";
    this.visibleChars = 0;
    this.body_.setText("");
    this.arrow.setVisible(false);
    this.typing = true;
    this.timer?.remove();
    this.timer = this.scene.time.addEvent({
      delay: 1000 / CHARS_PER_SECOND,
      repeat: line.length - 1,
      callback: () => {
        this.visibleChars++;
        this.body_.setText(line.slice(0, this.visibleChars));
        if (this.visibleChars >= line.length) this.finishTyping();
      },
    });
  }

  private finishTyping() {
    this.timer?.remove();
    this.typing = false;
    this.body_.setText(this.lines[this.index] ?? "");
    this.arrow.setVisible(true);
  }
}
