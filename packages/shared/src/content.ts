import type { TaskType } from "./task.js";

/**
 * Mapas disponíveis. Cada um corresponde a apps/game/public/assets/maps/<chave>.json.
 * Para adicionar um mapa: crie o arquivo no Tiled e registre aqui.
 */
export const MAPS = {
  starter: { name: "Vila Inicial", width: 30, height: 20 },
} as const;
export type MapKey = keyof typeof MAPS;
export const MAP_KEYS = Object.keys(MAPS) as MapKey[];

/** Aparências de NPC (spritesheets em apps/game/public/assets). */
export const NPC_SPRITES = [
  { key: "npc", name: "Sábia (roxo)" },
  { key: "npc-mestre", name: "Mestre (verde)" },
  { key: "player", name: "Aventureiro (azul)" },
] as const;
export type NpcSprite = (typeof NPC_SPRITES)[number]["key"];
export const NPC_SPRITE_KEYS = NPC_SPRITES.map((s) => s.key) as NpcSprite[];

/** Limites usados no painel e no backend. */
export const LIMITS = {
  worldName: 60,
  worldDescription: 300,
  npcName: 40,
  npcGreeting: 300,
  prompt: 500,
  option: 120,
  minOptions: 2,
  maxOptions: 6,
  maxAcceptedAnswers: 10,
  minXp: 1,
  maxXp: 500,
} as const;

export interface WorldInput {
  name: string;
  description: string;
  mapKey: MapKey;
}

export interface NpcInput {
  name: string;
  greeting: string;
  sprite: NpcSprite;
  /** Posição em tiles. */
  x: number;
  y: number;
}

/** Dados de uma tarefa, como o professor envia (um formato por tipo). */
export type TaskInput =
  | { type: "MULTIPLE_CHOICE"; prompt: string; xpReward: number; options: string[]; answer: string }
  | { type: "TRUE_FALSE"; prompt: string; xpReward: number; answer: "true" | "false" }
  | { type: "FILL_BLANK"; prompt: string; xpReward: number; acceptedAnswers: string[] }
  | { type: "OPEN"; prompt: string; xpReward: number };

export interface AdminNpc extends NpcInput {
  id: string;
  worldId: string;
  taskCount: number;
}

export interface TaskStats {
  /** Total de respostas enviadas (certas e erradas). */
  attempts: number;
  /** Alunos que concluíram. */
  completed: number;
  /** Respostas abertas aguardando correção. */
  pendingReview: number;
}

/** Tarefa completa, COM a resposta (só para o professor). */
export interface AdminTask {
  id: string;
  npcId: string;
  type: TaskType;
  prompt: string;
  options: string[];
  /** MULTIPLE_CHOICE: a alternativa certa; TRUE_FALSE: "true"/"false"; demais: null. */
  answer: string | null;
  /** FILL_BLANK: respostas aceitas. */
  acceptedAnswers: string[];
  xpReward: number;
  order: number;
  stats: TaskStats;
}
