import Phaser from "phaser";
import { api } from "./api/client";
import { showLogin } from "./auth/login";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { BootScene } from "./scenes/BootScene";
import { UIScene } from "./scenes/UIScene";
import { WorldScene } from "./scenes/WorldScene";

// Já tem sessão? Entra direto. Senão, mostra o login.
const user = (await api.me().catch(() => null)) ?? (await showLogin());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1b1f2a",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, WorldScene, UIScene],
  callbacks: {
    // Disponível para todas as cenas via this.registry.get("user").
    preBoot: (g) => g.registry.set("user", user),
  },
});

// Em desenvolvimento, expõe o jogo no console do navegador para depuração: window.__game
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
