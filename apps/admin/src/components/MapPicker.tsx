import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminNpc } from "@school-class/shared";
import { GAME_URL } from "../config";

const T = 16; // tamanho do tile no jogo
const SCALE = 2; // resolução interna do canvas

interface TiledLayer {
  name: string;
  type: string;
  data?: number[];
  objects?: { name: string; x: number; y: number }[];
}
interface TiledMap {
  width: number;
  height: number;
  layers: TiledLayer[];
  tilesets: { firstgid: number; columns: number; tiles?: { id: number; properties?: { name: string; value: unknown }[] }[] }[];
}

interface LoadedMap {
  map: TiledMap;
  tiles: HTMLImageElement;
  sprites: Map<string, HTMLImageElement>;
  /** "x,y" → motivo do bloqueio */
  blocked: Map<string, string>;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
    img.src = src;
  });
}

const cache = new Map<string, Promise<LoadedMap>>();

/** Carrega o mapa (mesmo arquivo do jogo) e descobre quais tiles estão bloqueados. */
function loadMap(mapKey: string, spriteKeys: string[]): Promise<LoadedMap> {
  const key = `${mapKey}|${[...spriteKeys].sort().join(",")}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const res = await fetch(`${GAME_URL}assets/maps/${mapKey}.json`);
        if (!res.ok) throw new Error("Mapa não encontrado");
        const map = (await res.json()) as TiledMap;
        const [tiles, ...spriteImgs] = await Promise.all([
          loadImage(`${GAME_URL}assets/tiles.png`),
          ...spriteKeys.map((s) => loadImage(`${GAME_URL}assets/${s}.png`)),
        ]);

        const ts = map.tilesets[0];
        const colliding = new Set(
          (ts.tiles ?? []).filter((t) => t.properties?.some((p) => p.name === "collides" && p.value === true)).map((t) => t.id),
        );
        const blocked = new Map<string, string>();
        for (const layer of map.layers) {
          if (layer.type !== "tilelayer" || !layer.data || layer.name === "Topo") continue;
          layer.data.forEach((gid, i) => {
            if (gid && colliding.has(gid - ts.firstgid)) blocked.set(`${i % map.width},${Math.floor(i / map.width)}`, "obstáculo");
          });
        }
        const spawn = map.layers.find((l) => l.type === "objectgroup")?.objects?.find((o) => o.name === "spawn");
        if (spawn) blocked.set(`${Math.floor(spawn.x / T)},${Math.floor(spawn.y / T)}`, "ponto de partida dos alunos");

        return { map, tiles, sprites: new Map(spriteKeys.map((k, i) => [k, spriteImgs[i]])), blocked };
      })(),
    );
  }
  return cache.get(key)!;
}

interface MapPickerProps {
  mapKey: string;
  npcs: Pick<AdminNpc, "id" | "name" | "sprite" | "x" | "y">[];
  /** Posição escolhida (modo seleção). */
  value?: { x: number; y: number } | null;
  /** Se informado, clicar num tile livre escolhe a posição. */
  onPick?: (pos: { x: number; y: number }) => void;
  /** Se informado, clicar num NPC chama esta função. */
  onNpcClick?: (npcId: string) => void;
  /** NPC sendo editado (ignorado na checagem de ocupado). */
  editingNpcId?: string;
  /** Aparência mostrada na posição escolhida. */
  previewSprite?: string;
}

/** Mapa do mundo desenhado com a arte do jogo; permite escolher a posição de um NPC. */
export function MapPicker({ mapKey, npcs, value, onPick, onNpcClick, editingNpcId, previewSprite }: MapPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const spriteKeys = useMemo(
    () => [...new Set([...npcs.map((n) => n.sprite), ...(previewSprite ? [previewSprite] : [])])],
    [npcs, previewSprite],
  );

  useEffect(() => {
    let alive = true;
    loadMap(mapKey, spriteKeys).then(
      (m) => alive && setLoaded(m),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [mapKey, spriteKeys]);

  const others = npcs.filter((n) => n.id !== editingNpcId);
  const statusOf = (x: number, y: number): string | null => {
    const npc = others.find((n) => n.x === x && n.y === y);
    if (npc) return `ocupado por ${npc.name}`;
    return loaded?.blocked.get(`${x},${y}`) ?? null;
  };

  // --- desenho ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const { map, tiles, sprites } = loaded;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, map.width * T, map.height * T);

    const cols = map.tilesets[0].columns;
    const drawLayer = (name: string) => {
      map.layers.find((l) => l.name === name)?.data?.forEach((gid, i) => {
        if (!gid) return;
        const id = gid - 1;
        ctx.drawImage(tiles, (id % cols) * T, Math.floor(id / cols) * T, T, T, (i % map.width) * T, Math.floor(i / map.width) * T, T, T);
      });
    };
    const drawSprite = (sprite: string, x: number, y: number, alpha = 1) => {
      const img = sprites.get(sprite);
      if (!img) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, 0, 0, T, T, x * T, y * T, T, T);
      ctx.globalAlpha = 1;
    };

    drawLayer("Chao");
    drawLayer("Objetos");
    for (const n of others) drawSprite(n.sprite, n.x, n.y);
    if (value && previewSprite) drawSprite(previewSprite, value.x, value.y);
    drawLayer("Topo");

    // Destaques: posição escolhida e tile sob o mouse.
    const outline = (x: number, y: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x * T + 0.5, y * T + 0.5, T - 1, T - 1);
    };
    if (value) outline(value.x, value.y, "#f6d55c");
    if (hover && onPick) {
      const bad = statusOf(hover.x, hover.y);
      ctx.fillStyle = bad ? "rgba(220,60,60,0.35)" : "rgba(255,255,255,0.3)";
      ctx.fillRect(hover.x * T, hover.y * T, T, T);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, npcs, value, hover, previewSprite, editingNpcId, onPick]);

  const tileAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!loaded) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * loaded.map.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * loaded.map.height);
    return x >= 0 && y >= 0 && x < loaded.map.width && y < loaded.map.height ? { x, y } : null;
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = tileAt(e);
    if (!pos) return;
    const npc = others.find((n) => n.x === pos.x && n.y === pos.y);
    if (npc && onNpcClick) return onNpcClick(npc.id);
    if (onPick && !statusOf(pos.x, pos.y)) onPick(pos);
  };

  if (error) return <p className="form-error">{error}</p>;

  const hoverStatus = hover ? statusOf(hover.x, hover.y) : null;
  const hoverNpc = hover ? others.find((n) => n.x === hover.x && n.y === hover.y) : undefined;

  return (
    <div className="map-picker">
      <canvas
        ref={canvasRef}
        width={(loaded?.map.width ?? 30) * T * SCALE}
        height={(loaded?.map.height ?? 20) * T * SCALE}
        className={onPick || onNpcClick ? "clickable" : ""}
        onMouseMove={(e) => setHover(tileAt(e))}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
        aria-label="Mapa do mundo"
      />
      {!loaded && <div className="map-loading">Carregando mapa...</div>}
      <p className="map-status" aria-live="polite">
        {hover
          ? hoverNpc && onNpcClick
            ? `${hoverNpc.name} — clique para abrir`
            : onPick
              ? hoverStatus
                ? `(${hover.x}, ${hover.y}) — bloqueado: ${hoverStatus}`
                : `(${hover.x}, ${hover.y}) — livre, clique para escolher`
              : `(${hover.x}, ${hover.y})`
          : onPick
            ? value
              ? `Posição escolhida: (${value.x}, ${value.y}). Clique em outro lugar para mudar.`
              : "Clique num lugar livre do mapa para posicionar o NPC."
            : onNpcClick
              ? "Clique num NPC para ver as tarefas dele."
              : ""}
      </p>
    </div>
  );
}
