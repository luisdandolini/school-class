/**
 * Ferramentas para gerar mapas no formato do Tiled (https://www.mapeditor.org).
 *
 * Todo mapa tem as camadas:
 *   Chao     → piso (grama, areia, madeira, água...)
 *   Objetos  → coisas que colidem (árvores, paredes, móveis)
 *   Topo     → desenhado por cima do jogador (copas das árvores)
 *   Pontos   → camada de objetos com o ponto "spawn" (onde os alunos aparecem)
 */
export const T = 16;

// Índices do tileset (ver generate-assets.mjs). gid = índice + 1.
export const TILE = {
  grass: 0, grassTuft: 1, flowers: 2, path: 3, water: 4,
  treeTop: 5, treeBase: 6, bush: 7,
  roofL: 8, roofM: 9, roofR: 10, wall: 11, window: 12, door: 13,
  fence: 14, rock: 15,
  wood: 16, rug: 17, schoolWall: 18, board: 19, desk: 20, shelf: 21, plant: 22, floorTile: 23,
  sand: 24, shells: 25, sea: 26, palmBase: 27, palmTop: 28,
  forestGrass: 29, pineBase: 30, pineTop: 31,
};
/** Tiles que bloqueiam a passagem. */
export const COLLIDING = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 26, 27, 30];
/** Tiles de piso por onde sempre dá para andar (nada é colocado em cima deles por engano). */
const WALKWAYS = [TILE.path, TILE.rug, TILE.floorTile];

/** Pseudoaleatório com semente: o mapa sai sempre igual. */
export function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

export function createMap(width, height) {
  const layer = () => new Array(width * height).fill(0);
  const m = {
    width,
    height,
    ground: layer(),
    objects: layer(),
    top: layer(),
    spawn: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    set(l, x, y, tile) {
      if (x >= 0 && y >= 0 && x < width && y < height) l[y * width + x] = tile === null ? 0 : tile + 1;
    },
    get(l, x, y) {
      return l[y * width + x] - 1;
    },
    fill(l, x0, y0, w, h, tile) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) m.set(l, x, y, tile);
    },
    /** Piso com variações (ex.: grama, tufos e flores). */
    floor(variants, rand) {
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const r = rand();
          const v = variants.find(([p]) => r < p) ?? variants[variants.length - 1];
          m.set(m.ground, x, y, v[1]);
        }
    },
    /** Árvore de dois tiles: base em Objetos, copa em Topo (uma linha acima). */
    tree(x, y, base = TILE.treeBase, crown = TILE.treeTop) {
      m.set(m.objects, x, y, base);
      m.set(m.top, x, y - 1, crown);
    },
  };
  return m;
}

/** Monta o JSON do Tiled. Antes, tira obstáculos de cima dos caminhos e do ponto de partida. */
export function toTiled(m) {
  const { width: W, height: H } = m;
  for (let i = 0; i < W * H; i++) if (WALKWAYS.includes(m.ground[i] - 1)) m.objects[i] = 0;
  m.objects[m.spawn.y * W + m.spawn.x] = 0;

  const tileLayer = (id, name, data) => ({
    id, name, type: "tilelayer", width: W, height: H, x: 0, y: 0,
    opacity: 1, visible: true, data,
  });
  return {
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
      tileLayer(1, "Chao", m.ground),
      tileLayer(2, "Objetos", m.objects),
      tileLayer(3, "Topo", m.top),
      {
        id: 4, name: "Pontos", type: "objectgroup", x: 0, y: 0,
        opacity: 1, visible: true, draworder: "topdown",
        objects: [
          { id: 1, name: "spawn", type: "", point: true, x: m.spawn.x * T + 8, y: m.spawn.y * T + 8,
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
        imageheight: 64,
        tilewidth: T,
        tileheight: T,
        tilecount: 32,
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
}
