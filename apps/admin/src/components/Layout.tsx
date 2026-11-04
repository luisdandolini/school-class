import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { api } from "../api";
import { useAuth } from "../auth";
import { REVIEWS_CHANGED } from "../format";
import { GAME_URL } from "../config";

/** Estrutura das páginas logadas: barra lateral + conteúdo. Só professores entram. */
export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(0);
  const isTeacher = user?.role === "TEACHER";

  // Contador de correções pendentes: atualiza ao navegar e quando a fila muda.
  useEffect(() => {
    if (!isTeacher) return;
    const load = () => api.reviewCount().then((r) => setPending(r.pending), () => undefined);
    load();
    window.addEventListener(REVIEWS_CHANGED, load);
    return () => window.removeEventListener(REVIEWS_CHANGED, load);
  }, [isTeacher, location.pathname]);

  if (user === undefined) return <div className="page-loading">Carregando...</div>;
  if (user === null || user.role !== "TEACHER") return <Navigate to="/login" replace />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">🌳</span>
          <div>
            <strong>School Class</strong>
            <small>Painel do Professor</small>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/alunos">👥 Alunos</NavLink>
          <NavLink to="/mundos">🗺️ Mundos</NavLink>
          <NavLink to="/correcoes">
            ✅ Correções
            {pending > 0 && <span className="badge" aria-label={`${pending} aguardando`}>{pending}</span>}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <a className="nav-external" href={GAME_URL} target="_blank" rel="noreferrer">🎮 Abrir o jogo ↗</a>
          <div className="user-box">
            <span>{user.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>Sair</button>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
