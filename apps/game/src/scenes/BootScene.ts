import Phaser from "phaser";
import { api, ApiError } from "../api/client";
import { CHARACTER_SPRITES, FONT } from "../config";
import { createCharacterAnims } from "../entities/animations";
import { logout } from "../auth/login";
import { chooseWorld } from "../ui/worldSelect";

/** Carrega a arte, busca o mundo no backend e então carrega o mapa desse mundo. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.load.image("tiles", "assets/tiles.png");
    for (const key of CHARACTER_SPRITES) {
      this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: 16, frameHeight: 16 });
    }
  }

  async create() {
    for (const key of CHARACTER_SPRITES) createCharacterAnims(this, key);

    const { width, height } = this.scale;
    const status = this.add
      .text(width / 2, height / 2, "Carregando mundo...", {
        fontFamily: FONT, fontSize: "28px", color: "#ffffff", align: "center",
      })
      .setOrigin(0.5);

    try {
      const worlds = await api.listWorlds();
      if (worlds.length === 0) {
        status.setText("Você ainda não está em nenhum mundo.\nPeça para te adicionarem a uma turma.");
        this.addLogoutButton(height / 2 + 90);
        return;
      }
      status.setVisible(false);
      const chosen = await chooseWorld(worlds);
      status.setVisible(true);
      this.registry.set("worldCount", worlds.length);
      const world = await api.getWorld(chosen.id);

      this.load.tilemapTiledJSON(world.mapKey, `assets/maps/${world.mapKey}.json`);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.start("World", { world }));
      this.load.start();
    } catch (err) {
      // Sessão expirou: volta para o login.
      if (err instanceof ApiError && err.status === 401) {
        window.location.reload();
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      status.setText(`Não foi possível carregar o mundo.\n${msg}\n\nO backend está rodando?`);
      status.setColor("#ff8a8a");
      this.addLogoutButton(height / 2 + 110);
    }
  }

  /** Botão para trocar de conta quando não dá para entrar no jogo. */
  private addLogoutButton(y: number) {
    const btn = this.add
      .text(this.scale.width / 2, y, "Sair e entrar com outra conta", {
        fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: "#1b1f2a",
        backgroundColor: "#f6d55c", padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerdown", () => logout());
  }
}
