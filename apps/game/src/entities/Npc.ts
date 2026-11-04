import Phaser from "phaser";
import type { NpcProgress, NpcWithProgress } from "@school-class/shared";
import { DEPTH, FONT, TILE_SIZE } from "../config";
import { directionFrom, idleFrame } from "./animations";

/** Marcador sobre o NPC conforme o progresso do aluno. */
const MARKERS = {
  available: { text: "!", color: "#1b1f2a", bg: "#f6d55c" }, // tem desafio novo
  pending: { text: "…", color: "#ffffff", bg: "#5b8def" }, // aguardando o professor
  done: { text: "✓", color: "#ffffff", bg: "#3fa34d" }, // tudo concluído
} as const;

export class Npc extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly data_: NpcWithProgress;
  private label: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;
  private marker: Phaser.GameObjects.Text;
  private promptVisible = false;

  constructor(scene: Phaser.Scene, data: NpcWithProgress) {
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

    this.marker = scene.add
      .text(this.x, this.y - 20, "", { ...textStyle, fontSize: "8px", fontStyle: "bold", padding: { x: 3, y: 0 } })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.labels);

    // Balanço suave do aviso e do marcador.
    scene.tweens.add({
      targets: [this.prompt, this.marker],
      y: this.y - 22,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.setProgress(data.progress);
  }

  setProgress(progress: NpcProgress) {
    this.data_.progress = progress;
    const available = progress.total - progress.completed - progress.pendingReview;
    const m =
      progress.total === 0
        ? null
        : available > 0
          ? MARKERS.available
          : progress.pendingReview > 0
            ? MARKERS.pending
            : MARKERS.done;
    if (m) this.marker.setText(m.text).setColor(m.color).setBackgroundColor(m.bg);
    this.marker.setVisible(m !== null && !this.promptVisible);
  }

  setPromptVisible(visible: boolean) {
    if (visible === this.promptVisible) return;
    this.promptVisible = visible;
    this.prompt.setVisible(visible);
    this.setProgress(this.data_.progress); // o marcador some enquanto o aviso aparece
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
