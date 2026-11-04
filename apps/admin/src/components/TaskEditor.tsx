import { useState, type FormEvent } from "react";
import { LIMITS, type AdminTask, type TaskInput, type TaskType } from "@school-class/shared";
import { api, errorMessage } from "../api";
import { Modal } from "./Modal";

export const TASK_TYPES: { type: TaskType; icon: string; label: string; help: string }[] = [
  { type: "MULTIPLE_CHOICE", icon: "🔘", label: "Múltipla escolha", help: "O aluno escolhe uma alternativa." },
  { type: "TRUE_FALSE", icon: "⚖️", label: "Verdadeiro ou falso", help: "O aluno escolhe Verdadeiro ou Falso." },
  { type: "FILL_BLANK", icon: "✏️", label: "Completar", help: "O aluno digita a resposta. Maiúsculas e acentos são ignorados." },
  { type: "OPEN", icon: "📝", label: "Resposta livre", help: "O aluno escreve um texto e você corrige depois." },
];

interface TaskEditorProps {
  npcId: string;
  npcName: string;
  /** Tarefa existente (edição) ou undefined (nova). */
  task?: AdminTask;
  onClose: () => void;
  onSaved: () => void;
}

/** Formulário de tarefa com pré-visualização de como o aluno vai ver. */
export function TaskEditor({ npcId, npcName, task, onClose, onSaved }: TaskEditorProps) {
  const [type, setType] = useState<TaskType>(task?.type ?? "MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState(task?.prompt ?? "");
  const [xp, setXp] = useState(String(task?.xpReward ?? 10));
  const [options, setOptions] = useState<string[]>(task?.type === "MULTIPLE_CHOICE" ? task.options : ["", "", "", ""]);
  const [correct, setCorrect] = useState<number>(
    task?.type === "MULTIPLE_CHOICE" ? Math.max(0, task.options.indexOf(task.answer ?? "")) : 0,
  );
  const [tf, setTf] = useState<"true" | "false">(task?.type === "TRUE_FALSE" && task.answer === "false" ? "false" : "true");
  const [accepted, setAccepted] = useState<string[]>(task?.type === "FILL_BLANK" ? task.acceptedAnswers : [""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answeredBefore = (task?.stats.attempts ?? 0) > 0;

  const buildInput = (): TaskInput | string => {
    const xpReward = Number(xp);
    if (!prompt.trim()) return "Escreva a pergunta.";
    if (!Number.isInteger(xpReward) || xpReward < LIMITS.minXp || xpReward > LIMITS.maxXp) {
      return `O XP deve ser um número inteiro entre ${LIMITS.minXp} e ${LIMITS.maxXp}.`;
    }
    switch (type) {
      case "MULTIPLE_CHOICE": {
        const filled = options.map((o) => o.trim());
        if (filled.some((o) => !o)) return "Preencha todas as alternativas (ou remova as vazias).";
        if (filled.length < LIMITS.minOptions) return `Use pelo menos ${LIMITS.minOptions} alternativas.`;
        return { type, prompt, xpReward, options: filled, answer: filled[correct] };
      }
      case "TRUE_FALSE":
        return { type, prompt, xpReward, answer: tf };
      case "FILL_BLANK": {
        const answers = accepted.map((a) => a.trim()).filter(Boolean);
        if (answers.length === 0) return "Informe pelo menos uma resposta aceita.";
        return { type, prompt, xpReward, acceptedAnswers: answers };
      }
      case "OPEN":
        return { type, prompt, xpReward };
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = buildInput();
    if (typeof input === "string") return setError(input);
    setBusy(true);
    try {
      if (task) await api.updateTask(task.id, input);
      else await api.createTask(npcId, input);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const setOption = (i: number, v: string) => setOptions(options.map((o, j) => (j === i ? v : o)));
  const removeOption = (i: number) => {
    setOptions(options.filter((_, j) => j !== i));
    if (correct === i) setCorrect(0);
    else if (correct > i) setCorrect(correct - 1);
  };

  return (
    <Modal
      title={task ? "Editar tarefa" : "Nova tarefa"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="task-form" disabled={busy}>{busy ? "Salvando..." : "Salvar tarefa"}</button>
        </>
      }
    >
      <div className="task-editor">
        <form id="task-form" className="form" onSubmit={(e) => void submit(e)}>
          {answeredBefore && (
            <p className="notice notice-warning">
              ⚠️ Esta tarefa já tem {task!.stats.attempts} resposta(s) de alunos. As mudanças valem para as próximas
              respostas; quem já concluiu mantém o XP.
            </p>
          )}

          <span className="label">Tipo de tarefa</span>
          <div className="type-picker" role="radiogroup" aria-label="Tipo de tarefa">
            {TASK_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                role="radio"
                aria-checked={type === t.type}
                className={`type-option${type === t.type ? " selected" : ""}`}
                onClick={() => setType(t.type)}
              >
                <span aria-hidden="true">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <p className="hint">{TASK_TYPES.find((t) => t.type === type)!.help}</p>

          <label htmlFor="task-prompt">Pergunta</label>
          <textarea
            id="task-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={LIMITS.prompt}
            placeholder={type === "FILL_BLANK" ? "Ex.: 7 x 8 = ___" : "Ex.: Qual é a capital do Brasil?"}
          />

          {type === "MULTIPLE_CHOICE" && (
            <fieldset>
              <legend>Alternativas <span className="muted">(marque a correta)</span></legend>
              {options.map((o, i) => (
                <div key={i} className="option-row">
                  <input
                    type="radio"
                    name="correct"
                    checked={correct === i}
                    onChange={() => setCorrect(i)}
                    aria-label={`Alternativa ${i + 1} é a correta`}
                  />
                  <input
                    className={correct === i ? "option-correct" : ""}
                    value={o}
                    onChange={(e) => setOption(i, e.target.value)}
                    maxLength={LIMITS.option}
                    placeholder={`Alternativa ${i + 1}`}
                    aria-label={`Alternativa ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= LIMITS.minOptions}
                    aria-label={`Remover alternativa ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {options.length < LIMITS.maxOptions && (
                <button type="button" className="btn btn-sm" onClick={() => setOptions([...options, ""])}>+ Alternativa</button>
              )}
            </fieldset>
          )}

          {type === "TRUE_FALSE" && (
            <fieldset>
              <legend>Resposta correta</legend>
              <label className="check"><input type="radio" name="tf" checked={tf === "true"} onChange={() => setTf("true")} /> Verdadeiro</label>
              <label className="check"><input type="radio" name="tf" checked={tf === "false"} onChange={() => setTf("false")} /> Falso</label>
            </fieldset>
          )}

          {type === "FILL_BLANK" && (
            <fieldset>
              <legend>Respostas aceitas</legend>
              {accepted.map((a, i) => (
                <div key={i} className="option-row">
                  <input
                    value={a}
                    onChange={(e) => setAccepted(accepted.map((x, j) => (j === i ? e.target.value.replace(/\|/g, "") : x)))}
                    maxLength={LIMITS.option}
                    placeholder={i === 0 ? "Ex.: 56" : "Outra forma aceita, ex.: cinquenta e seis"}
                    aria-label={`Resposta aceita ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setAccepted(accepted.filter((_, j) => j !== i))}
                    disabled={accepted.length <= 1}
                    aria-label={`Remover resposta ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {accepted.length < LIMITS.maxAcceptedAnswers && (
                <button type="button" className="btn btn-sm" onClick={() => setAccepted([...accepted, ""])}>+ Outra resposta aceita</button>
              )}
              <p className="hint">Maiúsculas, acentos e espaços extras não importam: "Brasília" = "brasilia".</p>
            </fieldset>
          )}

          {type === "OPEN" && (
            <p className="notice notice-info">📝 Não há correção automática: a resposta vai para você corrigir no painel.</p>
          )}

          <label htmlFor="task-xp">XP ao acertar</label>
          <input
            id="task-xp"
            type="number"
            min={LIMITS.minXp}
            max={LIMITS.maxXp}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="input-short"
          />

          {error && <p className="form-error" role="alert">{error}</p>}
        </form>

        <aside className="task-preview" aria-label="Pré-visualização">
          <span className="label">Como o aluno vai ver</span>
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-npc">{npcName}</span>
              <span className="preview-xp">+{Number(xp) || 0} XP</span>
            </div>
            <div className="preview-prompt">{prompt || <span className="preview-placeholder">Sua pergunta aparece aqui</span>}</div>
            {type === "MULTIPLE_CHOICE" && (
              <div className="preview-choices">
                {options.map((o, i) => (
                  <div key={i} className="preview-choice"><span>{i + 1}</span>{o || "…"}</div>
                ))}
              </div>
            )}
            {type === "TRUE_FALSE" && (
              <div className="preview-choices">
                <div className="preview-choice"><span>1</span>Verdadeiro</div>
                <div className="preview-choice"><span>2</span>Falso</div>
              </div>
            )}
            {(type === "FILL_BLANK" || type === "OPEN") && (
              <div className={`preview-input${type === "OPEN" ? " tall" : ""}`}>
                {type === "OPEN" ? "Escreva sua resposta..." : "Digite a resposta"}
              </div>
            )}
            <div className="preview-footer"><span>Responder</span></div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
