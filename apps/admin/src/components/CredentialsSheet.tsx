import { useState } from "react";
import type { StudentCredentials } from "@school-class/shared";
import { GAME_URL } from "../config";

/**
 * Mostra usuário e senha para entregar aos alunos, com opção de copiar ou imprimir
 * (na impressão, cada aluno vira um cartãozinho para recortar).
 * A senha só aparece agora: depois não dá para ver de novo, só redefinir.
 */
export function CredentialsSheet({ credentials }: { credentials: StudentCredentials[] }) {
  const [copied, setCopied] = useState(false);
  const gameUrl = GAME_URL;

  const asText = () =>
    credentials.map((c) => `${c.name}\nUsuário: ${c.username}\nSenha: ${c.password}`).join("\n\n") +
    `\n\nAcesse: ${gameUrl}`;

  const copy = async () => {
    await navigator.clipboard.writeText(asText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="credentials">
      <p className="notice notice-warning">
        ⚠️ <strong>Anote ou imprima agora.</strong> Por segurança, as senhas não aparecem de novo. Se alguém
        esquecer, use "Nova senha".
      </p>
      <div className="credentials-actions no-print">
        <button className="btn" onClick={() => void copy()}>{copied ? "✓ Copiado!" : "📋 Copiar"}</button>
        <button className="btn" onClick={() => window.print()}>🖨️ Imprimir cartões</button>
      </div>
      <div className="credentials-grid print-area">
        {credentials.map((c) => (
          <div key={c.id} className="credential-card">
            <div className="credential-title">🌳 School Class</div>
            <div className="credential-name">{c.name}</div>
            <dl>
              <dt>Usuário</dt>
              <dd><code>{c.username}</code></dd>
              <dt>Senha</dt>
              <dd><code>{c.password}</code></dd>
            </dl>
            <div className="credential-url">{gameUrl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
