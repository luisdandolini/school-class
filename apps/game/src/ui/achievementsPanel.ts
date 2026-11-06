import { ACHIEVEMENTS, type EarnedAchievement } from "@school-class/shared";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Janela "Minhas medalhas": as conquistadas em destaque e as que faltam, com a dica de como ganhar. */
export function showAchievements(earned: EarnedAchievement[]): Promise<void> {
  const overlay = document.createElement("div");
  overlay.className = "task-overlay";
  const card = document.createElement("section");
  card.className = "medals-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "medals-title");

  const total = ACHIEVEMENTS.filter((a) => earned.some((e) => e.id === a.id)).length;
  card.innerHTML = `
    <div class="medals-head">
      <h1 id="medals-title">🏅 Minhas medalhas</h1>
      <button type="button" class="task-close" aria-label="Fechar">✕</button>
    </div>
    <p class="medals-count">${total} de ${ACHIEVEMENTS.length} conquistadas</p>
    <ul class="medals-list"></ul>
    <div class="task-footer"><button type="button" class="task-btn task-btn-primary">Fechar</button></div>`;
  const list = card.querySelector(".medals-list")!;

  for (const def of ACHIEVEMENTS) {
    const mine = earned.filter((e) => e.id === def.id);
    const li = document.createElement("li");
    li.className = `medal${mine.length ? " earned" : ""}`;

    const icon = document.createElement("span");
    icon.className = "medal-icon";
    icon.textContent = mine.length ? def.icon : "🔒";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = def.name + (mine.length > 1 ? ` ×${mine.length}` : "");
    const desc = document.createElement("span");
    desc.textContent = def.description;
    text.append(name, desc);
    if (mine.length) {
      const when = document.createElement("em");
      const worlds = mine.map((m) => m.worldName).filter(Boolean);
      when.textContent = worlds.length ? worlds.join(" · ") : `Conquistada em ${dateFmt.format(new Date(mine[0].earnedAt))}`;
      text.append(when);
    }
    li.append(icon, text);
    li.setAttribute("aria-label", `${def.name}: ${mine.length ? "conquistada" : "ainda não conquistada"}. ${def.description}`);
    list.append(li);
  }

  overlay.append(card);
  document.body.append(overlay);

  return new Promise((resolve) => {
    const close = () => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    card.querySelectorAll("button").forEach((b) => b.addEventListener("click", close));
    overlay.addEventListener("click", (e) => e.target === overlay && close());
    // Foco no "✕" do topo: a lista começa do início (focar o "Fechar" de baixo rolaria até o fim).
    card.querySelector<HTMLButtonElement>(".task-close")!.focus();
  });
}
