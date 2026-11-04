/**
 * Gera o mapa inicial (public/assets/maps/starter.json) no formato do Tiled.
 * Depois de gerado, o mapa pode ser aberto e editado no Tiled (https://www.mapeditor.org).
 *
 * ATENÇÃO: rodar este script de novo SOBRESCREVE o mapa. Se você já editou
 * o mapa no Tiled, não rode mais este script.
 *
 * Camadas:
 *   Chao     → grama, caminho e água
 *   Objetos  → árvores, casa, cerca, pedras (colidem)
 *   Topo     → copas das árvores (desenhadas por cima do jogador)
 *   Pontos   → camada de objetos com o ponto "spawn" do jogador
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/maps/starter.json");
const W = 30;
const H = 20;
const T = 16;

// Índices do tileset (ver generate-assets.mjs). gid = índice + 1.
const TILE = {
  grass: 0, grassTuft: 1, flowers: 2, path: 3, water: 4,
  treeTop: 5, treeBase: 6, bush: 7,
  roofL: 8, roofM: 9, roofR: 10, wall: 11, window: 12, door: 13,
  fence: 14, rock: 15,
};
const COLLIDING = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const layer = () => new Array(W * H).fill(0);
const ground = layer();
const objects = layer();
const top = layer();
const set = (l, x, y, tile) => {
  if (x >= 0 && y >= 0 && x < W && y < H) l[y * W + x] = tile + 1;
};

// Pseudoaleatório com semente para o mapa sair sempre igual.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// --- chão: grama com variações ---
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const r = rand();
    set(ground, x, y, r < 0.08 ? TILE.flowers : r < 0.2 ? TILE.grassTuft : TILE.grass);
  }

// --- caminhos ---
for (let x = 1; x < W - 1; x++) set(ground, x, 12, TILE.path); // horizontal
for (let y = 2; y < H - 1; y++) set(ground, 15, y, TILE.path); // vertical
for (let y = 6; y < 12; y++) set(ground, 21, y, TILE.path); // até a porta da casa
for (let x = 9; x < 15; x++) set(ground, x, 9, TILE.path); // até a NPC

// --- lago ---
for (let y = 14; y < 17; y++) for (let x = 4; x < 8; x++) set(ground, x, y, TILE.water);
set(ground, 8, 15, TILE.water);
set(ground, 5, 17, TILE.water);
set(ground, 6, 17, TILE.water);

// --- árvore: base na camada Objetos, copa na camada Topo (uma linha acima) ---
const tree = (x, y) => {
  set(objects, x, y, TILE.treeBase);
  set(top, x, y - 1, TILE.treeTop);
};

// Borda de floresta
for (let x = 0; x < W; x++) {
  tree(x, 1);
  tree(x, H - 1);
}
for (let y = 2; y < H - 1; y++) {
  tree(0, y);
  tree(W - 1, y);
}
// A copa da linha 0 já fica fora; a base da linha 0 é preenchida com arbustos.
for (let x = 0; x < W; x++) set(objects, x, 0, TILE.bush);

// Árvores espalhadas
for (const [x, y] of [[4, 4], [7, 3], [26, 8], [25, 15], [19, 16], [11, 16], [3, 9]]) tree(x, y);

// --- casa (x 19..23, y 3..5) ---
const roof = [TILE.roofL, TILE.roofM, TILE.roofM, TILE.roofM, TILE.roofR];
for (let i = 0; i < 5; i++) {
  set(objects, 19 + i, 3, roof[i]);
  set(objects, 19 + i, 4, roof[i]);
}
[TILE.window, TILE.wall, TILE.door, TILE.wall, TILE.window].forEach((t, i) => set(objects, 19 + i, 5, t));

// --- cerca em volta do lago (com abertura) ---
for (let x = 3; x < 10; x++) set(objects, x, 13, TILE.fence);

// --- pedras e arbustos ---
for (const [x, y] of [[12, 4], [24, 11], [9, 15], [27, 4]]) set(objects, x, y, TILE.rock);
for (const [x, y] of [[17, 7], [13, 14], [23, 15], [6, 7]]) set(objects, x, y, TILE.bush);

// Garante que o caminho nunca fique bloqueado.
for (let i = 0; i < W * H; i++) if (ground[i] === TILE.path + 1 && objects[i] !== 0) objects[i] = 0;

const tileLayer = (id, name, data) => ({
  id, name, type: "tilelayer", width: W, height: H, x: 0, y: 0,
  opacity: 1, visible: true, data,
});

const map = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.0",
  orientation: "orthogonal",
  renderorder: "right-down",
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  infinite: false,
  nextlayerid: 5,
  nextobjectid: 2,
  layers: [
    tileLayer(1, "Chao", ground),
    tileLayer(2, "Objetos", objects),
    tileLayer(3, "Topo", top),
    {
      id: 4, name: "Pontos", type: "objectgroup", x: 0, y: 0,
      opacity: 1, visible: true, draworder: "topdown",
      objects: [
        { id: 1, name: "spawn", type: "", point: true, x: 15 * T + 8, y: 12 * T + 8,
          width: 0, height: 0, rotation: 0, visible: true },
      ],
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: "tiles",
      image: "../tiles.png",
      imagewidth: 128,
      imageheight: 32,
      tilewidth: T,
      tileheight: T,
      tilecount: 16,
      columns: 8,
      margin: 0,
      spacing: 0,
      tiles: COLLIDING.map((id) => ({
        id,
        properties: [{ name: "collides", type: "bool", value: true }],
      })),
    },
  ],
};

writeFileSync(OUT, JSON.stringify(map));
console.log("✔ maps/starter.json");
