import { Navigate, NavLink, Outlet } from "react-router";
import { useAuth } from "../auth";
import { GAME_URL } from "../config";

/** Estrutura das páginas logadas: barra lateral + conteúdo. Só professores entram. */
export function Layout() {
  const { user, logout } = useAuth();

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
