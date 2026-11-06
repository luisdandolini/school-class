import {
  EMOTE_IDS,
  type Avatar,
  WS_CLOSE,
  type EmoteId,
  type Facing,
  type OnlinePlayer,
  type RemotePlayerState,
  type ServerMessage,
} from "@school-class/shared";

/** Uma conexão de jogador (abstrai o WebSocket, para poder testar sem rede). */
export interface Connection {
  send(msg: ServerMessage): void;
  close(code: number, reason: string): void;
}

interface Member {
  conn: Connection;
  state: RemotePlayerState;
  /** Só aparece para os outros depois de enviar a primeira posição. */
  ready: boolean;
  joinedAt: Date;
  lastMoveAt: number;
  lastEmoteAt: number;
  bounds: { width: number; height: number };
}

/** Intervalo mínimo entre atualizações de posição aceitas (ms) — ~20 por segundo. */
export const MOVE_INTERVAL_MS = 50;
/** Intervalo mínimo entre emotes de um mesmo jogador (ms). */
export const EMOTE_COOLDOWN_MS = 1500;

const FACINGS: Facing[] = ["down", "left", "right", "up"];

/**
 * Salas do tempo real: uma por mundo. Guarda quem está em cada mundo e
 * repassa movimentos, emotes e subidas de nível para os outros jogadores.
 */
export class Hub {
  private rooms = new Map<string, Map<string, Member>>();

  private room(worldId: string) {
    let r = this.rooms.get(worldId);
    if (!r) this.rooms.set(worldId, (r = new Map()));
    return r;
  }

  private broadcast(worldId: string, msg: ServerMessage, exceptUserId?: string) {
    for (const [userId, m] of this.rooms.get(worldId) ?? []) {
      if (userId !== exceptUserId && m.ready) m.conn.send(msg);
    }
  }

  join(
    worldId: string,
    user: { id: string; name: string; level: number; avatar: Avatar },
    conn: Connection,
    bounds: { width: number; height: number },
  ) {
    const room = this.room(worldId);

    // Mesmo aluno em outra aba: a conexão antiga sai.
    const old = room.get(user.id);
    if (old) {
      old.conn.send({ t: "replaced" });
      old.conn.close(WS_CLOSE.replaced, "Conectado em outra aba");
      room.delete(user.id);
      if (old.ready) this.broadcast(worldId, { t: "leave", id: user.id });
    }

    room.set(user.id, {
      conn,
      state: { id: user.id, name: user.name, level: user.level, avatar: user.avatar, x: 0, y: 0, facing: "down", moving: false },
      ready: false,
      joinedAt: new Date(),
      lastMoveAt: 0,
      lastEmoteAt: 0,
      bounds,
    });

    const others = [...room.values()].filter((m) => m.ready && m.state.id !== user.id).map((m) => ({ ...m.state }));
    conn.send({ t: "welcome", selfId: user.id, players: others });
  }

  /** Remove o jogador — só se a conexão for a atual (não a substituída). */
  leave(worldId: string, userId: string, conn: Connection) {
    const room = this.rooms.get(worldId);
    const m = room?.get(userId);
    if (!room || !m || m.conn !== conn) return;
    room.delete(userId);
    if (m.ready) this.broadcast(worldId, { t: "leave", id: userId });
    if (room.size === 0) this.rooms.delete(worldId);
  }

  move(worldId: string, userId: string, x: number, y: number, facing: Facing, moving: boolean, now = Date.now()) {
    const m = this.rooms.get(worldId)?.get(userId);
    if (!m) return;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !FACINGS.includes(facing)) return;
    if (now - m.lastMoveAt < MOVE_INTERVAL_MS && m.ready) return; // rápido demais: ignora
    m.lastMoveAt = now;

    // Mantém dentro do mapa.
    const s = m.state;
    s.x = Math.round(Math.min(Math.max(x, 0), m.bounds.width));
    s.y = Math.round(Math.min(Math.max(y, 0), m.bounds.height));
    s.facing = facing;
    s.moving = Boolean(moving);

    if (!m.ready) {
      m.ready = true;
      this.broadcast(worldId, { t: "join", player: { ...s } }, userId);
    } else {
      this.broadcast(worldId, { t: "move", id: userId, x: s.x, y: s.y, facing, moving: s.moving }, userId);
    }
  }

  emote(worldId: string, userId: string, emote: EmoteId, now = Date.now()) {
    const m = this.rooms.get(worldId)?.get(userId);
    if (!m || !m.ready || !EMOTE_IDS.includes(emote)) return;
    if (now - m.lastEmoteAt < EMOTE_COOLDOWN_MS) return;
    m.lastEmoteAt = now;
    this.broadcast(worldId, { t: "emote", id: userId, emote }, userId);
  }

  /** Avisa todos os mundos onde o aluno está que ele subiu de nível. */
  levelUp(userId: string, level: number) {
    for (const [worldId, room] of this.rooms) {
      const m = room.get(userId);
      if (!m) continue;
      m.state.level = level;
      this.broadcast(worldId, { t: "levelup", id: userId, name: m.state.name, level }, userId);
    }
  }

  /** Avisa os mundos onde o jogador está que ele trocou o visual. */
  avatarChanged(userId: string, avatar: Avatar) {
    for (const [worldId, room] of this.rooms) {
      const m = room.get(userId);
      if (!m) continue;
      m.state.avatar = { ...avatar };
      this.broadcast(worldId, { t: "avatar", id: userId, avatar: { ...avatar } }, userId);
    }
  }

  online(worldId: string): OnlinePlayer[] {
    return [...(this.rooms.get(worldId)?.values() ?? [])]
      .map((m) => ({ userId: m.state.id, name: m.state.name, since: m.joinedAt.toISOString() }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  onlineCount(worldId: string) {
    return this.rooms.get(worldId)?.size ?? 0;
  }
}

/** Instância única usada pelo servidor. */
export const hub = new Hub();
