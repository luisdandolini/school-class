/**
 * Gera os mapas em public/assets/maps/<nome>.json (formato do Tiled).
 *
 *   pnpm --filter @school-class/game maps            → todos
 *   pnpm --filter @school-class/game maps escola     → só um
 *
 * ATENÇÃO: gerar de novo SOBRESCREVE o arquivo. Se você editou um mapa no Tiled,
 * não gere esse mapa outra vez.
 *
 * Para um mapa novo: crie scripts/maps/<nome>.mjs (veja os existentes) e registre
 * o nome, a largura e a altura em packages/shared/src/content.ts (MAPS).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toTiled } from "./maps/lib.mjs";
import starter from "./maps/starter.mjs";
import escola from "./maps/escola.mjs";
import floresta from "./maps/floresta.mjs";
import praia from "./maps/praia.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/maps");
const ALL = { starter, escola, floresta, praia };

const wanted = process.argv.slice(2);
for (const name of wanted.length ? wanted : Object.keys(ALL)) {
  const build = ALL[name];
  if (!build) {
    console.error(`Mapa desconhecido: ${name}. Opções: ${Object.keys(ALL).join(", ")}`);
    process.exit(1);
  }
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(toTiled(build())));
  console.log(`✔ maps/${name}.json`);
}
