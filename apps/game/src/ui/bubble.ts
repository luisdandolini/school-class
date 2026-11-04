import Phaser from "phaser";
import { DEPTH, FONT } from "../config";

/** Balão de fala temporário acima de um personagem (emotes, comemorações). */
export function showBubble(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, text: string, durationMs = 3000) {
  // Um balão por personagem: o novo substitui o anterior.
  const prev = target.getData("bubble") as Phaser.GameObjects.Text | undefined;
  prev?.destroy();

  const bubble = scene.add
    .text(target.x, target.y - 22, text, {
      fontFamily: FONT, fontSize: "7px", color: "#1b1f2a", resolution: 8,
      backgroundColor: "#ffffff", padding: { x: 3, y: 2 },
    })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.labels + 2)
    .setScale(0.6);
  target.setData("bubble", bubble);

  scene.tweens.add({ targets: bubble, scale: 1, duration: 150, ease: "Back.out" });
  // Acompanha o personagem enquanto estiver visível.
  const follow = () => bubble.setPosition(target.x, target.y - 22);
  scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
  scene.time.delayedCall(durationMs, () => {
    scene.tweens.add({
      targets: bubble,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
        if (target.getData("bubble") === bubble) target.setData("bubble", undefined);
        bubble.destroy();
      },
    });
  });
}
