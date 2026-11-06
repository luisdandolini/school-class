import Phaser from "phaser";
import {
  AVATAR_SHEET,
  DEFAULT_AVATAR,
  avatarColors,
  avatarKey,
  avatarLayerOrigin,
  type AVATAR_LAYERS,
  type Avatar,
} from "@school-class/shared";
import { createCharacterAnims } from "./entities/animations";

/** Chave da arte base carregada no BootScene. */
export const AVATAR_BASE = "avatar-base";

/**
 * Desenha a spritesheet (3 x 4 quadros) de um avatar num canvas: a camada base e,
 * por cima, as máscaras de cabelo, pele e roupa pintadas com as cores escolhidas.
 * Não lê pixels (getImageData), então funciona mesmo em navegadores que embaralham essa leitura.
 */
export function avatarCanvas(base: CanvasImageSource, avatar: Avatar): HTMLCanvasElement {
  const { width: w, height: h } = AVATAR_SHEET;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const o = out.getContext("2d")!;
  const at = (layer: (typeof AVATAR_LAYERS)[number]) => avatarLayerOrigin(avatar.style, layer);

  const b = at("base");
  o.drawImage(base, b.x, b.y, w, h, 0, 0, w, h);

  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const t = tmp.getContext("2d")!;
  const colors = avatarColors(avatar);
  for (const layer of ["hair", "skin", "shirt"] as const) {
    const m = at(layer);
    t.globalCompositeOperation = "source-over";
    t.clearRect(0, 0, w, h);
    t.drawImage(base, m.x, m.y, w, h, 0, 0, w, h);
    t.globalCompositeOperation = "source-in"; // pinta só onde a máscara existe
    t.fillStyle = colors[layer];
    t.fillRect(0, 0, w, h);
    o.drawImage(tmp, 0, 0);
  }
  return out;
}

/**
 * Garante que existe uma textura (e as animações de caminhada) para este avatar.
 * Retorna a chave da textura, ex.: "avatar-1-2-0-5".
 */
export function ensureAvatarTexture(scene: Phaser.Scene, avatar: Avatar | null | undefined): string {
  const a = avatar ?? DEFAULT_AVATAR;
  const key = avatarKey(a);
  if (scene.textures.exists(key)) return key;

  const base = scene.textures.get(AVATAR_BASE).getSourceImage() as HTMLImageElement;
  const texture = scene.textures.addCanvas(key, avatarCanvas(base, a))!;
  const F = AVATAR_SHEET.width / 3;
  for (let i = 0; i < 12; i++) texture.add(i, 0, (i % 3) * F, Math.floor(i / 3) * F, F, F);
  createCharacterAnims(scene, key);
  return key;
}
