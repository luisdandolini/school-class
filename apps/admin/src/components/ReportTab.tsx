import { useState } from "react";
import type { AdminWorld, StudentReportRow } from "@school-class/shared";
import { api } from "../api";
import { percent, timeAgo } from "../format";
import { useAsync } from "../useAsync";
import { TASK_TYPES } from "./TaskEditor";
import { Modal } from "./Modal";

/** Relatório do mundo: progresso dos alunos e tarefas mais difíceis. */
export function ReportTab({ world }: { world: AdminWorld }) {
  const report = useAsync(() => api.worldReport(world.id), [world.id]);
  const [student, setStudent] = useState<StudentReportRow | null>(null);

  if (report.loading && !report.data) return <p className="muted">Carregando relatório...</p>;
  if (report.error || !report.data) return <p className="form-error">{report.error}</p>;
  const { students, tasks, totalTasks } = report.data;

  if (totalTasks === 0 || students.length === 0) {
    return (
      <div className="empty empty-sm">
        <p className="muted">
          {totalTasks === 0 ? "Este mundo ainda não tem tarefas." : "Nenhum aluno matriculado ainda."} O relatório aparece
          quando os alunos começarem a jogar.
        </p>
      </div>
    );
  }

  const avg = students.reduce((s, x) => s + x.completed / x.total, 0) / students.length;
  const active = students.filter((s) => s.lastActivity).length;
  const pending = students.reduce((s, x) => s + x.pendingReview, 0);

  return (
    <>
      <div className="kpis">
        <div className="kpi"><span>Conclusão média</span><strong>{percent(avg)}</strong></div>
        <div className="kpi"><span>Alunos que já jogaram</span><strong>{active} de {students.length}</strong></div>
        <div className="kpi"><span>Aguardando correção</span><strong>{pending}</strong></div>
      </div>

      <h2 className="section-title">Alunos</h2>
      <p className="hint">Clique num aluno para ver o que ele respondeu em cada tarefa.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Aluno</th><th>Progresso</th><th>Erros</th><th>Aguardando</th><th>Nível</th><th>Última atividade</th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="row-link" onClick={() => setStudent(s)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setStudent(s)}>
                <td><strong>{s.name}</strong><br /><code className="muted small">{s.username}</code></td>
                <td>
                  <div className="progress" aria-label={`${s.completed} de ${s.total} tarefas`}>
                    <div className="progress-bar" style={{ width: percent(s.completed / s.total) }} />
                  </div>
                  <span className="small muted">{s.completed} de {s.total}</span>
                </td>
                <td>{s.wrongAttempts}</td>
                <td>{s.pendingReview > 0 ? <span className="chip chip-warn">{s.pendingReview}</span> : "—"}</td>
                <td><span className="level">Nv. {s.level}</span> <span className="muted small">{s.xp} XP</span></td>
                <td className="muted">{timeAgo(s.lastActivity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title section-gap">Tarefas mais difíceis</h2>
      <p className="hint">Porcentagem de respostas erradas entre as corrigidas. Bom para saber o que retomar em aula.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Tarefa</th><th>NPC</th><th>Taxa de erro</th><th>Respostas</th><th>Concluíram</th></tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="small muted">{TASK_TYPES.find((x) => x.type === t.type)?.icon}</span> {t.prompt}
                </td>
                <td className="muted">{t.npcName}</td>
                <td>
                  {t.errorRate === null ? (
                    <span className="muted small">sem respostas</span>
                  ) : (
                    <div className="error-rate">
                      <div className="progress progress-sm">
                        <div className={`progress-bar ${t.errorRate >= 0.5 ? "bad" : t.errorRate >= 0.25 ? "warn" : "good"}`} style={{ width: percent(t.errorRate) }} />
                      </div>
                      <span>{percent(t.errorRate)}</span>
                    </div>
                  )}
                </td>
                <td>{t.attempts}</td>
                <td>{t.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {student && <StudentProgressDialog world={world} student={student} onClose={() => setStudent(null)} />}
    </>
  );
}

const STATUS_LABEL = { COMPLETED: "✅ Concluída", PENDING_REVIEW: "⏳ Aguardando", AVAILABLE: "— Não concluída" } as const;

function StudentProgressDialog({ world, student, onClose }: { world: AdminWorld; student: StudentReportRow; onClose: () => void }) {
  const progress = useAsync(() => api.studentProgress(world.id, student.id), [world.id, student.id]);
  return (
    <Modal title={`${student.name} em ${world.name}`} onClose={onClose} wide footer={<button className="btn btn-primary" onClick={onClose}>Fechar</button>}>
      {progress.loading && !progress.data ? (
        <p className="muted">Carregando...</p>
      ) : (
        <ul className="progress-list">
          {progress.data?.map((p) => (
            <li key={p.taskId} className={`progress-item status-${p.status.toLowerCase()}`}>
              <div className="progress-item-head">
                <span>{STATUS_LABEL[p.status]}</span>
                <span className="muted small">{p.npcName} · {p.attempts} tentativa(s){p.xpGained > 0 ? ` · +${p.xpGained} XP` : ""}</span>
              </div>
              <p className="progress-prompt">{p.prompt}</p>
              {p.acceptedAnswer && (
                <p className="small"><span className="muted">Resposta{p.status === "PENDING_REVIEW" ? " enviada" : " certa"}:</span> {p.acceptedAnswer}</p>
              )}
              {p.wrongAnswers.length > 0 && (
                <p className="small"><span className="muted">Respostas erradas:</span> {p.wrongAnswers.map((a) => `“${a}”`).join(", ")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
