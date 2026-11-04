import Phaser from "phaser";
import { levelFromXp, levelProgress, xpForLevel, type AuthUser } from "@school-class/shared";
import { FONT } from "../config";

const W = 300;
const H = 92;
const BAR_W = W - 32;

/** Painel do jogador: nome, nível e barra de XP (animada ao ganhar XP). */
export class Hud extends Phaser.GameObjects.Container {
  private nameText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private xpText: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;
  /** XP mostrado no momento (anima até o valor real). */
  private shownXp = 0;
  private xpTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, user: AuthUser) {
    super(scene, x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(0x1b1f2a, 0.9).fillRoundedRect(0, 0, W, H, 12);
    bg.lineStyle(3, 0xf6d55c, 1).strokeRoundedRect(0, 0, W, H, 12);

    this.nameText = scene.add.text(16, 12, user.name, {
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

    this.shownXp = user.xp;
    this.draw(user.xp);
  }

  /** Atualiza o XP; com animate=true a barra "enche" até o novo valor. */
  setUser(user: AuthUser, animate = true) {
    this.nameText.setText(user.name);
    this.xpTween?.stop();
    if (!animate || user.xp <= this.shownXp) {
      this.shownXp = user.xp;
      this.draw(user.xp);
      return;
    }
    const state = { xp: this.shownXp };
    this.xpTween = this.scene.tweens.add({
      targets: state,
      xp: user.xp,
      duration: 900,
      ease: "Cubic.out",
      onUpdate: () => {
        this.shownXp = Math.round(state.xp);
        this.draw(this.shownXp);
      },
    });
  }

  private draw(xp: number) {
    const level = levelFromXp(xp);
    this.levelText.setText(`Nv. ${level}`);
    this.xpText.setText(`${xp} / ${xpForLevel(level + 1)} XP`);

    this.bar.clear();
    this.bar.fillStyle(0x3a4154, 1).fillRoundedRect(16, 46, BAR_W, 14, 7);
    const fill = Math.max(0, Math.min(1, levelProgress(xp))) * BAR_W;
    if (fill > 0) this.bar.fillStyle(0x6fcf6f, 1).fillRoundedRect(16, 46, Math.max(fill, 14), 14, 7);
  }
}
