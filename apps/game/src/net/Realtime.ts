import Phaser from "phaser";
import { WS_CLOSE, type ClientMessage, type EmoteId, type Facing, type ServerMessage } from "@school-class/shared";

/** Intervalo mínimo entre envios de posição (ms) — 10 por segundo é suficiente com interpolação. */
const SEND_INTERVAL_MS = 100;
const MAX_RETRY_MS = 10_000;

/**
 * Conexão do multiplayer. Emite um evento para cada tipo de mensagem do servidor
 * ("welcome", "join", "move", "leave", "emote", "levelup") e "status" (conectado ou não).
 * Reconecta sozinha se a conexão cair.
 */
export class Realtime extends Phaser.Events.EventEmitter {
  private ws?: WebSocket;
  private retryMs = 1000;
  private stopped = false;
  private lastSent = 0;
  private lastPos = "";
  connected = false;

  constructor(private worldId: string) {
    super();
    this.connect();
  }

  private connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/api/realtime?worldId=${encodeURIComponent(this.worldId)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.retryMs = 1000;
      this.lastPos = ""; // força reenviar a posição após reconectar
    };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerMessage;
      } catch {
        return;
      }
      if (msg.t === "welcome") this.setConnected(true);
      this.emit(msg.t, msg);
    };
    ws.onclose = (ev) => {
      this.setConnected(false);
      if (this.stopped) return;
      if (ev.code === WS_CLOSE.unauthorized) return window.location.reload(); // sessão expirou
      if (ev.code === WS_CLOSE.replaced || ev.code === WS_CLOSE.forbidden) {
        this.stopped = true;
        this.emit("stopped", ev.code);
        return;
      }
      // Caiu: tenta de novo, esperando um pouco mais a cada vez.
      setTimeout(() => !this.stopped && this.connect(), this.retryMs);
      this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
    };
  }

  private setConnected(v: boolean) {
    if (this.connected === v) return;
    this.connected = v;
    this.emit("status", v);
  }

  private send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Envia a posição — no máximo 10x por segundo, e só se mudou (parar é enviado na hora). */
  sendMove(x: number, y: number, facing: Facing, moving: boolean, now = performance.now()) {
    const key = `${Math.round(x)},${Math.round(y)},${facing},${moving}`;
    if (key === this.lastPos) return;
    const stopped = !moving && this.lastPos.endsWith("true");
    if (!stopped && now - this.lastSent < SEND_INTERVAL_MS) return;
    this.lastSent = now;
    this.lastPos = key;
    this.send({ t: "move", x, y, facing, moving });
  }

  sendEmote(emote: EmoteId) {
    this.send({ t: "emote", emote });
  }

  destroy() {
    this.stopped = true;
    this.ws?.close();
    this.removeAllListeners();
  }
}
