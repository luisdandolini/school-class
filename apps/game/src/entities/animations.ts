import Phaser from "phaser";

/** Ordem das linhas na spritesheet dos personagens. */
export const DIRECTIONS = ["down", "left", "right", "up"] as const;
export type Direction = (typeof DIRECTIONS)[number];

const FRAMES_PER_ROW = 3;

/** Quadro "parado" de cada direção. */
export function idleFrame(dir: Direction): number {
  return DIRECTIONS.indexOf(dir) * FRAMES_PER_ROW;
}

/** Cria as animações de caminhada (ex.: "player-walk-left") para uma spritesheet. */
export function createCharacterAnims(scene: Phaser.Scene, key: string) {
  DIRECTIONS.forEach((dir, row) => {
    const base = row * FRAMES_PER_ROW;
    scene.anims.create({
      key: `${key}-walk-${dir}`,
      frames: scene.anims.generateFrameNumbers(key, { frames: [base + 1, base, base + 2, base] }),
      frameRate: 8,
      repeat: -1,
    });
  });
}

/** Direção dominante de um vetor (dx, dy). */
export function directionFrom(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}
