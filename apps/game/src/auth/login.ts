import type { AuthUser } from "@school-class/shared";
import { api, ApiError } from "../api/client";

/** Mostra a tela de login e resolve com o usuário quando o login der certo. */
export function showLogin(): Promise<AuthUser> {
  const screen = document.getElementById("login") as HTMLElement;
  const form = document.getElementById("login-form") as HTMLFormElement;
  const username = document.getElementById("login-username") as HTMLInputElement;
  const password = document.getElementById("login-password") as HTMLInputElement;
  const error = document.getElementById("login-error") as HTMLElement;
  const submit = document.getElementById("login-submit") as HTMLButtonElement;

  screen.hidden = false;
  username.focus();

  return new Promise((resolve) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";

      if (!username.value.trim() || !password.value) {
        error.textContent = "Preencha usuário e senha.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Entrando...";
      try {
        const user = await api.login({ username: username.value, password: password.value });
        screen.hidden = true;
        password.value = "";
        resolve(user);
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          error.textContent = "Muitas tentativas. Espere um minuto e tente de novo.";
        } else if (err instanceof ApiError && err.status === 401) {
          error.textContent = "Usuário ou senha incorretos.";
        } else {
          error.textContent = "Não foi possível conectar. Tente novamente.";
        }
        password.select();
      } finally {
        submit.disabled = false;
        submit.textContent = "Entrar";
      }
    });
  });
}

/** Encerra a sessão e volta para a tela de login. */
export async function logout() {
  await api.logout().catch(() => undefined);
  window.location.reload();
}
