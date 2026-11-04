import Phaser from "phaser";
import { api } from "../api/client";
import { FONT } from "../config";
import { createCharacterAnims } from "../entities/animations";

/** Carrega a arte, busca o mundo no backend e então carrega o mapa desse mundo. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.load.image("tiles", "assets/tiles.png");
    this.load.spritesheet("player", "assets/player.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("npc", "assets/npc.png", { frameWidth: 16, frameHeight: 16 });
  }

  async create() {
    createCharacterAnims(this, "player");
    createCharacterAnims(this, "npc");

    const { width, height } = this.scale;
    const status = this.add
      .text(width / 2, height / 2, "Carregando mundo...", {
        fontFamily: FONT, fontSize: "28px", color: "#ffffff", align: "center",
      })
      .setOrigin(0.5);

    try {
      // Por enquanto entra no primeiro mundo. Depois da feat/auth: mundos do aluno logado.
      const worlds = await api.listWorlds();
      if (worlds.length === 0) throw new Error("Nenhum mundo cadastrado.");
      const world = await api.getWorld(worlds[0].id);

      this.load.tilemapTiledJSON(world.mapKey, `assets/maps/${world.mapKey}.json`);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.start("World", { world }));
      this.load.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.setText(`Não foi possível carregar o mundo.\n${msg}\n\nO backend está rodando?`);
      status.setColor("#ff8a8a");
    }
  }
}
