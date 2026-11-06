import { AvatarIcon } from "../components/AvatarIcon";
import { useMemo, useState, type FormEvent } from "react";
import { USERNAME_PATTERN, type AdminStudent, type AdminWorld, type StudentCredentials } from "@school-class/shared";
import { api, errorMessage } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CredentialsSheet } from "../components/CredentialsSheet";
import { Modal } from "../components/Modal";
import { useAsync } from "../useAsync";

type Dialog =
  | { kind: "new" }
  | { kind: "bulk" }
  | { kind: "edit"; student: AdminStudent }
  | { kind: "reset"; student: AdminStudent }
  | { kind: "delete"; student: AdminStudent }
  | { kind: "credentials"; title: string; credentials: StudentCredentials[] };

export function StudentsPage() {
  const students = useAsync(() => api.students(), []);
  const worlds = useAsync(() => api.worlds(), []);
  const [search, setSearch] = useState("");
  const [worldFilter, setWorldFilter] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students.data ?? []).filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q) || s.username.includes(q)) &&
        (!worldFilter || (worldFilter === "none" ? s.worlds.length === 0 : s.worlds.some((w) => w.id === worldFilter))),
    );
  }, [students.data, search, worldFilter]);

  const close = () => setDialog(null);
  const done = (title: string, credentials: StudentCredentials[]) => {
    void students.reload();
    void worlds.reload();
    setDialog({ kind: "credentials", title, credentials });
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Alunos</h1>
          <p className="muted">Cadastre alunos, entregue usuário e senha e matricule-os nos seus mundos.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setDialog({ kind: "bulk" })}>📋 Cadastrar turma</button>
          <button className="btn btn-primary" onClick={() => setDialog({ kind: "new" })}>+ Novo aluno</button>
        </div>
      </header>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Buscar por nome ou usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar aluno"
        />
        <select value={worldFilter} onChange={(e) => setWorldFilter(e.target.value)} aria-label="Filtrar por mundo">
          <option value="">Todos os mundos</option>
          {worlds.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          <option value="none">Sem mundo</option>
        </select>
      </div>

      {students.loading && !students.data ? (
        <p className="muted">Carregando alunos...</p>
      ) : students.error ? (
        <p className="form-error">{students.error} <button className="btn btn-sm" onClick={() => void students.reload()}>Tentar de novo</button></p>
      ) : students.data?.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <h2>Nenhum aluno ainda</h2>
          <p className="muted">Comece cadastrando sua turma: cole a lista de nomes e o sistema cria usuários e senhas.</p>
          <button className="btn btn-primary" onClick={() => setDialog({ kind: "bulk" })}>📋 Cadastrar turma</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Progresso</th>
                <th>Mundos</th>
                <th className="col-actions"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><span className="name-cell"><AvatarIcon avatar={s.avatar} /><strong>{s.name}</strong></span></td>
                  <td><code>{s.username}</code></td>
                  <td><span className="level">Nv. {s.level}</span> <span className="muted">{s.xp} XP</span></td>
                  <td>
                    {s.worlds.length === 0 ? (
                      <span className="chip chip-muted">nenhum</span>
                    ) : (
                      s.worlds.map((w) => <span key={w.id} className="chip">{w.name}</span>)
                    )}
                  </td>
                  <td className="col-actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ kind: "edit", student: s })}>Editar</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setDialog({ kind: "reset", student: s })}>Nova senha</button>
                    {s.createdByMe && (
                      <button className="btn btn-sm btn-ghost btn-danger-text" onClick={() => setDialog({ kind: "delete", student: s })}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="muted center">Nenhum aluno encontrado com esse filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === "new" && (
        <NewStudentDialog worlds={worlds.data ?? []} onClose={close} onDone={(c) => done("Aluno cadastrado", [c])} />
      )}
      {dialog?.kind === "bulk" && (
        <BulkDialog worlds={worlds.data ?? []} onClose={close} onDone={(c) => done(`${c.length} alunos cadastrados`, c)} />
      )}
      {dialog?.kind === "edit" && (
        <EditStudentDialog student={dialog.student} onClose={close} onDone={() => { close(); void students.reload(); }} />
      )}
      {dialog?.kind === "reset" && (
        <ConfirmDialog
          title="Gerar nova senha"
          confirmLabel="Gerar nova senha"
          onClose={close}
          onConfirm={async () => done("Nova senha gerada", [await api.resetPassword(dialog.student.id)])}
        >
          <p>Gerar uma nova senha para <strong>{dialog.student.name}</strong>? A senha atual deixa de funcionar.</p>
        </ConfirmDialog>
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Excluir aluno"
          confirmLabel="Excluir definitivamente"
          danger
          onClose={close}
          onConfirm={async () => {
            await api.deleteStudent(dialog.student.id);
            close();
            void students.reload();
            void worlds.reload();
          }}
        >
          <p>
            Excluir <strong>{dialog.student.name}</strong> ({dialog.student.username})? Todo o progresso
            ({dialog.student.xp} XP, respostas e conquistas) será apagado. <strong>Isso não pode ser desfeito.</strong>
          </p>
        </ConfirmDialog>
      )}
      {dialog?.kind === "credentials" && (
        <Modal title={dialog.title} onClose={close} wide footer={<button className="btn btn-primary" onClick={close}>Pronto</button>}>
          <CredentialsSheet credentials={dialog.credentials} />
        </Modal>
      )}
    </>
  );
}

// ---------- Novo aluno ----------
function NewStudentDialog({ worlds, onClose, onDone }: { worlds: AdminWorld[]; onClose: () => void; onDone: (c: StudentCredentials) => void }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [worldIds, setWorldIds] = useState<string[]>(worlds.length === 1 ? [worlds[0].id] : []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Informe o nome do aluno.");
    if (username && !USERNAME_PATTERN.test(username)) {
      return setError("Usuário: 3 a 30 caracteres, só letras minúsculas, números, ponto, hífen ou _.");
    }
    setBusy(true);
    try {
      onDone(await api.createStudent({ name, username, password, worldIds }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Novo aluno"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="new-student" disabled={busy}>{busy ? "Salvando..." : "Cadastrar"}</button>
        </>
      }
    >
      <form id="new-student" className="form" onSubmit={(e) => void submit(e)}>
        <label htmlFor="ns-name">Nome completo</label>
        <input id="ns-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Ana Clara Souza" />

        <label htmlFor="ns-username">Usuário <span className="muted">(opcional)</span></label>
        <input id="ns-username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().trim())} maxLength={30} placeholder="Deixe vazio para gerar a partir do nome" autoCapitalize="none" />

        <label htmlFor="ns-password">Senha <span className="muted">(opcional)</span></label>
        <input id="ns-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={100} placeholder="Deixe vazio para gerar uma senha fácil (ex.: gatonuvem47)" />

        {worlds.length > 0 && (
          <fieldset>
            <legend>Matricular nos mundos</legend>
            {worlds.map((w) => (
              <label key={w.id} className="check">
                <input
                  type="checkbox"
                  checked={worldIds.includes(w.id)}
                  onChange={(e) => setWorldIds(e.target.checked ? [...worldIds, w.id] : worldIds.filter((id) => id !== w.id))}
                />
                {w.name}
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

// ---------- Cadastrar turma (em lote) ----------
function BulkDialog({ worlds, onClose, onDone }: { worlds: AdminWorld[]; onClose: () => void; onDone: (c: StudentCredentials[]) => void }) {
  const [text, setText] = useState("");
  const [worldId, setWorldId] = useState(worlds.length === 1 ? worlds[0].id : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const names = text.split("\n").map((n) => n.trim()).filter(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (names.length === 0) return setError("Cole pelo menos um nome.");
    if (names.length > 60) return setError("No máximo 60 alunos por vez.");
    setBusy(true);
    try {
      onDone(await api.createStudentsBulk({ names, worldId: worldId || undefined }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Cadastrar turma"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="bulk" disabled={busy || names.length === 0}>
            {busy ? "Cadastrando..." : `Cadastrar ${names.length || ""} aluno${names.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <form id="bulk" className="form" onSubmit={(e) => void submit(e)}>
        <label htmlFor="bulk-names">Nomes dos alunos <span className="muted">(um por linha)</span></label>
        <textarea
          id="bulk-names"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Ana Clara Souza\nBruno Lima\nCarlos Eduardo Santos\n..."}
        />
        <p className="hint">Dica: copie a coluna de nomes da sua lista de chamada (Excel, Google Planilhas...) e cole aqui. Usuários e senhas são gerados automaticamente.</p>

        {worlds.length > 0 && (
          <>
            <label htmlFor="bulk-world">Matricular no mundo</label>
            <select id="bulk-world" value={worldId} onChange={(e) => setWorldId(e.target.value)}>
              <option value="">Nenhum (matricular depois)</option>
              {worlds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

// ---------- Editar aluno ----------
function EditStudentDialog({ student, onClose, onDone }: { student: AdminStudent; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(student.name);
  const [username, setUsername] = useState(student.username);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Informe o nome.");
    if (!USERNAME_PATTERN.test(username)) return setError("Usuário: 3 a 30 caracteres, só letras minúsculas, números, ponto, hífen ou _.");
    setBusy(true);
    try {
      await api.updateStudent(student.id, { name, username });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Editar aluno"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="edit-student" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </>
      }
    >
      <form id="edit-student" className="form" onSubmit={(e) => void submit(e)}>
        <label htmlFor="es-name">Nome completo</label>
        <input id="es-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <label htmlFor="es-username">Usuário</label>
        <input id="es-username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().trim())} maxLength={30} autoCapitalize="none" />
        {username !== student.username && (
          <p className="hint">⚠️ O aluno passará a entrar com o novo usuário.</p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
