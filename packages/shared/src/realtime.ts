/** Protocolo do tempo real (WebSocket em /api/realtime?worldId=...). */
import type { EarnedAchievement } from "./achievements.js";
import type { Avatar } from "./avatar.js";

export type Facing = "down" | "left" | "right" | "up";

/** Emotes e frases prontas (sem chat livre, por segurança dos alunos). */
export const EMOTES = [
  { id: "oi", text: "👋 Oi!" },
  { id: "vamos", text: "🤝 Vamos juntos?" },
  { id: "parabens", text: "🎉 Parabéns!" },
  { id: "ajuda", text: "🙋 Preciso de ajuda!" },
  { id: "legal", text: "😄 Que legal!" },
  { id: "pensando", text: "🤔 Hmm..." },
] as const;
export type EmoteId = (typeof EMOTES)[number]["id"];
export const EMOTE_IDS = EMOTES.map((e) => e.id) as EmoteId[];

/** Outro jogador no mesmo mundo. Posição em pixels do mundo. */
export interface RemotePlayerState {
  id: string;
  name: string;
  level: number;
  avatar: Avatar;
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
}

// ---------- jogo → servidor ----------
export type ClientMessage =
  | { t: "move"; x: number; y: number; facing: Facing; moving: boolean }
  | { t: "emote"; emote: EmoteId };

// ---------- servidor → jogo ----------
export type ServerMessage =
  | { t: "welcome"; selfId: string; players: RemotePlayerState[] }
  | { t: "join"; player: RemotePlayerState }
  | { t: "leave"; id: string }
  | { t: "move"; id: string; x: number; y: number; facing: Facing; moving: boolean }
  | { t: "emote"; id: string; emote: EmoteId }
  | { t: "levelup"; id: string; name: string; level: number }
  /** Alguém (o próprio jogador ou um colega) ganhou uma conquista. */
  | { t: "achievement"; id: string; name: string; achievement: EarnedAchievement }
  /** Um colega trocou o visual. */
  | { t: "avatar"; id: string; avatar: Avatar }
  /** Esta conexão foi substituída (o mesmo aluno abriu o jogo em outra aba). */
  | { t: "replaced" };

/** Códigos de fechamento do WebSocket usados pelo servidor. */
export const WS_CLOSE = {
  unauthorized: 4401,
  forbidden: 4403,
  replaced: 4409,
} as const;

/** Quem está online num mundo (painel do professor). */
export interface OnlinePlayer {
  userId: string;
  name: string;
  since: string;
}
