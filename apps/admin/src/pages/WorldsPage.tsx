import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { AdminStudent, AdminWorld } from "@school-class/shared";
import { api, errorMessage } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { useAsync } from "../useAsync";

export function WorldsPage() {
  const { worldId } = useParams();
  const worlds = useAsync(() => api.worlds(), []);
  const world = worlds.data?.find((w) => w.id === worldId);

  if (worldId) {
    if (worlds.loading && !worlds.data) return <p className="muted">Carregando...</p>;
    if (!world) {
      return (
        <div className="empty">
          <h2>Mundo não encontrado</h2>
          <Link className="btn" to="/mundos">← Voltar para os mundos</Link>
        </div>
      );
    }
    return <WorldDetail world={world} onChange={() => void worlds.reload()} />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Mundos</h1>
          <p className="muted">Cada mundo é um tema ou turma. Os alunos só veem os mundos em que estão matriculados.</p>
        </div>
      </header>

      {worlds.loading && !worlds.data ? (
        <p className="muted">Carregando mundos...</p>
      ) : worlds.error ? (
        <p className="form-error">{worlds.error}</p>
      ) : worlds.data?.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🗺️</div>
          <h2>Nenhum mundo ainda</h2>
          <p className="muted">A criação de mundos, NPCs e tarefas pelo painel chega na próxima etapa.</p>
        </div>
      ) : (
        <div className="cards">
          {worlds.data?.map((w) => (
            <Link key={w.id} to={`/mundos/${w.id}`} className="card card-link">
              <h2>{w.name}</h2>
              <p className="muted">{w.description || "Sem descrição"}</p>
              <div className="stats">
                <span><strong>{w.studentCount}</strong> alunos</span>
                <span><strong>{w.npcCount}</strong> NPCs</span>
                <span><strong>{w.taskCount}</strong> tarefas</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function WorldDetail({ world, onChange }: { world: AdminWorld; onChange: () => void }) {
  const enrolled = useAsync(() => api.students(world.id), [world.id]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AdminStudent | null>(null);

  const refresh = () => {
    void enrolled.reload();
    onChange();
  };

  return (
    <>
      <Link to="/mundos" className="back">← Mundos</Link>
      <header className="page-header">
        <div>
          <h1>{world.name}</h1>
          <p className="muted">{world.description}</p>
          <div className="stats">
            <span><strong>{world.npcCount}</strong> NPCs</span>
            <span><strong>{world.taskCount}</strong> tarefas</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Matricular alunos</button>
        </div>
      </header>

      <h2 className="section-title">Alunos matriculados ({enrolled.data?.length ?? "…"})</h2>
      {enrolled.loading && !enrolled.data ? (
        <p className="muted">Carregando...</p>
      ) : enrolled.data?.length === 0 ? (
        <div className="empty empty-sm">
          <p className="muted">Ninguém matriculado ainda. Os alunos só veem este mundo depois de matriculados.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Usuário</th><th>Progresso</th><th className="col-actions"><span className="sr-only">Ações</span></th></tr>
            </thead>
            <tbody>
              {enrolled.data?.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td><code>{s.username}</code></td>
                  <td><span className="level">Nv. {s.level}</span> <span className="muted">{s.xp} XP</span></td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-ghost btn-danger-text" onClick={() => setRemoving(s)}>Remover do mundo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <EnrollDialog
          world={world}
          enrolledIds={new Set(enrolled.data?.map((s) => s.id))}
          onClose={() => setAdding(false)}
          onDone={() => { setAdding(false); refresh(); }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remover do mundo"
          confirmLabel="Remover"
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await api.unenroll(world.id, removing.id);
            setRemoving(null);
            refresh();
          }}
        >
          <p>
            Remover <strong>{removing.name}</strong> de <strong>{world.name}</strong>? Este mundo deixa de aparecer
            no jogo para essa conta, mas o cadastro e o XP continuam.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

function EnrollDialog({ world, enrolledIds, onClose, onDone }: { world: AdminWorld; enrolledIds: Set<string>; onClose: () => void; onDone: () => void }) {
  const all = useAsync(() => api.students(), []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (all.data ?? []).filter((s) => !enrolledIds.has(s.id) && (!q || s.name.toLowerCase().includes(q) || s.username.includes(q)));
  }, [all.data, enrolledIds, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const allSelected = available.length > 0 && available.every((s) => selected.has(s.id));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.enroll(world.id, [...selected]);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Matricular em ${world.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy || selected.size === 0}>
            {busy ? "Salvando..." : `Matricular ${selected.size || ""}`}
          </button>
        </>
      }
    >
      {all.loading && !all.data ? (
        <p className="muted">Carregando alunos...</p>
      ) : (all.data ?? []).filter((s) => !enrolledIds.has(s.id)).length === 0 ? (
        <p className="muted">Todos os seus alunos já estão neste mundo. Cadastre novos na página <Link to="/alunos">Alunos</Link>.</p>
      ) : (
        <>
          <input className="search" type="search" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar aluno" />
          <label className="check check-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(available.map((s) => s.id)))}
            />
            Selecionar todos ({available.length})
          </label>
          <div className="check-list">
            {available.map((s) => (
              <label key={s.id} className="check">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span>{s.name} <code className="muted">{s.username}</code></span>
              </label>
            ))}
          </div>
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
