import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR, WS_CLOSE, type ServerMessage } from "@school-class/shared";
import { EMOTE_COOLDOWN_MS, Hub, MOVE_INTERVAL_MS, type Connection } from "./hub.js";

function fakeConn() {
  const sent: ServerMessage[] = [];
  const closed: number[] = [];
  const conn: Connection = { send: (m) => sent.push(m), close: (c) => closed.push(c) };
  return { conn, sent, closed, last: () => sent[sent.length - 1] };
}
const bounds = { width: 480, height: 320 };
const W = "mundo";
const AV = DEFAULT_AVATAR;

function setup() {
  const hub = new Hub();
  const ana = fakeConn();
  const bia = fakeConn();
  hub.join(W, { id: "ana", name: "Ana", level: 1, avatar: AV }, ana.conn, bounds);
  hub.move(W, "ana", 100, 100, "down", false, 1000);
  hub.join(W, { id: "bia", name: "Bia", level: 2, avatar: AV }, bia.conn, bounds);
  return { hub, ana, bia };
}

describe("Hub (salas do tempo real)", () => {
  it("quem entra recebe os jogadores que já estão no mundo", () => {
    const { bia } = setup();
    expect(bia.sent[0]).toMatchObject({ t: "welcome", selfId: "bia", players: [{ id: "ana", x: 100, y: 100 }] });
  });

  it("o novo jogador só aparece para os outros depois da primeira posição", () => {
    const { hub, ana } = setup();
    expect(ana.sent.some((m) => m.t === "join")).toBe(false);
    hub.move(W, "bia", 50, 60, "left", true, 1000);
    expect(ana.last()).toMatchObject({ t: "join", player: { id: "bia", name: "Bia", x: 50, y: 60 } });
  });

  it("movimentos vão para os outros (não para quem se moveu)", () => {
    const { hub, ana, bia } = setup();
    hub.move(W, "bia", 50, 60, "left", true, 1000);
    const before = bia.sent.length;
    hub.move(W, "ana", 120, 100, "right", true, 2000);
    expect(bia.last()).toEqual({ t: "move", id: "ana", x: 120, y: 100, facing: "right", moving: true });
    expect(bia.sent.length).toBe(before + 1);
    expect(ana.sent.filter((m) => m.t === "move" && m.id === "ana")).toHaveLength(0);
  });

  it("ignora movimentos rápidos demais e valores inválidos, e mantém dentro do mapa", () => {
    const { hub, bia } = setup();
    hub.move(W, "bia", 1, 1, "down", false, 1000);
    const n = bia.sent.length;
    hub.move(W, "ana", 110, 100, "down", true, 1000 + MOVE_INTERVAL_MS - 1); // rápido demais
    hub.move(W, "ana", Number.NaN, 100, "down", true, 5000); // inválido
    hub.move(W, "ana", 1, 1, "diagonal" as never, true, 6000); // direção inválida
    expect(bia.sent.length).toBe(n);
    hub.move(W, "ana", 9999, -50, "up", false, 7000);
    expect(bia.last()).toMatchObject({ x: 480, y: 0 });
  });

  it("emotes: só da lista e com intervalo mínimo", () => {
    const { hub, ana, bia } = setup();
    hub.move(W, "bia", 1, 1, "down", false, 1000);
    hub.emote(W, "ana", "oi", 10_000);
    expect(bia.last()).toEqual({ t: "emote", id: "ana", emote: "oi" });
    const n = bia.sent.length;
    hub.emote(W, "ana", "legal", 10_000 + EMOTE_COOLDOWN_MS - 1); // cedo demais
    hub.emote(W, "ana", "palavrao" as never, 20_000); // fora da lista
    expect(bia.sent.length).toBe(n);
    expect(ana.sent.some((m) => m.t === "emote")).toBe(false);
  });

  it("o mesmo aluno em outra aba derruba a conexão antiga", () => {
    const { hub, ana, bia } = setup();
    hub.move(W, "bia", 1, 1, "down", false, 1000);
    const ana2 = fakeConn();
    hub.join(W, { id: "ana", name: "Ana", level: 1, avatar: AV }, ana2.conn, bounds);
    expect(ana.sent).toContainEqual({ t: "replaced" });
    expect(ana.closed).toEqual([WS_CLOSE.replaced]);
    expect(bia.last()).toEqual({ t: "leave", id: "ana" });
    // a conexão antiga fechando depois não derruba a nova
    hub.leave(W, "ana", ana.conn);
    expect(hub.online(W).map((p) => p.userId)).toEqual(["ana", "bia"]);
  });

  it("saída avisa os outros e esvazia a sala", () => {
    const { hub, ana, bia } = setup();
    hub.move(W, "bia", 1, 1, "down", false, 1000);
    hub.leave(W, "ana", ana.conn);
    expect(bia.last()).toEqual({ t: "leave", id: "ana" });
    hub.leave(W, "bia", bia.conn);
    expect(hub.onlineCount(W)).toBe(0);
  });

  it("subida de nível é anunciada para os outros e atualiza o nível", () => {
    const { hub, ana, bia } = setup();
    hub.move(W, "bia", 1, 1, "down", false, 1000);
    hub.levelUp("ana", 3);
    expect(bia.last()).toEqual({ t: "levelup", id: "ana", name: "Ana", level: 3 });
    expect(ana.sent.some((m) => m.t === "levelup")).toBe(false);
    const carol = fakeConn();
    hub.join(W, { id: "carol", name: "Carol", level: 1, avatar: AV }, carol.conn, bounds);
    expect(carol.sent[0]).toMatchObject({ players: expect.arrayContaining([expect.objectContaining({ id: "ana", level: 3 })]) });
  });

  it("mundos são isolados", () => {
    const hub = new Hub();
    const a = fakeConn();
    const b = fakeConn();
    hub.join("m1", { id: "a", name: "A", level: 1, avatar: AV }, a.conn, bounds);
    hub.join("m2", { id: "b", name: "B", level: 1, avatar: AV }, b.conn, bounds);
    hub.move("m1", "a", 1, 1, "down", false, 1000);
    hub.move("m2", "b", 1, 1, "down", false, 1000);
    hub.emote("m1", "a", "oi", 5000);
    expect(b.sent.some((m) => m.t === "join" || m.t === "emote")).toBe(false);
  });

  it("troca de visual chega aos colegas e a quem entra depois", () => {
    const { hub, ana, bia } = setup();
    hub.move(W, "bia", 50, 60, "left", true, 1000);
    const novo = { style: 2, skin: 3, hair: 4, shirt: 5 };
    hub.avatarChanged("ana", novo);
    expect(bia.last()).toEqual({ t: "avatar", id: "ana", avatar: novo });
    expect(ana.sent.some((m) => m.t === "avatar")).toBe(false);
    const carol = fakeConn();
    hub.join(W, { id: "carol", name: "Carol", level: 1, avatar: AV }, carol.conn, bounds);
    expect(carol.sent[0]).toMatchObject({ players: expect.arrayContaining([expect.objectContaining({ id: "ana", avatar: novo })]) });
  });
});
