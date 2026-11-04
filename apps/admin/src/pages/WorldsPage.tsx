import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { MAPS, type MapKey } from "@school-class/shared";
import { api } from "../api";
import { WorldForm } from "../components/WorldForm";
import { useAsync } from "../useAsync";

export function WorldsPage() {
  const worlds = useAsync(() => api.worlds(), [], 20_000);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Mundos</h1>
          <p className="muted">Cada mundo é um tema ou turma, com seus NPCs e tarefas. Os alunos só veem os mundos em que estão matriculados.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Novo mundo</button>
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
          <p className="muted">Crie seu primeiro mundo, coloque NPCs no mapa e escreva os desafios.</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Criar mundo</button>
        </div>
      ) : (
        <div className="cards">
          {worlds.data?.map((w) => (
            <Link key={w.id} to={`/mundos/${w.id}`} className="card card-link">
              <h2>{w.name}</h2>
              <p className="muted">{w.description || "Sem descrição"}</p>
              <p className="muted small">🗺️ {MAPS[w.mapKey as MapKey]?.name ?? w.mapKey}</p>
              <div className="stats">
                <span><strong>{w.studentCount}</strong> alunos</span>
                <span><strong>{w.npcCount}</strong> NPCs</span>
                <span><strong>{w.taskCount}</strong> tarefas</span>
                {w.onlineCount > 0 && <span className="online"><span className="dot" /> {w.onlineCount} online</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <WorldForm
          title="Novo mundo"
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            const w = await api.createWorld(data);
            navigate(`/mundos/${w.id}`);
          }}
        />
      )}
    </>
  );
}
