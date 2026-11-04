import { TRUE_FALSE_VALUES, type NpcTask, type TaskResult } from "@school-class/shared";
import { api, ApiError } from "../api/client";

export interface TaskPanelContext {
  npcName: string;
  /** Posição desta tarefa entre as do NPC (1, 2, 3...). */
  index: number;
  total: number;
  /** Ainda há outra tarefa disponível depois desta? (avaliado após responder) */
  hasNext: () => boolean;
  /** Chamado a cada resposta corrigida (para atualizar HUD, marcadores etc.). */
  onResult: (result: TaskResult) => void;
}

/** "next" = ir para o próximo desafio; "close" = sair da conversa. */
export type TaskPanelAction = "next" | "close";

const TYPE_LABEL: Record<NpcTask["type"], string> = {
  MULTIPLE_CHOICE: "Múltipla escolha",
  TRUE_FALSE: "Verdadeiro ou falso",
  FILL_BLANK: "Complete",
  OPEN: "Resposta livre",
};

/** Cria um elemento HTML com classe e texto. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Janela de desafio (HTML por cima do jogo).
 * Múltipla escolha e V/F: escolher e confirmar. Lacuna e livre: digitar e enviar.
 * Atalhos: 1–4 escolhem a alternativa, Enter responde, Esc fecha.
 */
export class TaskPanel {
  private overlay: HTMLElement | null = null;

  get isOpen() {
    return this.overlay !== null;
  }

  run(task: NpcTask, ctx: TaskPanelContext): Promise<TaskPanelAction> {
    return new Promise((resolve) => {
      const overlay = el("div", "task-overlay");
      const card = el("section", "task-card");
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-labelledby", "task-prompt");
      card.tabIndex = -1;

      // --- cabeçalho ---
      const header = el("header", "task-header");
      header.append(
        el("span", "task-npc", ctx.npcName),
        el("span", "task-meta", `Desafio ${ctx.index} de ${ctx.total} · ${TYPE_LABEL[task.type]}`),
        el("span", "task-xp", `+${task.xpReward} XP`),
      );
      const closeBtn = el("button", "task-close", "×");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Fechar");
      header.append(closeBtn);

      const prompt = el("h2", "task-prompt", task.prompt);
      prompt.id = "task-prompt";

      // Resposta aberta devolvida pelo professor: mostra o comentário para o aluno melhorar.
      const teacherNote =
        task.review && !task.review.correct
          ? el("p", "task-teacher-note", `💬 Comentário da correção: ${task.review.feedback ?? "Tente explicar melhor."}`)
          : null;

      const body = el("div", "task-body");
      const feedback = el("p", "task-feedback");
      feedback.setAttribute("role", "status");
      const footer = el("footer", "task-footer");

      card.append(header, prompt, ...(teacherNote ? [teacherNote] : []), body, feedback, footer);
      overlay.append(card);
      document.body.append(overlay);
      this.overlay = overlay;

      // --- estado ---
      let selected: HTMLButtonElement | null = null;
      let answered = false;
      let sending = false;
      const choiceButtons: HTMLButtonElement[] = [];
      let input: HTMLInputElement | HTMLTextAreaElement | null = null;

      const submitBtn = el("button", "task-btn task-btn-primary", "Responder");
      submitBtn.type = "button";
      submitBtn.disabled = true;

      const finish = (action: TaskPanelAction) => {
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        this.overlay = null;
        resolve(action);
      };

      const select = (btn: HTMLButtonElement) => {
        if (answered || btn.disabled) return;
        choiceButtons.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selected = btn;
        submitBtn.disabled = false;
      };

      // --- corpo conforme o tipo ---
      const addChoice = (label: string, value: string, key: string) => {
        const b = el("button", "task-choice");
        b.type = "button";
        b.dataset.value = value;
        b.append(el("span", "task-choice-key", key), el("span", "", label));
        b.addEventListener("click", () => select(b));
        choiceButtons.push(b);
        body.append(b);
      };

      if (task.type === "MULTIPLE_CHOICE") {
        body.classList.add("task-choices");
        task.options.forEach((opt, i) => addChoice(opt, opt, String(i + 1)));
      } else if (task.type === "TRUE_FALSE") {
        body.classList.add("task-choices", "task-choices-2");
        addChoice("Verdadeiro", TRUE_FALSE_VALUES.true, "1");
        addChoice("Falso", TRUE_FALSE_VALUES.false, "2");
      } else {
        input = task.type === "OPEN" ? el("textarea", "task-input") : el("input", "task-input");
        input.setAttribute("aria-label", "Sua resposta");
        input.placeholder = task.type === "OPEN" ? "Escreva sua resposta..." : "Digite a resposta";
        input.maxLength = 2000;
        if (input instanceof HTMLTextAreaElement) input.rows = 4;
        else input.autocomplete = "off";
        input.addEventListener("input", () => {
          submitBtn.disabled = !input!.value.trim();
          input!.classList.remove("wrong");
        });
        body.append(input);
      }

      // --- rodapé ---
      const showFooter = (...buttons: HTMLButtonElement[]) => {
        footer.replaceChildren(...buttons);
      };
      const button = (label: string, primary: boolean, onClick: () => void) => {
        const b = el("button", `task-btn${primary ? " task-btn-primary" : ""}`, label);
        b.type = "button";
        b.addEventListener("click", onClick);
        return b;
      };
      showFooter(submitBtn);

      const showDone = () => {
        answered = true;
        choiceButtons.forEach((b) => (b.disabled = true));
        if (input) input.disabled = true;
        const next = ctx.hasNext();
        const primary = next
          ? button("Próximo desafio →", true, () => finish("next"))
          : button("Concluir", true, () => finish("close"));
        showFooter(...(next ? [button("Sair", false, () => finish("close"))] : []), primary);
        primary.focus();
      };

      // --- envio ---
      const submit = async () => {
        if (answered || sending) return;
        const answer = selected?.dataset.value ?? input?.value.trim() ?? "";
        if (!answer) return;

        sending = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando...";
        feedback.className = "task-feedback";
        feedback.textContent = "";

        try {
          const result = await api.submitAnswer(task.id, answer);
          ctx.onResult(result);

          switch (result.outcome) {
            case "CORRECT":
              selected?.classList.add("correct");
              input?.classList.add("correct");
              feedback.classList.add("ok");
              feedback.textContent = `🎉 Correto! Você ganhou ${result.xpGained} XP.`;
              showDone();
              break;
            case "PENDING_REVIEW":
              feedback.classList.add("info");
              feedback.textContent = "📨 Resposta enviada! Quando ela for corrigida, você ganha o XP.";
              showDone();
              break;
            case "ALREADY_COMPLETED":
              feedback.classList.add("info");
              feedback.textContent = "Você já tinha concluído este desafio.";
              showDone();
              break;
            case "WRONG":
              feedback.classList.add("error");
              feedback.textContent = "Não foi dessa vez. Tente de novo!";
              if (selected) {
                // A alternativa errada fica marcada e desativada.
                selected.classList.remove("selected");
                selected.classList.add("wrong");
                selected.disabled = true;
                selected = null;
              }
              if (input) {
                input.classList.add("wrong");
                input.select();
              }
              card.classList.remove("shake");
              void card.offsetWidth; // reinicia a animação
              card.classList.add("shake");
              break;
          }
        } catch (err) {
          feedback.classList.add("error");
          feedback.textContent =
            err instanceof ApiError && err.status === 429
              ? "Calma! Muitas respostas seguidas. Espere um pouco."
              : "Não foi possível enviar. Verifique a conexão e tente de novo.";
        } finally {
          sending = false;
          submitBtn.textContent = "Responder";
          submitBtn.disabled = answered || (!selected && !input?.value.trim());
        }
      };

      submitBtn.addEventListener("click", submit);
      closeBtn.addEventListener("click", () => finish("close"));

      // --- teclado ---
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finish("close");
          return;
        }
        if (e.key === "Enter") {
          // Na resposta livre, Enter quebra linha; Ctrl/Cmd+Enter envia.
          if (input instanceof HTMLTextAreaElement && !(e.ctrlKey || e.metaKey)) return;
          const active = document.activeElement;
          if (active instanceof HTMLButtonElement && choiceButtons.includes(active)) {
            select(active); // Enter numa alternativa: escolhe e responde
          } else if (active instanceof HTMLButtonElement && active !== submitBtn) {
            return; // outros botões (Próximo, Sair, ×) tratam o próprio Enter
          }
          e.preventDefault();
          if (!answered) submit();
          return;
        }
        if (!input && /^[1-9]$/.test(e.key)) {
          const b = choiceButtons[Number(e.key) - 1];
          if (b) select(b);
        }
      };
      document.addEventListener("keydown", onKey, true);

      // Foco inicial: no campo de texto, ou no cartão (não num botão, para a tecla
      // Espaço que abriu o desafio não "clicar" sem querer numa alternativa).
      requestAnimationFrame(() => (input ?? card).focus());
    });
  }
}
