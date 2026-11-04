export interface PublicWorld {
  id: string;
  name: string;
  description: string;
  /** Nome do mapa (arquivo Tiled) usado por este mundo. */
  mapKey: string;
}

export interface PublicNpc {
  id: string;
  worldId: string;
  name: string;
  /** Fala inicial do NPC ao interagir. */
  greeting: string;
  sprite: string;
  /** Posição no mapa, em tiles. */
  x: number;
  y: number;
}

/** Resposta de GET /api/worlds/:id — o mundo com seus NPCs. */
export interface WorldDetail extends PublicWorld {
  npcs: PublicNpc[];
}
