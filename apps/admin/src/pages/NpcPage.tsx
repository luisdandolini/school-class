import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { AdminTask } from "@school-class/shared";
import { api, errorMessage } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { NpcForm } from "../components/NpcForm";
import { SpriteIcon } from "../components/SpriteIcon";
import { TASK_TYPES, TaskEditor } from "../components/TaskEditor";
import { useAsync } from "../useAsync";

type Dialog =
  | { kind: "edit-npc" }
  | { kind: "delete-npc" }
  | { kind: "task"; task?: AdminTask }
  | { kind: "delete-task"; task: AdminTask };

export function NpcPage() {
  const { worldId = "", npcId = "" } = useParams();
  const data = useAsync(() => Promise.all([api.npcTasks(npcId), api.world(worldId)]), [npcId, worldId]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (data.loading && !data.data) return <p className="muted">Carregando...</p>;
  if (!data.data) {
    return (
      <div className="empty">
        <h2>NPC não encontrado</h2>
        <Link className="btn" to={`/mundos/${worldId}`}>← Voltar para o mundo</Link>
      </div>
    );
  }
  const [{ npc, tasks }, world] = data.data;
  const close = () => setDialog(null);
  const reload = () => void data.reload();

  const move = async (index: number, delta: number) => {
    const ids = tasks.map((t) => t.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    setMoveError(null);
    try {
      await api.reorderTasks(npc.id, ids);
      reload();
    } catch (err) {
      setMoveError(errorMessage(err));
    }
  };

  const totalXp = tasks.reduce((s, t) => s + t.xpReward, 0);

  return (
    <>
      <Link to={`/mundos/${worldId}`} className="back">← {world.name}</Link>
      <header className="page-header">
        <div className="npc-header">
          <SpriteIcon sprite={npc.sprite} size={64} />
          <div>
            <h1>{npc.name}</h1>
            <p className="muted">“{npc.greeting}”</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setDialog({ kind: "edit-npc" })}>Editar NPC</button>
          <button className="btn btn-danger-text" onClick={() => setDialog({ kind: "delete-npc" })}>Excluir</button>
        </div>
      </header>

      <div className="section-head">
        <h2 className="section-title">
          Tarefas ({tasks.length}) {tasks.length > 0 && <span className="muted small">· {totalXp} XP no total</span>}
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => setDialog({ kind: "task" })}>+ Nova tarefa</button>
      </div>
      <p className="hint">Os alunos recebem as tarefas nesta ordem, uma de cada vez.</p>
      {moveError && <p className="form-error">{moveError}</p>}

      {tasks.length === 0 ? (
        <div className="empty empty-sm">
          <p className="muted">Este NPC ainda não tem tarefas. Sem tarefas, ele só cumprimenta os alunos.</p>
          <button className="btn btn-primary" onClick={() => setDialog({ kind: "task" })}>+ Criar a primeira tarefa</button>
        </div>
      ) : (
        <ol className="task-list">
          {tasks.map((t, i) => {
            const meta = TASK_TYPES.find((x) => x.type === t.type)!;
            return (
              <li key={t.id} className="task-item">
                <div className="task-order">
                  <button className="icon-btn" onClick={() => void move(i, -1)} disabled={i === 0} aria-label="Mover para cima">↑</button>
                  <span>{i + 1}</span>
                  <button className="icon-btn" onClick={() => void move(i, 1)} disabled={i === tasks.length - 1} aria-label="Mover para baixo">↓</button>
                </div>
                <div className="task-main">
                  <div className="task-tags">
                    <span className="chip">{meta.icon} {meta.label}</span>
                    <span className="chip chip-xp">+{t.xpReward} XP</span>
                  </div>
                  <p className="task-prompt-text">{t.prompt}</p>
                  <p className="task-answer muted small">{answerSummary(t)}</p>
                  <p className="task-stats small">
                    <span title="Alunos que concluíram">✅ {t.stats.completed} concluíram</span>
                    <span title="Respostas enviadas, certas e erradas">📨 {t.stats.attempts} respostas</span>
                    {t.stats.pendingReview > 0 && <span className="pending">⏳ {t.stats.pendingReview} aguardando correção</span>}
                  </p>
                </div>
                <div className="task-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ kind: "task", task: t })}>Editar</button>
                  <button className="btn btn-sm btn-ghost btn-danger-text" onClick={() => setDialog({ kind: "delete-task", task: t })}>Excluir</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {dialog?.kind === "task" && (
        <TaskEditor npcId={npc.id} npcName={npc.name} task={dialog.task} onClose={close} onSaved={() => { close(); reload(); }} />
      )}
      {dialog?.kind === "delete-task" && (
        <ConfirmDialog
          title="Excluir tarefa"
          confirmLabel="Excluir tarefa"
          danger
          onClose={close}
          onConfirm={async () => {
            await api.deleteTask(dialog.task.id);
            close();
            reload();
          }}
        >
          <p>Excluir a tarefa “{dialog.task.prompt}”?</p>
          {dialog.task.stats.attempts > 0 ? (
            <p className="notice notice-warning">
              {dialog.task.stats.attempts} resposta(s) de alunos serão apagadas. Quem já concluiu mantém o XP ganho.
            </p>
          ) : (
            <p className="muted">Nenhum aluno respondeu esta tarefa ainda.</p>
          )}
        </ConfirmDialog>
      )}
      {dialog?.kind === "edit-npc" && (
        <NpcForm
          title="Editar NPC"
          mapKey={world.mapKey}
          npcs={world.npcs}
          npc={npc}
          onClose={close}
          onSubmit={async (input) => {
            await api.updateNpc(npc.id, input);
            close();
            reload();
          }}
        />
      )}
      {dialog?.kind === "delete-npc" && (
        <ConfirmDialog
          title="Excluir NPC"
          confirmLabel="Excluir NPC"
          danger
          onClose={close}
          onConfirm={async () => {
            await api.deleteNpc(npc.id);
            navigate(`/mundos/${worldId}`);
          }}
        >
          <p>
            Excluir <strong>{npc.name}</strong> e suas {tasks.length} tarefa(s), com todas as respostas dos alunos? O XP
            que os alunos já ganharam continua. <strong>Isso não pode ser desfeito.</strong>
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

function answerSummary(t: AdminTask): string {
  switch (t.type) {
    case "MULTIPLE_CHOICE":
      return `Alternativas: ${t.options.map((o) => (o === t.answer ? `✔ ${o}` : o)).join(" · ")}`;
    case "TRUE_FALSE":
      return `Resposta: ${t.answer === "true" ? "Verdadeiro" : "Falso"}`;
    case "FILL_BLANK":
      return `Aceita: ${t.acceptedAnswers.map((a) => `“${a}”`).join(", ")}`;
    case "OPEN":
      return "Corrigida pelo professor";
  }
}
