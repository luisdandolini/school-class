import { GAME_URL } from "../config";

/** Mostra o primeiro quadro (de frente) de uma spritesheet de personagem do jogo. */
export function SpriteIcon({ sprite, size = 48, title }: { sprite: string; size?: number; title?: string }) {
  return (
    <span
      className="sprite-icon"
      role="img"
      aria-label={title ?? sprite}
      title={title}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${GAME_URL}assets/${sprite}.png)`,
        // Spritesheet: 3 colunas x 4 linhas; o quadro 0 é "parado, olhando para baixo".
        backgroundSize: `${size * 3}px ${size * 4}px`,
      }}
    />
  );
}
