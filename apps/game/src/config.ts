/** Constantes do jogo, num lugar só. */
export const TILE_SIZE = 16;
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
/** Zoom da câmera do mundo: 4x → a tela mostra 20 x 11 tiles. */
export const WORLD_ZOOM = 4;
export const PLAYER_SPEED = 80;
/** Distância (em pixels do mundo) para poder conversar com um NPC. */
export const INTERACT_DISTANCE = 22;

export const FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Profundidade (ordem de desenho) das camadas. */
export const DEPTH = {
  ground: 0,
  objects: 1,
  /** Personagens: 10 + y/100, para quem está mais abaixo ficar na frente. */
  characters: 10,
  top: 100,
  labels: 200,
} as const;
