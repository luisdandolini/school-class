import Phaser from "phaser";
import type { PublicNpc } from "@school-class/shared";
import { DEPTH, FONT, TILE_SIZE } from "../config";
import { directionFrom, idleFrame } from "./animations";

export class Npc extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly data_: PublicNpc;
  private label: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, data: PublicNpc) {
    const key = scene.textures.exists(data.sprite) ? data.sprite : "npc";
    // Posição vem do banco em tiles; o sprite fica centralizado no tile.
    super(scene, data.x * TILE_SIZE + TILE_SIZE / 2, data.y * TILE_SIZE + TILE_SIZE / 2, key, idleFrame("down"));
    this.data_ = data;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 5).setOffset(3, 10).setImmovable(true);
    this.setDepth(DEPTH.characters + this.y / 100);

    const textStyle = { fontFamily: FONT, fontSize: "6px", color: "#ffffff", resolution: 8 };

    this.label = scene.add
      .text(this.x, this.y - 11, data.name, { ...textStyle, backgroundColor: "#00000088", padding: { x: 2, y: 1 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels);

    this.prompt = scene.add
      .text(this.x, this.y - 20, "Espaço", { ...textStyle, color: "#1b1f2a", backgroundColor: "#f6d55c", padding: { x: 2, y: 1 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels)
      .setVisible(false);

    // Balanço suave do aviso "Espaço".
    scene.tweens.add({ targets: this.prompt, y: this.y - 22, duration: 500, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  setPromptVisible(visible: boolean) {
    this.prompt.setVisible(visible);
  }

  /** Vira o NPC para olhar para um ponto (ex.: o jogador). */
  faceTowards(x: number, y: number) {
    this.setFrame(idleFrame(directionFrom(x - this.x, y - this.y)));
  }

  /** Volta a olhar para baixo. */
  resetFacing() {
    this.setFrame(idleFrame("down"));
  }
}
