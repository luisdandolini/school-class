// Escola: sala de aula (com lousa e carteiras), biblioteca e corredor.
import { TILE, createMap } from "./lib.mjs";

export default function escola() {
  const W = 30;
  const H = 20;
  const m = createMap(W, H);
  const { ground, objects } = m;

  m.fill(ground, 0, 0, W, H, TILE.wood);

  // --- paredes externas ---
  m.fill(objects, 0, 0, W, 2, TILE.schoolWall);
  m.fill(objects, 0, 0, 1, H, TILE.schoolWall);
  m.fill(objects, W - 1, 0, 1, H, TILE.schoolWall);
  m.fill(objects, 0, H - 1, W, 1, TILE.schoolWall);

  // --- parede entre as salas e o corredor (com duas portas) ---
  m.fill(objects, 1, 12, W - 2, 1, TILE.schoolWall);
  m.fill(objects, 15, 2, 1, 10, TILE.schoolWall);
  for (const x of [7, 8, 21, 22]) {
    m.set(objects, x, 12, null);
    m.set(ground, x, 12, TILE.floorTile);
  }

  // --- corredor ---
  m.fill(ground, 1, 13, W - 2, 6, TILE.floorTile);
  for (const [x, y] of [[1, 13], [28, 13], [1, 17], [28, 17], [11, 13], [18, 13]]) m.set(objects, x, y, TILE.plant);

  // --- sala de aula (esquerda) ---
  for (let x = 5; x <= 10; x++) m.set(objects, x, 1, TILE.board);
  for (const x of [3, 5, 10, 12])
    for (const y of [5, 7, 9]) m.set(objects, x, y, TILE.desk);
  m.set(objects, 13, 2, TILE.plant);
  m.set(objects, 1, 2, TILE.shelf);
  m.set(objects, 2, 2, TILE.shelf);

  // --- biblioteca (direita) ---
  m.fill(ground, 21, 3, 2, 9, TILE.rug);
  for (let x = 16; x <= 28; x++) if (x < 21 || x > 22) m.set(objects, x, 2, TILE.shelf);
  for (const y of [5, 8]) {
    m.fill(objects, 17, y, 3, 1, TILE.shelf);
    m.fill(objects, 24, y, 3, 1, TILE.shelf);
  }
  m.set(objects, 16, 11, TILE.plant);
  m.set(objects, 28, 11, TILE.plant);

  m.spawn = { x: 15, y: 16 };
  return m;
}
