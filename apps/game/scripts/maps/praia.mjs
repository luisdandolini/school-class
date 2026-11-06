// Praia: casinha na grama, areia com coqueiros e conchas, mar e um píer.
import { TILE, createMap, seeded } from "./lib.mjs";

export default function praia() {
  const W = 30;
  const H = 20;
  const m = createMap(W, H);
  const { ground, objects } = m;
  const rand = seeded(11);

  // --- grama no alto, areia no meio, mar embaixo e à direita ---
  m.floor([[0.08, TILE.shells], [1, TILE.sand]], rand);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < W; x++) m.set(ground, x, y, rand() < 0.08 ? TILE.flowers : rand() < 0.2 ? TILE.grassTuft : TILE.grass);
  for (let x = 0; x < W; x++) {
    // linha da água ondulada
    const shore = 14 + (x % 7 === 3 ? -1 : 0) + (x % 5 === 0 ? 1 : 0);
    m.fill(ground, x, shore, 1, H - shore, TILE.sea);
  }
  m.fill(ground, 27, 8, 3, 7, TILE.sea);
  m.set(ground, 26, 10, TILE.sea);
  m.set(ground, 26, 11, TILE.sea);

  // --- píer de madeira entrando no mar ---
  m.fill(ground, 14, 13, 2, 6, TILE.wood);

  // --- borda: arbustos e árvores em cima, coqueiros na esquerda ---
  for (let x = 0; x < W; x++) {
    m.set(objects, x, 0, TILE.bush);
    m.tree(x, 1);
  }
  for (let y = 2; y < 6; y++) {
    m.tree(0, y);
    m.tree(W - 1, y);
  }
  // a areia termina no mar dos dois lados
  m.fill(ground, 0, 6, 1, H - 6, TILE.sea);
  m.fill(ground, W - 1, 6, 1, H - 6, TILE.sea);

  // --- casinha de praia com caminho até a areia ---
  const roof = [TILE.roofL, TILE.roofM, TILE.roofM, TILE.roofR];
  roof.forEach((t, i) => m.set(objects, 4 + i, 2, t));
  [TILE.window, TILE.door, TILE.wall, TILE.window].forEach((t, i) => m.set(objects, 4 + i, 3, t));
  m.fill(ground, 5, 4, 1, 2, TILE.path);
  for (const [x, y] of [[12, 3], [17, 4], [22, 3], [26, 4]]) m.tree(x, y);
  for (const [x, y] of [[9, 4], [20, 2]]) m.set(objects, x, y, TILE.bush);

  // --- coqueiros na areia ---
  for (const [x, y] of [[4, 8], [9, 7], [13, 10], [20, 8], [24, 12], [7, 12], [18, 12], [23, 7]]) {
    m.tree(x, y, TILE.palmBase, TILE.palmTop);
  }

  m.spawn = { x: 12, y: 9 };
  return m;
}
