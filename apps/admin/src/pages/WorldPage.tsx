import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { MAPS, type AdminStudent, type AdminWorld, type AdminWorldDetail, type MapKey } from "@school-class/shared";
import { api, errorMessage } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MapPicker } from "../components/MapPicker";
import { Modal } from "../components/Modal";
import { NpcForm } from "../components/NpcForm";
import { ReportTab } from "../components/ReportTab";
import { SpriteIcon } from "../components/SpriteIcon";
import { WorldForm } from "../components/WorldForm";
import { GAME_URL } from "../config";
import { useAsync } from "../useAsync";

type Tab = "conteudo" | "alunos" | "relatorio";

export function WorldPage() {
  const { worldId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba");
  const tab: Tab = aba === "alunos" || aba === "relatorio" ? aba : "conteudo";
  const world = useAsync(() => api.world(worldId), [worldId]);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<"edit" | "delete" | "npc" | null>(null);

  if (world.loading && !world.data) return <p className="muted">Carregando...</p>;
  if (!world.data) {
    return (
      <div className="empty">
        <h2>Mundo não encontrado</h2>
        <Link className="btn" to="/mundos">← Voltar para os mundos</Link>
      </div>
    );
  }
  const w = world.data;

  return (
    <>
      <Link to="/mundos" className="back">← Mundos</Link>
      <header className="page-header">
        <div>
          <h1>{w.name}</h1>
          {w.description && <p className="muted">{w.description}</p>}
          <div className="stats">
            <span>🗺️ {MAPS[w.mapKey as MapKey]?.name ?? w.mapKey}</span>
            <span><strong>{w.studentCount}</strong> alunos</span>
            <span><strong>{w.npcCount}</strong> NPCs</span>
            <span><strong>{w.taskCount}</strong> tarefas</span>
          </div>
        </div>
        <div className="page-actions">
          <a className="btn" href={`${GAME_URL}?mundo=${w.id}`} target="_blank" rel="noreferrer">🎮 Testar no jogo</a>
          <button className="btn" onClick={() => setDialog("edit")}>Editar</button>
          <button className="btn btn-danger-text" onClick={() => setDialog("delete")}>Excluir</button>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "conteudo"} className={tab === "conteudo" ? "active" : ""} onClick={() => setParams({})}>
          NPCs e tarefas
        </button>
        <button role="tab" aria-selected={tab === "alunos"} className={tab === "alunos" ? "active" : ""} onClick={() => setParams({ aba: "alunos" })}>
          Alunos ({w.studentCount})
        </button>
        <button role="tab" aria-selected={tab === "relatorio"} className={tab === "relatorio" ? "active" : ""} onClick={() => setParams({ aba: "relatorio" })}>
          📊 Relatório
        </button>
      </div>

      {tab === "conteudo" && <ContentTab world={w} onNewNpc={() => setDialog("npc")} />}
      {tab === "alunos" && <StudentsTab world={w} onChange={() => void world.reload()} />}
      {tab === "relatorio" && <ReportTab world={w} />}

      {dialog === "edit" && (
        <WorldForm
          title="Editar mundo"
          initial={{ name: w.name, description: w.description, mapKey: w.mapKey as MapKey }}
          onClose={() => setDialog(null)}
          onSubmit={async (data) => {
            await api.updateWorld(w.id, data);
            setDialog(null);
            void world.reload();
          }}
        />
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title="Excluir mundo"
          confirmLabel="Excluir mundo"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await api.deleteWorld(w.id);
            navigate("/mundos");
          }}
        >
          <p>Excluir <strong>{w.name}</strong>? Serão apagados:</p>
          <ul>
            <li>{w.npcCount} NPC(s) e {w.taskCount} tarefa(s), com todas as respostas dos alunos;</li>
            <li>as matrículas de {w.studentCount} aluno(s) neste mundo.</li>
          </ul>
          <p>As contas dos alunos e o XP que já ganharam continuam. <strong>Isso não pode ser desfeito.</strong></p>
        </ConfirmDialog>
      )}
      {dialog === "npc" && (
        <NpcForm
          title="Novo NPC"
          mapKey={w.mapKey}
          npcs={w.npcs}
          onClose={() => setDialog(null)}
          onSubmit={async (data) => {
            const npc = await api.createNpc(w.id, data);
            navigate(`/mundos/${w.id}/npcs/${npc.id}`);
          }}
        />
      )}
    </>
  );
}

function ContentTab({ world, onNewNpc }: { world: AdminWorldDetail; onNewNpc: () => void }) {
  const navigate = useNavigate();
  const open = (npcId: string) => navigate(`/mundos/${world.id}/npcs/${npcId}`);

  return (
    <div className="content-grid">
      <section>
        <MapPicker mapKey={world.mapKey} npcs={world.npcs} onNpcClick={open} />
      </section>
      <section>
        <div className="section-head">
          <h2 className="section-title">NPCs ({world.npcs.length})</h2>
          <button className="btn btn-primary btn-sm" onClick={onNewNpc}>+ Novo NPC</button>
        </div>
        {world.npcs.length === 0 ? (
          <div className="empty empty-sm">
            <p className="muted">Nenhum NPC ainda. Os NPCs são os personagens que passam as tarefas aos alunos.</p>
            <button className="btn btn-primary" onClick={onNewNpc}>+ Criar o primeiro NPC</button>
          </div>
        ) : (
          <ul className="npc-list">
            {world.npcs.map((n) => (
              <li key={n.id}>
                <Link to={`/mundos/${world.id}/npcs/${n.id}`} className="npc-item">
                  <SpriteIcon sprite={n.sprite} size={40} />
                  <div>
                    <strong>{n.name}</strong>
                    <span className="muted small">{n.taskCount} tarefa(s) · posição ({n.x}, {n.y})</span>
                  </div>
                  <span aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StudentsTab({ world, onChange }: { world: AdminWorld; onChange: () => void }) {
  const enrolled = useAsync(() => api.students(world.id), [world.id]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AdminStudent | null>(null);

  const refresh = () => {
    void enrolled.reload();
    onChange();
  };

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Alunos matriculados ({enrolled.data?.length ?? "…"})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Matricular alunos</button>
      </div>
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
