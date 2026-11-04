import Phaser from "phaser";
import { levelProgress, xpForLevel, type AuthUser } from "@school-class/shared";
import { FONT } from "../config";

const W = 300;
const H = 92;
const BAR_W = W - 32;

/** Painel do jogador: nome, nível e barra de XP. */
export class Hud extends Phaser.GameObjects.Container {
  private nameText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private xpText: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, user: AuthUser) {
    super(scene, x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(0x1b1f2a, 0.9).fillRoundedRect(0, 0, W, H, 12);
    bg.lineStyle(3, 0xf6d55c, 1).strokeRoundedRect(0, 0, W, H, 12);

    this.nameText = scene.add.text(16, 12, "", {
      fontFamily: FONT, fontSize: "22px", fontStyle: "bold", color: "#ffffff",
    });
    this.levelText = scene.add
      .text(W - 16, 12, "", {
        fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 8, y: 3 },
      })
      .setOrigin(1, 0);
    this.bar = scene.add.graphics();
    this.xpText = scene.add.text(16, 66, "", { fontFamily: FONT, fontSize: "14px", color: "#a9b0c2" });

    this.add([bg, this.nameText, this.levelText, this.bar, this.xpText]);
    scene.add.existing(this);
    this.setUser(user);
  }

  /** Atualiza com novos dados (ex.: depois de ganhar XP). */
  setUser(user: AuthUser) {
    this.nameText.setText(user.name);
    this.levelText.setText(`Nv. ${user.level}`);

    const next = xpForLevel(user.level + 1);
    this.xpText.setText(`${user.xp} / ${next} XP`);

    this.bar.clear();
    this.bar.fillStyle(0x3a4154, 1).fillRoundedRect(16, 46, BAR_W, 14, 7);
    const fill = Math.max(0, Math.min(1, levelProgress(user.xp))) * BAR_W;
    if (fill > 0) this.bar.fillStyle(0x6fcf6f, 1).fillRoundedRect(16, 46, Math.max(fill, 14), 14, 7);
  }
}
