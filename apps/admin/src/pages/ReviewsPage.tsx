import { useState } from "react";
import { Link } from "react-router";
import { FEEDBACK_MAX_LENGTH, type PendingReview } from "@school-class/shared";
import { api, errorMessage } from "../api";
import { REVIEWS_CHANGED, timeAgo } from "../format";
import { useAsync } from "../useAsync";

export function ReviewsPage() {
  const [worldId, setWorldId] = useState("");
  const worlds = useAsync(() => api.worlds(), []);
  const reviews = useAsync(() => api.reviews(worldId || undefined), [worldId]);
  /** Correções feitas nesta visita (o cartão mostra o resultado em vez de sumir de repente). */
  const [done, setDone] = useState<Record<string, { correct: boolean; xp: number }>>({});

  const remaining = (reviews.data ?? []).filter((r) => !done[r.id]).length;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Correções</h1>
          <p className="muted">Respostas livres dos alunos aguardando sua correção. Ao marcar como correta, o aluno ganha o XP da tarefa.</p>
        </div>
      </header>

      <div className="toolbar">
        <select value={worldId} onChange={(e) => setWorldId(e.target.value)} aria-label="Filtrar por mundo">
          <option value="">Todos os mundos</option>
          {worlds.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {reviews.data && <span className="muted toolbar-count">{remaining} aguardando</span>}
      </div>

      {reviews.loading && !reviews.data ? (
        <p className="muted">Carregando...</p>
      ) : reviews.error ? (
        <p className="form-error">{reviews.error}</p>
      ) : reviews.data?.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎉</div>
          <h2>Tudo corrigido!</h2>
          <p className="muted">Quando um aluno enviar uma resposta livre, ela aparece aqui.</p>
        </div>
      ) : (
        <div className="review-list">
          {reviews.data?.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              result={done[r.id]}
              onDone={(correct, xp) => {
                setDone((d) => ({ ...d, [r.id]: { correct, xp } }));
                window.dispatchEvent(new Event(REVIEWS_CHANGED));
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ReviewCard({
  review: r,
  result,
  onDone,
}: {
  review: PendingReview;
  result?: { correct: boolean; xp: number };
  onDone: (correct: boolean, xp: number) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"ok" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (correct: boolean) => {
    setBusy(correct ? "ok" : "no");
    setError(null);
    try {
      const res = await api.review(r.id, { correct, feedback });
      onDone(correct, res.xpGained);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  if (result) {
    return (
      <article className={`review-card review-done ${result.correct ? "ok" : "no"}`}>
        <strong>{r.student.name}</strong> —{" "}
        {result.correct
          ? `marcada como correta${result.xp > 0 ? ` (+${result.xp} XP)` : ""}.`
          : "devolvida para melhorar. O aluno verá seu comentário no jogo."}
      </article>
    );
  }

  return (
    <article className="review-card">
      <header className="review-head">
        <div>
          <strong>{r.student.name}</strong> <code className="muted">{r.student.username}</code>
        </div>
        <span className="muted small">
          {r.world.name} › <Link to={`/mundos/${r.world.id}/npcs/${r.npc.id}`}>{r.npc.name}</Link> · {timeAgo(r.createdAt)}
        </span>
      </header>
      <p className="review-question">{r.task.prompt}</p>
      <blockquote className="review-answer">{r.answer}</blockquote>
      <label className="sr-only" htmlFor={`fb-${r.id}`}>Comentário para o aluno</label>
      <textarea
        id={`fb-${r.id}`}
        className="review-feedback"
        rows={2}
        maxLength={FEEDBACK_MAX_LENGTH}
        placeholder="Comentário para o aluno (opcional). Ex.: Ótimo exemplo! / Explique com mais detalhes..."
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="review-actions">
        <button className="btn" onClick={() => void submit(false)} disabled={busy !== null}>
          {busy === "no" ? "Salvando..." : "✘ Precisa melhorar"}
        </button>
        <button className="btn btn-success" onClick={() => void submit(true)} disabled={busy !== null}>
          {busy === "ok" ? "Salvando..." : `✔ Correta (+${r.task.xpReward} XP)`}
        </button>
      </div>
    </article>
  );
}
