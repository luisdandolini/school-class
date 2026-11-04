import Phaser from "phaser";
import type { Facing, RemotePlayerState } from "@school-class/shared";
import { DEPTH, FONT } from "../config";
import { idleFrame } from "./animations";

/** Um colega no mesmo mundo. Anda suavemente até a última posição recebida do servidor. */
export class RemotePlayer extends Phaser.GameObjects.Sprite {
  private target: { x: number; y: number };
  private facing: Facing;
  private moving: boolean;
  private label: Phaser.GameObjects.Text;
  readonly playerId: string;
  private name_: string;

  constructor(scene: Phaser.Scene, state: RemotePlayerState) {
    super(scene, state.x, state.y, "player", idleFrame(state.facing));
    this.playerId = state.id;
    this.name_ = state.name;
    this.target = { x: state.x, y: state.y };
    this.facing = state.facing;
    this.moving = state.moving;
    scene.add.existing(this);
    // Colegas ficam levemente transparentes para o aluno distinguir o próprio personagem.
    this.setAlpha(0.92);

    this.label = scene.add
      .text(state.x, state.y - 11, "", {
        fontFamily: FONT, fontSize: "6px", color: "#ffffff", resolution: 8,
        backgroundColor: "#00000088", padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels);
    this.setLevel(state.level);
    this.applyAnimation();
  }

  get displayName() {
    return this.name_;
  }

  setLevel(level: number) {
    this.label.setText(`${this.name_} · Nv ${level}`);
  }

  setState_(x: number, y: number, facing: Facing, moving: boolean) {
    this.target = { x, y };
    const changed = facing !== this.facing || moving !== this.moving;
    this.facing = facing;
    this.moving = moving;
    if (changed) this.applyAnimation();
  }

  private applyAnimation() {
    if (this.moving) this.anims.play(`player-walk-${this.facing}`, true);
    else {
      this.anims.stop();
      this.setFrame(idleFrame(this.facing));
    }
  }

  /** Interpolação: aproxima da posição alvo a cada quadro (dt em ms). */
  tick(dt: number) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    if (Math.hypot(dx, dy) > 48) {
      this.setPosition(this.target.x, this.target.y); // muito longe (ex.: reconectou): pula direto
    } else {
      const k = Math.min(1, dt / 100);
      this.setPosition(this.x + dx * k, this.y + dy * k);
    }
    this.setDepth(DEPTH.characters + this.y / 100);
    this.label.setPosition(this.x, this.y - 11);
  }

  destroy(fromScene?: boolean) {
    this.label.destroy();
    (this.getData("bubble") as Phaser.GameObjects.Text | undefined)?.destroy();
    super.destroy(fromScene);
  }
}
