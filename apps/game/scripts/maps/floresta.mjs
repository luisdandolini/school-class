// Floresta: pinheiros, trilha, rio com passagem e duas clareiras.
import { TILE, createMap, seeded } from "./lib.mjs";

export default function floresta() {
  const W = 30;
  const H = 20;
  const m = createMap(W, H);
  const { ground, objects } = m;
  const rand = seeded(7);

  m.fill(ground, 0, 0, W, H, TILE.forestGrass);

  // --- clareiras (grama clara com flores) ---
  const clearing = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) m.set(ground, x, y, rand() < 0.15 ? TILE.flowers : rand() < 0.3 ? TILE.grassTuft : TILE.grass);
  };
  clearing(3, 4, 6, 5);
  clearing(22, 13, 6, 5);

  // --- rio (com uma passagem de terra) ---
  m.fill(ground, 18, 0, 2, H, TILE.water);
  m.fill(ground, 25, 15, 2, 2, TILE.water); // laguinho na clareira

  // --- trilha ---
  const path = (x0, y0, x1, y1) => m.fill(ground, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1, TILE.path);
  path(3, 16, 10, 16);
  path(10, 6, 10, 16);
  path(8, 6, 10, 6); // até a clareira da esquerda
  path(10, 10, 26, 10); // atravessa o rio
  path(24, 4, 24, 10);
  path(24, 10, 24, 13); // até a clareira da direita

  // --- borda de floresta fechada ---
  for (let x = 0; x < W; x++) {
    m.set(objects, x, 0, TILE.pineBase);
    m.tree(x, 1, TILE.pineBase, TILE.pineTop);
    m.tree(x, H - 1, TILE.pineBase, TILE.pineTop);
  }
  for (let y = 2; y < H - 1; y++) {
    m.tree(0, y, TILE.pineBase, TILE.pineTop);
    m.tree(W - 1, y, TILE.pineBase, TILE.pineTop);
  }

  // --- árvores espalhadas (só na grama escura, longe da trilha) ---
  const nearPath = (x, y) =>
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => m.get(ground, x + dx, y + dy) === TILE.path);
  for (let y = 3; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      if (m.get(ground, x, y) !== TILE.forestGrass || nearPath(x, y)) continue;
      const r = rand();
      if (r < 0.16) m.tree(x, y, TILE.pineBase, TILE.pineTop);
      else if (r < 0.2) m.tree(x, y);
    }

  m.spawn = { x: 4, y: 16 };
  return m;
}
