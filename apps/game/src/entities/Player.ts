import Phaser from "phaser";
import { DEPTH, PLAYER_SPEED } from "../config";
import { type Direction, idleFrame } from "./animations";

type Keys = Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  facing: Direction = "down";
  /** Enquanto true, o jogador não anda (ex.: durante um diálogo). */
  frozen = false;
  private keys: Keys;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player", idleFrame("down"));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Colisão só nos pés: dá a sensação de profundidade (a cabeça "passa" por cima das coisas).
    this.body.setSize(10, 5).setOffset(3, 10);
    this.setCollideWorldBounds(true);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard!.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D,
    }) as Keys;
  }

  update() {
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (!this.frozen) {
      if (k.left.isDown || k.a.isDown) vx -= 1;
      if (k.right.isDown || k.d.isDown) vx += 1;
      if (k.up.isDown || k.w.isDown) vy -= 1;
      if (k.down.isDown || k.s.isDown) vy += 1;
    }

    // Normaliza para não andar mais rápido na diagonal.
    const len = Math.hypot(vx, vy) || 1;
    this.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);

    if (vx !== 0 || vy !== 0) {
      this.facing = vx !== 0 ? (vx < 0 ? "left" : "right") : vy < 0 ? "up" : "down";
      this.anims.play(`player-walk-${this.facing}`, true);
    } else {
      this.anims.stop();
      this.setFrame(idleFrame(this.facing));
    }

    this.setDepth(DEPTH.characters + this.y / 100);
  }
}
