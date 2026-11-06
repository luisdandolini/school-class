import {
  HAIR_COLORS,
  HAIR_STYLES,
  SHIRT_COLORS,
  SKIN_TONES,
  randomAvatar,
  type AuthUser,
  type Avatar,
} from "@school-class/shared";
import { api, ApiError } from "../api/client";
import { avatarCanvas } from "../avatar";

const F = 16;
/** Ordem em que a prévia gira: frente, direita, costas, esquerda (linhas da spritesheet). */
const TURN = [0, 2, 3, 1];

interface Options {
  /** Primeira vez: sem botão de cancelar e com fundo de grama. */
  firstTime?: boolean;
}

/**
 * Tela "Monte seu personagem". Salva no servidor e devolve o usuário atualizado,
 * ou null se o aluno cancelar.
 */
export function editAvatar(base: HTMLImageElement, current: Avatar | null, opts: Options = {}): Promise<AuthUser | null> {
  let avatar: Avatar = current ? { ...current } : randomAvatar();

  const screen = document.createElement("div");
  screen.className = opts.firstTime ? "login" : "task-overlay";
  const card = document.createElement("section");
  card.className = "avatar-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "avatar-title");
  card.innerHTML = `
    <h1 id="avatar-title">${opts.firstTime ? "Monte seu personagem" : "Trocar visual"}</h1>
    <p class="avatar-subtitle">${opts.firstTime ? "É assim que os colegas vão ver você no mapa." : "Os colegas veem a mudança na hora."}</p>
    <div class="avatar-body">
      <div class="avatar-stage">
        <canvas class="avatar-preview" width="${F}" height="${F}" aria-hidden="true"></canvas>
        <button type="button" class="avatar-btn avatar-random">🎲 Sortear</button>
      </div>
      <div class="avatar-options"></div>
    </div>
    <p class="avatar-error" role="alert"></p>
    <div class="avatar-footer"></div>`;
  screen.append(card);
  document.body.append(screen);

  const preview = card.querySelector<HTMLCanvasElement>(".avatar-preview")!;
  const options = card.querySelector<HTMLDivElement>(".avatar-options")!;
  const errorBox = card.querySelector<HTMLParagraphElement>(".avatar-error")!;
  const footer = card.querySelector<HTMLDivElement>(".avatar-footer")!;

  // ---------- prévia animada (anda e gira) ----------
  let sheet = avatarCanvas(base, avatar);
  let tick = 0;
  const ctx = preview.getContext("2d")!;
  const draw = () => {
    const row = TURN[Math.floor(tick / 8) % 4];
    const col = [1, 0, 2, 0][tick % 4];
    ctx.clearRect(0, 0, F, F);
    ctx.drawImage(sheet, col * F, row * F, F, F, 0, 0, F, F);
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timer = reduced ? 0 : window.setInterval(() => (tick++, draw()), 160);

  // ---------- grupos de opções ----------
  const groups: { label: string; key: keyof Avatar; items: { label: string; color?: string }[] }[] = [
    { label: "Cabelo", key: "style", items: HAIR_STYLES.map((s) => ({ label: s.name })) },
    { label: "Cor do cabelo", key: "hair", items: HAIR_COLORS.map((c, i) => ({ label: `Cor ${i + 1}`, color: c })) },
    { label: "Pele", key: "skin", items: SKIN_TONES.map((c, i) => ({ label: `Tom ${i + 1}`, color: c })) },
    { label: "Roupa", key: "shirt", items: SHIRT_COLORS.map((c, i) => ({ label: `Cor ${i + 1}`, color: c })) },
  ];
  const buttons: { key: keyof Avatar; index: number; el: HTMLButtonElement }[] = [];

  for (const g of groups) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "avatar-group";
    const legend = document.createElement("legend");
    legend.textContent = g.label;
    const row = document.createElement("div");
    row.className = g.items[0].color ? "avatar-swatches" : "avatar-styles";
    g.items.forEach((item, index) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `${g.label}: ${item.label}`);
      if (item.color) {
        b.className = "avatar-swatch";
        b.style.background = item.color;
      } else {
        b.className = "avatar-btn avatar-style";
        b.textContent = item.label;
      }
      b.addEventListener("click", () => update({ ...avatar, [g.key]: index }));
      buttons.push({ key: g.key, index, el: b });
      row.append(b);
    });
    fieldset.append(legend, row);
    options.append(fieldset);
  }

  function update(next: Avatar) {
    avatar = next;
    sheet = avatarCanvas(base, avatar);
    for (const b of buttons) b.el.setAttribute("aria-pressed", String(avatar[b.key] === b.index));
    draw();
  }
  update(avatar);
  card.querySelector(".avatar-random")!.addEventListener("click", () => update(randomAvatar()));

  // ---------- salvar / cancelar ----------
  return new Promise((resolve) => {
    const close = (result: AuthUser | null) => {
      window.clearInterval(timer);
      document.removeEventListener("keydown", onKey, true);
      screen.remove();
      resolve(result);
    };

    const save = document.createElement("button");
    save.type = "button";
    save.className = "avatar-btn avatar-primary";
    save.textContent = opts.firstTime ? "Pronto!" : "Salvar";
    save.addEventListener("click", async () => {
      save.disabled = true;
      errorBox.textContent = "";
      try {
        close(await api.setAvatar(avatar));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return window.location.reload();
        errorBox.textContent = "Não foi possível salvar agora. Tente de novo.";
        save.disabled = false;
      }
    });

    if (!opts.firstTime) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "avatar-btn";
      cancel.textContent = "Cancelar";
      cancel.addEventListener("click", () => close(null));
      footer.append(cancel);
    }
    footer.append(save);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !opts.firstTime) {
        e.preventDefault();
        close(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    save.focus();
  });
}
