import type { PublicWorld } from "@school-class/shared";

const LAST_WORLD_KEY = "school-class:ultimo-mundo";

function rememberWorld(id: string) {
  try {
    localStorage.setItem(LAST_WORLD_KEY, id);
  } catch {
    /* navegador sem armazenamento: tudo bem */
  }
}

function lastWorld(): string | null {
  try {
    return localStorage.getItem(LAST_WORLD_KEY);
  } catch {
    return null;
  }
}

/**
 * Decide em qual mundo entrar:
 * - ?mundo=<id> na URL (link "Testar no jogo" do painel), se o aluno tiver acesso;
 * - se só houver um mundo, entra direto;
 * - senão, mostra a tela de escolha (com o último mundo jogado em destaque).
 */
export async function chooseWorld(worlds: PublicWorld[]): Promise<PublicWorld> {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = worlds.find((w) => w.id === params.get("mundo"));
  if (fromUrl && !params.has("escolher")) {
    rememberWorld(fromUrl.id);
    return fromUrl;
  }
  if (worlds.length === 1) return worlds[0];

  const last = lastWorld();
  const screen = document.createElement("main");
  screen.className = "login world-select";
  const card = document.createElement("section");
  card.className = "login-card world-card";
  card.innerHTML = `
    <div class="login-logo" aria-hidden="true">🗺️</div>
    <h1>Escolha um mundo</h1>
    <p class="login-subtitle">Para onde vamos hoje?</p>
    <div class="world-list"></div>`;
  const list = card.querySelector(".world-list")!;
  screen.append(card);
  document.body.append(screen);

  return new Promise((resolve) => {
    for (const w of worlds) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "world-option";
      const name = document.createElement("strong");
      name.textContent = w.name;
      btn.append(name);
      if (w.description) {
        const desc = document.createElement("span");
        desc.textContent = w.description;
        btn.append(desc);
      }
      if (w.id === last) {
        const tag = document.createElement("em");
        tag.textContent = "último jogado";
        btn.append(tag);
      }
      btn.addEventListener("click", () => {
        rememberWorld(w.id);
        screen.remove();
        // Atualiza a URL para recarregar no mesmo mundo.
        history.replaceState(null, "", `?mundo=${encodeURIComponent(w.id)}`);
        resolve(w);
      });
      list.append(btn);
    }
    (list.querySelector<HTMLButtonElement>(".world-option") ?? card).focus();
  });
}

/** Volta para a tela de escolha de mundo. */
export function switchWorld() {
  window.location.search = "?escolher=1";
}
