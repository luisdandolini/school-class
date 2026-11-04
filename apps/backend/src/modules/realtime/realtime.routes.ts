import type { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { EMOTE_IDS, MAPS, WS_CLOSE, levelFromXp, type EmoteId, type MapKey, type ServerMessage } from "@school-class/shared";
import type { WebSocket } from "ws";
import { z } from "zod";
import { prisma } from "../../db.js";
import { accessibleWorlds } from "../worlds/access.js";
import { hub, type Connection } from "./hub.js";

const TILE = 16;
const HEARTBEAT_MS = 30_000;

const clientMessage = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("move"),
    x: z.number(),
    y: z.number(),
    facing: z.enum(["down", "left", "right", "up"]),
    moving: z.boolean(),
  }),
  z.object({ t: z.literal("emote"), emote: z.enum(EMOTE_IDS as [EmoteId, ...EmoteId[]]) }),
]);

/** Tempo real: GET /api/realtime?worldId=... (WebSocket). Usa o mesmo cookie de sessão do login. */
export async function realtimeRoutes(app: FastifyInstance) {
  await app.register(websocket, { options: { maxPayload: 2048 } });

  // Derruba conexões "mortas" (ex.: aluno fechou o notebook sem sair).
  const alive = new WeakSet<WebSocket>();
  const timer = setInterval(() => {
    for (const ws of app.websocketServer.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
  }, HEARTBEAT_MS);
  app.addHook("onClose", async () => clearInterval(timer));

  app.get("/realtime", { websocket: true }, async (socket, request) => {
    alive.add(socket);
    socket.on("pong", () => alive.add(socket));

    // Os eventos chegam antes de terminar a verificação: guarda e processa depois.
    const queue: Buffer[] = [];
    let handle: ((raw: Buffer) => void) | null = null;
    socket.on("message", (raw: Buffer) => (handle ? handle(raw) : queue.push(raw)));

    try {
      await request.jwtVerify();
    } catch {
      return socket.close(WS_CLOSE.unauthorized, "Não autenticado");
    }

    const { worldId } = z.object({ worldId: z.string().min(1) }).catch({ worldId: "" }).parse(request.query);
    const [world, user] = await Promise.all([
      worldId ? prisma.world.findFirst({ where: { id: worldId, ...accessibleWorlds(request.user) } }) : null,
      prisma.user.findUnique({ where: { id: request.user.sub } }),
    ]);
    if (!world || !user) return socket.close(WS_CLOSE.forbidden, "Sem acesso a este mundo");

    const map = MAPS[world.mapKey as MapKey] ?? { width: 30, height: 20 };
    const conn: Connection = {
      send: (msg: ServerMessage) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
      },
      close: (code, reason) => socket.close(code, reason),
    };

    hub.join(world.id, { id: user.id, name: user.name, level: levelFromXp(user.xp) }, conn, {
      width: map.width * TILE,
      height: map.height * TILE,
    });
    socket.on("close", () => hub.leave(world.id, user.id, conn));

    handle = (raw) => {
      let data: unknown;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return; // mensagem inválida: ignora
      }
      const msg = clientMessage.safeParse(data);
      if (!msg.success) return;
      if (msg.data.t === "move") {
        const { x, y, facing, moving } = msg.data;
        hub.move(world.id, user.id, x, y, facing, moving);
      } else {
        hub.emote(world.id, user.id, msg.data.emote);
      }
    };
    queue.splice(0).forEach(handle);
  });
}
