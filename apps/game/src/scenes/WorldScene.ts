import Phaser from "phaser";
import type { WorldDetail } from "@school-class/shared";
import { DEPTH, INTERACT_DISTANCE, WORLD_ZOOM } from "../config";
import { Npc } from "../entities/Npc";
import { Player } from "../entities/Player";
import type { UIScene } from "./UIScene";

/** Cena principal: mapa, jogador, NPCs e interação. */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private npcs: Npc[] = [];
  private nearby?: Npc;
  private talkingTo?: Npc;
  private ui!: UIScene;

  constructor() {
    super("World");
  }

  create({ world }: { world: WorldDetail }) {
    // --- mapa ---
    const map = this.make.tilemap({ key: world.mapKey });
    const tiles = map.addTilesetImage("tiles", "tiles")!;
    const ground = map.createLayer("Chao", tiles)!.setDepth(DEPTH.ground);
    const objects = map.createLayer("Objetos", tiles)!.setDepth(DEPTH.objects);
    map.createLayer("Topo", tiles)!.setDepth(DEPTH.top);
    ground.setCollisionByProperty({ collides: true }); // água
    objects.setCollisionByProperty({ collides: true });
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- jogador ---
    const spawn = map.findObject("Pontos", (o) => o.name === "spawn");
    this.player = new Player(this, spawn?.x ?? map.widthInPixels / 2, spawn?.y ?? map.heightInPixels / 2);
    this.physics.add.collider(this.player, [ground, objects]);

    // --- NPCs (vindos do backend) ---
    this.npcs = world.npcs.map((data) => new Npc(this, data));
    this.physics.add.collider(this.player, this.npcs);

    // --- câmera ---
    this.cameras.main
      .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
      .setZoom(WORLD_ZOOM)
      .startFollow(this.player, true, 0.15, 0.15)
      .fadeIn(400);

    // --- interface (diálogo, HUD) roda numa cena separada, sem zoom ---
    this.scene.launch("UI", { worldName: world.name });
    this.ui = this.scene.get("UI") as UIScene;

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard!.addKey(K.SPACE).on("down", () => this.interact());
    this.input.keyboard!.addKey(K.E).on("down", () => this.interact());
  }

  update() {
    this.player.update();

    // Mostra "Espaço" sobre o NPC mais próximo ao alcance.
    let closest: Npc | undefined;
    let best = INTERACT_DISTANCE;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < best) {
        best = d;
        closest = npc;
      }
    }
    this.nearby = closest;
    for (const npc of this.npcs) npc.setPromptVisible(npc === closest && !this.talkingTo);
  }

  private interact() {
    // Com diálogo aberto, Espaço avança a conversa.
    if (this.talkingTo) {
      if (!this.ui.dialog.advance()) this.endConversation();
      return;
    }
    if (!this.nearby) return;

    const npc = this.nearby;
    this.talkingTo = npc;
    this.player.frozen = true;
    npc.faceTowards(this.player.x, this.player.y);
    this.ui.dialog.open(npc.data_.name, [
      npc.data_.greeting,
      // Provisório até a feat/tarefas.
      "Ainda estou preparando meus desafios... Volte em breve!",
    ]);
  }

  private endConversation() {
    this.talkingTo?.resetFacing();
    this.talkingTo = undefined;
    this.player.frozen = false;
  }
}
