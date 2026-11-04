import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { GAME_URL } from "../config";

export function LoginPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user === undefined) return <div className="page-loading">Carregando...</div>;
  if (user?.role === "TEACHER") return <Navigate to="/alunos" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) return setError("Preencha usuário e senha.");
    setBusy(true);
    try {
      const u = await login(username, password);
      if (u.role === "TEACHER") navigate("/alunos", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError("Muitas tentativas. Espere um minuto.");
      else if (err instanceof ApiError && err.status === 401) setError("Usuário ou senha incorretos.");
      else setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={(e) => void submit(e)} noValidate>
        <div className="login-logo" aria-hidden="true">🌳</div>
        <h1>Painel do Professor</h1>
        <p className="muted">School Class</p>

        {user?.role === "STUDENT" ? (
          <>
            <p className="notice notice-info">
              Você entrou como <strong>{user.name}</strong>, que é uma conta de aluno. Este painel é só para professores.
            </p>
            <a className="btn btn-primary btn-block" href={GAME_URL}>🎮 Ir para o jogo</a>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                // Limpa o formulário para digitar a outra conta do zero.
                setUsername("");
                setPassword("");
                void logout();
              }}
            >
              Entrar com outra conta
            </button>
          </>
        ) : (
          <>
            <label htmlFor="username">Usuário</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus />
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <p className="form-error" role="alert">{error}</p>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
          </>
        )}
      </form>
    </main>
  );
}
