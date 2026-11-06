import { useEffect, useRef } from "react";
import { DEFAULT_AVATAR, avatarColors, avatarLayerOrigin, type Avatar } from "@school-class/shared";
import { GAME_URL } from "../config";

const F = 16;
let basePromise: Promise<HTMLImageElement> | null = null;

/** Arte base dos avatares, carregada uma vez só (vem do jogo). */
function loadBase(): Promise<HTMLImageElement> {
  basePromise ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      basePromise = null;
      reject(new Error("Não foi possível carregar a arte dos avatares"));
    };
    img.src = `${GAME_URL}assets/avatar-base.png`;
  });
  return basePromise;
}

/** Personagem do aluno (de frente). Sem avatar escolhido: boneco padrão, apagado. */
export function AvatarIcon({ avatar, size = 32 }: { avatar: Avatar | null; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = avatar ? `${avatar.style}-${avatar.skin}-${avatar.hair}-${avatar.shirt}` : "none";

  useEffect(() => {
    let alive = true;
    const a = avatar ?? DEFAULT_AVATAR;
    loadBase()
      .then((img) => {
        const ctx = ref.current?.getContext("2d");
        if (!alive || !ctx) return;
        // Mesma técnica do jogo: base + máscaras pintadas (sem ler pixels do canvas).
        ctx.clearRect(0, 0, F, F);
        const b = avatarLayerOrigin(a.style, "base");
        ctx.drawImage(img, b.x, b.y, F, F, 0, 0, F, F);
        const tmp = document.createElement("canvas");
        tmp.width = F;
        tmp.height = F;
        const t = tmp.getContext("2d")!;
        const colors = avatarColors(a);
        for (const layer of ["hair", "skin", "shirt"] as const) {
          const m = avatarLayerOrigin(a.style, layer);
          t.globalCompositeOperation = "source-over";
          t.clearRect(0, 0, F, F);
          t.drawImage(img, m.x, m.y, F, F, 0, 0, F, F);
          t.globalCompositeOperation = "source-in";
          t.fillStyle = colors[layer];
          t.fillRect(0, 0, F, F);
          ctx.drawImage(tmp, 0, 0);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <canvas
      ref={ref}
      width={F}
      height={F}
      className={`avatar-icon${avatar ? "" : " avatar-icon-empty"}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={avatar ? "Personagem do aluno" : "Ainda não montou o personagem"}
      title={avatar ? undefined : "Ainda não montou o personagem"}
    />
  );
}
