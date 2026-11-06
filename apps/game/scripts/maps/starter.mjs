// Vila Inicial: grama, caminhos, lago, casa e borda de floresta.
import { TILE, createMap } from "./lib.mjs";

export default function starter() {
  const W = 30;
  const H = 20;
  const m = createMap(W, H);
  const { ground, objects } = m;

  // Pseudoaleatório com semente 42 (o mesmo de sempre: o mapa não muda).
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // --- chão: grama com variações ---
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const r = rand();
      m.set(ground, x, y, r < 0.08 ? TILE.flowers : r < 0.2 ? TILE.grassTuft : TILE.grass);
    }

  // --- caminhos ---
  for (let x = 1; x < W - 1; x++) m.set(ground, x, 12, TILE.path);
  for (let y = 2; y < H - 1; y++) m.set(ground, 15, y, TILE.path);
  for (let y = 6; y < 12; y++) m.set(ground, 21, y, TILE.path); // até a porta da casa
  for (let x = 9; x < 15; x++) m.set(ground, x, 9, TILE.path); // até a NPC

  // --- lago ---
  m.fill(ground, 4, 14, 4, 3, TILE.water);
  m.set(ground, 8, 15, TILE.water);
  m.set(ground, 5, 17, TILE.water);
  m.set(ground, 6, 17, TILE.water);

  // --- borda de floresta ---
  for (let x = 0; x < W; x++) {
    m.tree(x, 1);
    m.tree(x, H - 1);
  }
  for (let y = 2; y < H - 1; y++) {
    m.tree(0, y);
    m.tree(W - 1, y);
  }
  for (let x = 0; x < W; x++) m.set(objects, x, 0, TILE.bush);

  // Árvores espalhadas
  for (const [x, y] of [[4, 4], [7, 3], [26, 8], [25, 15], [19, 16], [11, 16], [3, 9]]) m.tree(x, y);

  // --- casa (x 19..23, y 3..5) ---
  const roof = [TILE.roofL, TILE.roofM, TILE.roofM, TILE.roofM, TILE.roofR];
  for (let i = 0; i < 5; i++) {
    m.set(objects, 19 + i, 3, roof[i]);
    m.set(objects, 19 + i, 4, roof[i]);
  }
  [TILE.window, TILE.wall, TILE.door, TILE.wall, TILE.window].forEach((t, i) => m.set(objects, 19 + i, 5, t));

  // --- cerca do lago, pedras e arbustos ---
  for (let x = 3; x < 10; x++) m.set(objects, x, 13, TILE.fence);
  for (const [x, y] of [[12, 4], [24, 11], [9, 15], [27, 4]]) m.set(objects, x, y, TILE.rock);
  for (const [x, y] of [[17, 7], [13, 14], [23, 15], [6, 7]]) m.set(objects, x, y, TILE.bush);

  m.spawn = { x: 15, y: 12 };
  return m;
}
