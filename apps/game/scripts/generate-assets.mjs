/**
 * Gera a arte provisória do jogo (pixel art 16x16) em public/assets.
 *   - tiles.png  → tileset do mapa (8 colunas x 2 linhas)
 *   - player.png / npc.png → personagens (3 quadros x 4 direções)
 *   - avatar-base.png → camadas do personagem dos alunos (ver packages/shared/src/avatar.ts):
 *     uma faixa por penteado; colunas = base (contorno, calça, sapato) e máscaras brancas
 *     de cabelo, pele e roupa, que o jogo pinta com as cores escolhidas
 *
 * Uso: pnpm --filter @school-class/game assets
 * Pode ser substituída por qualquer arte própria com o mesmo layout.
 */
import { PNG } from "pngjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/assets");
const T = 16;

// ---------- utilitários ----------
function image(w, h) {
  const png = new PNG({ width: w, height: h });
  png.data.fill(0);
  return png;
}

function px(png, x, y, c) {
  if (!c || x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) * 4;
  png.data[i] = c[0];
  png.data[i + 1] = c[1];
  png.data[i + 2] = c[2];
  png.data[i + 3] = c[3] ?? 255;
}

function alphaAt(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return 0;
  return png.data[(png.width * y + x) * 4 + 3];
}

function rect(png, x, y, w, h, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(png, x + i, y + j, c);
}

/** Desenha um padrão de texto; cada caractere é uma cor da paleta ('.' = vazio). */
function pattern(png, ox, oy, rows, palette, mirror = false) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (c) px(png, ox + (mirror ? row.length - 1 - x : x), oy + y, c);
    });
  });
}

/** Contorno escuro em volta das partes opacas de um quadro (estilo pixel art). */
function outline(png, ox, oy, w, h, c) {
  const marks = [];
  for (let y = oy; y < oy + h; y++) {
    for (let x = ox; x < ox + w; x++) {
      if (alphaAt(png, x, y) > 0) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= ox && ny >= oy && nx < ox + w && ny < oy + h && alphaAt(png, nx, ny) > 0;
      });
      if (near) marks.push([x, y]);
    }
  }
  marks.forEach(([x, y]) => px(png, x, y, c));
}

/** Gerador pseudoaleatório com semente: a arte sai sempre igual. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function save(png, name) {
  writeFileSync(join(OUT, name), PNG.sync.write(png));
  console.log("✔", name);
}

// ---------- paleta ----------
const C = {
  outline: [34, 30, 44],
  grass: [106, 170, 72],
  grassDark: [88, 150, 60],
  grassLight: [132, 194, 90],
  path: [204, 172, 118],
  pathDark: [176, 142, 94],
  pathLight: [222, 194, 144],
  water: [66, 132, 204],
  waterDark: [50, 106, 176],
  waterLight: [140, 196, 236],
  trunk: [116, 76, 42],
  trunkDark: [84, 54, 30],
  leaf: [52, 128, 62],
  leafDark: [36, 98, 48],
  leafLight: [92, 168, 86],
  roof: [182, 68, 58],
  roofDark: [136, 46, 42],
  roofLight: [214, 102, 84],
  wall: [230, 212, 176],
  wallDark: [194, 170, 134],
  glass: [140, 196, 236],
  frame: [96, 64, 42],
  door: [136, 88, 50],
  doorDark: [98, 62, 34],
  gold: [236, 204, 84],
  rock: [146, 146, 158],
  rockDark: [104, 104, 118],
  rockLight: [188, 188, 198],
  red: [236, 84, 104],
  yellow: [250, 222, 92],
  white: [250, 250, 250],
};

// ---------- tileset ----------
// Índices (id no Tiled = índice; gid no mapa = índice + 1):
//  0 grama        1 grama c/ tufos  2 grama c/ flores  3 caminho
//  4 água*        5 copa (topo)     6 árvore (base)*   7 arbusto*
//  8 telhado esq* 9 telhado meio*  10 telhado dir*    11 parede*
// 12 janela*     13 porta*         14 cerca*          15 pedra*
// (* = colide)

function grass(png, ox, oy, seed) {
  const r = rng(seed);
  rect(png, ox, oy, T, T, C.grass);
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const v = r();
      if (v < 0.12) px(png, ox + x, oy + y, C.grassDark);
      else if (v < 0.17) px(png, ox + x, oy + y, C.grassLight);
    }
}

function tuft(png, x, y) {
  px(png, x, y, C.grassDark);
  px(png, x + 2, y, C.grassDark);
  px(png, x + 1, y + 1, C.grassDark);
  px(png, x, y - 1, C.grassLight);
  px(png, x + 2, y - 1, C.grassLight);
}

function flower(png, x, y, petal) {
  px(png, x, y - 1, petal);
  px(png, x - 1, y, petal);
  px(png, x + 1, y, petal);
  px(png, x, y + 1, petal);
  px(png, x, y, C.yellow);
}

function buildTileset() {
  const png = image(T * 8, T * 2);
  const at = (i) => [(i % 8) * T, Math.floor(i / 8) * T];

  // 0 grama
  grass(png, ...at(0), 1);

  // 1 grama com tufos
  {
    const [x, y] = at(1);
    grass(png, x, y, 2);
    tuft(png, x + 2, y + 4);
    tuft(png, x + 10, y + 7);
    tuft(png, x + 5, y + 12);
  }

  // 2 grama com flores
  {
    const [x, y] = at(2);
    grass(png, x, y, 3);
    flower(png, x + 3, y + 3, C.red);
    flower(png, x + 11, y + 5, C.white);
    flower(png, x + 6, y + 11, C.white);
    flower(png, x + 12, y + 12, C.red);
  }

  // 3 caminho de terra
  {
    const [x, y] = at(3);
    const r = rng(4);
    rect(png, x, y, T, T, C.path);
    for (let j = 0; j < T; j++)
      for (let i = 0; i < T; i++) {
        const v = r();
        if (v < 0.1) px(png, x + i, y + j, C.pathDark);
        else if (v < 0.16) px(png, x + i, y + j, C.pathLight);
      }
  }

  // 4 água
  {
    const [x, y] = at(4);
    rect(png, x, y, T, T, C.water);
    const r = rng(5);
    for (let j = 0; j < T; j++)
      for (let i = 0; i < T; i++) if (r() < 0.08) px(png, x + i, y + j, C.waterDark);
    for (const [wx, wy] of [[2, 3], [9, 6], [4, 10], [11, 13]]) {
      rect(png, x + wx, y + wy, 3, 1, C.waterLight);
      px(png, x + wx - 1, y + wy + 1, C.waterLight);
    }
  }

  // 5 copa da árvore (camada "Topo", passa por cima do jogador)
  // 6 base da árvore (camada "Objetos", colide)
  {
    const top = [
      "................",
      "................",
      "................",
      "......LLLL......",
      "....LLGGGGLL....",
      "...LGGGLLGGGL...",
      "..LGGGGGGGGGGL..",
      "..GGGLGGGGGLGG..",
      ".GGGGGGGGGGGGGG.",
      ".GGGGGGGGLGGGGG.",
      ".GGLGGGGGGGGGGG.",
      "GGGGGGGGGGGGLGGG",
      "GGGGGGLGGGGGGGGG",
      "GGGGGGGGGGGGGGGG",
      "GGGGGGGGGGGGGGGG",
      "GGGGGGGGGGGGGGGG",
    ];
    const bottom = [
      "GGGGGGGGGGGGGGGG",
      "GGGGDGGGGGGGDGGG",
      ".GGGGGGGGGGGGGG.",
      ".GDGGGGDGGGGGDG.",
      "..DGGGGGGGGGGD..",
      "...DDGGGGGGDD...",
      ".....DDDDDD.....",
      "......TtTT......",
      "......TtTT......",
      "......TtTT......",
      "......TtTT......",
      ".....TTtTTT.....",
      "................",
      "................",
      "................",
      "................",
    ];
    const pal = { G: C.leaf, L: C.leafLight, D: C.leafDark, T: C.trunk, t: C.trunkDark };
    const [tx, ty] = at(5);
    pattern(png, tx, ty, top, pal);
    outline(png, tx, ty, T, T, C.outline);
    const [bx, by] = at(6);
    pattern(png, bx, by, bottom, pal);
    outline(png, bx, by, T, T, C.outline);
  }

  // 7 arbusto
  {
    const [x, y] = at(7);
    grass(png, x, y, 7);
    const b = image(T, T);
    pattern(
      b,
      0,
      0,
      [
        "................",
        "................",
        "................",
        "................",
        ".....LLLLL......",
        "...LGGGGGGGL....",
        "..GGGLGGGGGGG...",
        ".GGGGGGGGLGGGG..",
        ".GGLGGGGGGGGGGG.",
        ".GGGGGGGGGGGLGG.",
        ".DGGGGGLGGGGGGD.",
        "..DGGGGGGGGGGD..",
        "...DDDDDDDDDD...",
        "................",
        "................",
        "................",
      ],
      { G: C.leaf, L: C.leafLight, D: C.leafDark },
    );
    outline(b, 0, 0, T, T, C.outline);
    blit(b, png, x, y);
  }

  // 8-10 telhado
  for (const [idx, edge] of [[8, "left"], [9, "mid"], [10, "right"]]) {
    const [x, y] = at(idx);
    rect(png, x, y, T, T, C.roof);
    for (let row = 3; row < T; row += 4) {
      rect(png, x, y + row, T, 1, C.roofDark);
      const off = (row / 4) % 2 ? 2 : 6;
      for (let col = off; col < T; col += 8) rect(png, x + col, y + row - 3, 1, 3, C.roofDark);
    }
    rect(png, x, y, T, 1, C.roofLight);
    if (edge === "left") rect(png, x, y, 1, T, C.outline);
    if (edge === "right") rect(png, x + T - 1, y, 1, T, C.outline);
  }

  // 11 parede, 12 janela, 13 porta
  for (const idx of [11, 12, 13]) {
    const [x, y] = at(idx);
    rect(png, x, y, T, T, C.wall);
    for (let row = 3; row < T; row += 4) rect(png, x, y + row, T, 1, C.wallDark);
    rect(png, x, y + T - 1, T, 1, C.outline);
  }
  {
    const [x, y] = at(12);
    rect(png, x + 3, y + 3, 10, 9, C.frame);
    rect(png, x + 4, y + 4, 8, 7, C.glass);
    rect(png, x + 7, y + 4, 2, 7, C.frame);
    rect(png, x + 4, y + 7, 8, 1, C.frame);
    px(png, x + 5, y + 5, C.white);
  }
  {
    const [x, y] = at(13);
    rect(png, x + 3, y + 2, 10, 14, C.doorDark);
    rect(png, x + 4, y + 3, 8, 13, C.door);
    rect(png, x + 7, y + 3, 1, 13, C.doorDark);
    px(png, x + 10, y + 9, C.gold);
  }

  // 14 cerca
  {
    const [x, y] = at(14);
    const f = image(T, T);
    const wood = [176, 124, 72];
    const woodDark = [128, 86, 48];
    rect(f, 0, 5, T, 2, wood);
    rect(f, 0, 10, T, 2, wood);
    rect(f, 0, 7, T, 1, woodDark);
    rect(f, 0, 12, T, 1, woodDark);
    for (const pxl of [2, 11]) {
      rect(f, pxl, 2, 3, 12, wood);
      rect(f, pxl + 2, 3, 1, 11, woodDark);
    }
    outline(f, 0, 0, T, T, C.outline);
    grass(png, x, y, 14);
    blit(f, png, x, y);
  }

  // 15 pedra
  {
    const [x, y] = at(15);
    grass(png, x, y, 15);
    const s = image(T, T);
    pattern(
      s,
      0,
      0,
      [
        "................",
        "................",
        "................",
        "................",
        "................",
        "......RRRR......",
        "....RRLLRRRR....",
        "...RLLRRRRRRR...",
        "...RLRRRRRRDR...",
        "..RRRRRRRRRDDR..",
        "..RRRRRRRRDDDR..",
        "...DDRRRRDDDD...",
        "....DDDDDDDD....",
        "................",
        "................",
        "................",
      ],
      { R: C.rock, L: C.rockLight, D: C.rockDark },
    );
    outline(s, 0, 0, T, T, C.outline);
    blit(s, png, x, y);
  }

  save(png, "tiles.png");
}

/** Copia uma imagem por cima de outra respeitando transparência. */
function blit(src, dst, ox, oy) {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const i = (src.width * y + x) * 4;
      if (src.data[i + 3] > 0) px(dst, ox + x, oy + y, [...src.data.subarray(i, i + 4)]);
    }
}

// ---------- personagens ----------
// Layout: linhas = direção (0 baixo, 1 esquerda, 2 direita, 3 cima)
//         colunas = quadro (0 parado, 1 passo A, 2 passo B)
const HEAD = {
  down: [
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "....HSSSSSSH....",
    "....SSESSESS....",
    ".....SSSSSS.....",
  ],
  up: [
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    ".....SSSSSS.....",
  ],
  left: [
    "................",
    "................",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "....SSSSSHHH....",
    "....SESSSSHH....",
    ".....SSSSSS.....",
  ],
};

const BODY_FRONT = [
  "....BBBBBBBB....",
  "...SBBBBBBBBS...",
  "...SBBBBBBBBS...",
  "....BBBBBBBB....",
];
const BODY_SIDE = [
  "....BBBBBBBB....",
  "....BBBBBBBB....",
  "....BBBSSBBB....",
  "....BBBBBBBB....",
];

const LEGS = [
  // parado
  ["....PPPPPPPP....", "....PPP..PPP....", "....KKK..KKK....", "................"],
  // passo A: perna esquerda levantada
  ["....PPPPPPPP....", "....KKK..PPP....", ".........KKK....", "................"],
  // passo B: perna direita levantada
  ["....PPPPPPPP....", "....PPP..KKK....", "....KKK.........", "................"],
];

/** Desenha os 12 quadros (3 x 4 direções) de um personagem a partir de (0, oy0). */
function drawCharacter(png, oy0, pal, head = HEAD, overlay = {}) {
  const dirs = [
    { head: head.down, body: BODY_FRONT, over: overlay.down, mirror: false },
    { head: head.left, body: BODY_SIDE, over: overlay.left, mirror: false },
    { head: head.left, body: BODY_SIDE, over: overlay.left, mirror: true }, // direita = esquerda espelhada
    { head: head.up, body: BODY_FRONT, over: overlay.up, mirror: false },
  ];
  dirs.forEach((d, row) => {
    LEGS.forEach((legs, col) => {
      const ox = col * T;
      const oy = oy0 + row * T;
      pattern(png, ox, oy, [...d.head, ...d.body], pal, d.mirror);
      pattern(png, ox, oy + 12, legs, pal, d.mirror);
      // Cabelo comprido cai por cima dos ombros.
      if (d.over) pattern(png, ox, oy + 8, d.over, pal, d.mirror);
      outline(png, ox, oy, T, T, C.outline);
    });
  });
}

function buildCharacter(name, colors) {
  const png = image(T * 3, T * 4);
  drawCharacter(png, 0, {
    H: colors.hair,
    S: colors.skin,
    E: C.outline,
    B: colors.shirt,
    P: colors.pants,
    K: colors.shoes,
  });
  save(png, `${name}.png`);
}

// ---------- avatar dos alunos ----------
// Penteados, na mesma ordem de HAIR_STYLES (packages/shared/src/avatar.ts).
const HAIR_STYLES = [
  // 0 curto
  { head: HEAD },
  // 1 comprido
  {
    head: {
      down: [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "...HHHHHHHHHH...",
        "...HHSSSSSSHH...",
        "...HSSESSESSH...",
        "...HHSSSSSSHH...",
      ],
      up: [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "...HHHHHHHHHH...",
        "...HHHHHHHHHH...",
        "...HHHHHHHHHH...",
        "...HHHHHHHHHH...",
      ],
      left: [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HHHHHHHHH...",
        "....SSSSSHHHH...",
        "....SESSSSHHH...",
        ".....SSSSSHHH...",
      ],
    },
    overlay: {
      down: ["...H........H...", "...H........H..."],
      up: ["....HHHHHHHH....", "....HHHHHHHH...."],
      left: ["..........HHH...", "..........HH...."],
    },
  },
  // 2 volumoso
  {
    head: {
      down: [
        "................",
        "....HHHHHHHH....",
        "..HHHHHHHHHHHH..",
        "..HHHHHHHHHHHH..",
        "..HHHHHHHHHHHH..",
        "..HHSSSSSSSSHH..",
        "...HSSESSESSH...",
        ".....SSSSSS.....",
      ],
      up: [
        "................",
        "....HHHHHHHH....",
        "..HHHHHHHHHHHH..",
        "..HHHHHHHHHHHH..",
        "..HHHHHHHHHHHH..",
        "..HHHHHHHHHHHH..",
        "...HHHHHHHHHH...",
        ".....SSSSSS.....",
      ],
      left: [
        "................",
        "....HHHHHHHH....",
        "..HHHHHHHHHHHH..",
        "..HHHHHHHHHHHH..",
        "...HHHHHHHHHHH..",
        "....SSSSSHHHHH..",
        "....SESSSSHHH...",
        ".....SSSSSS.....",
      ],
    },
  },
  // 3 raspado
  {
    head: {
      down: [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....SSSSSSSS....",
        "....SSSSSSSS....",
        "....SSESSESS....",
        ".....SSSSSS.....",
      ],
      up: [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HHHHHHHH....",
        "....SSSSSSSS....",
        "....SSSSSSSS....",
        ".....SSSSSS.....",
      ],
      left: [
        "................",
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....SSSSSSHH....",
        "....SSSSSSSS....",
        "....SESSSSSS....",
        ".....SSSSSS.....",
      ],
    },
  },
];

/** Cores provisórias que marcam cada parte antes de separar as camadas. */
const KEY = { hair: [255, 0, 0], skin: [0, 255, 0], shirt: [0, 0, 255] };
/** Ordem das colunas de camadas (igual a AVATAR_LAYERS no pacote shared). */
const LAYERS = ["base", "hair", "skin", "shirt"];

function buildAvatarBase() {
  const W = T * 3;
  const H = T * 4;
  const keyed = image(W, H * HAIR_STYLES.length);
  const pal = { H: KEY.hair, S: KEY.skin, E: C.outline, B: KEY.shirt, P: [52, 54, 76], K: [92, 62, 40] };
  HAIR_STYLES.forEach((style, i) => drawCharacter(keyed, i * H, pal, style.head, style.overlay));

  // Separa as partes: cada cor provisória vira uma máscara branca na sua coluna.
  const png = image(W * LAYERS.length, H * HAIR_STYLES.length);
  for (let y = 0; y < keyed.height; y++)
    for (let x = 0; x < W; x++) {
      const i = (keyed.width * y + x) * 4;
      if (keyed.data[i + 3] === 0) continue;
      const c = [...keyed.data.subarray(i, i + 4)];
      const part = Object.entries(KEY).find(([, k]) => k[0] === c[0] && k[1] === c[1] && k[2] === c[2])?.[0];
      if (part) px(png, LAYERS.indexOf(part) * W + x, y, [255, 255, 255, 255]);
      else px(png, x, y, c);
    }
  save(png, "avatar-base.png");
}

buildTileset();
buildAvatarBase();
buildCharacter("player", {
  hair: [86, 54, 34],
  skin: [240, 200, 160],
  shirt: [62, 112, 206],
  pants: [52, 54, 76],
  shoes: [92, 62, 40],
});
buildCharacter("npc", {
  hair: [226, 226, 236],
  skin: [226, 186, 146],
  shirt: [134, 72, 176],
  pants: [112, 56, 152],
  shoes: [72, 40, 92],
});
buildCharacter("npc-mestre", {
  hair: [40, 36, 44],
  skin: [196, 140, 100],
  shirt: [56, 142, 92],
  pants: [70, 58, 46],
  shoes: [48, 36, 28],
});
