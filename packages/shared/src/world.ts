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

/** Progresso do aluno nas tarefas de um NPC (para os marcadores "!" e "✓"). */
export interface NpcProgress {
  total: number;
  completed: number;
  pendingReview: number;
}

export interface NpcWithProgress extends PublicNpc {
  progress: NpcProgress;
}

/** Resposta de GET /api/worlds/:id — o mundo com seus NPCs e o progresso do aluno. */
export interface WorldDetail extends PublicWorld {
  npcs: NpcWithProgress[];
}
