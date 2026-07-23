interface Profile {
  id: string;
  email: string;
  displayName: string;
}

const form = document.querySelector<HTMLFormElement>("#auth-form");
const registerButton = document.querySelector<HTMLButtonElement>("#register");
const status = document.querySelector<HTMLParagraphElement>("#status");
const authPanel = document.querySelector<HTMLElement>("#auth-panel");
const gamePanel = document.querySelector<HTMLElement>("#game-panel");
const startBattleButton =
  document.querySelector<HTMLButtonElement>("#start-battle");

function values() {
  if (!form) throw new Error("Formulário indisponível");
  const data = new FormData(form);
  const text = (key: string) => {
    const value = data.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    displayName: text("displayName"),
    email: text("email"),
    password: text("password"),
  };
}

async function request(path: string, body?: object) {
  const init: RequestInit = {
    method: body ? "POST" : "GET",
    credentials: "include",
  };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return fetch(path, init);
}

async function enterGame(profile: Profile) {
  const response = await request("/api/auth/ws-ticket", {});
  if (!response.ok) throw new Error("Não foi possível abrir a sessão do jogo");
  const payload = (await response.json()) as unknown;
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("ticket" in payload) ||
    typeof payload.ticket !== "string"
  ) {
    throw new Error("Resposta de ticket inválida");
  }
  if (authPanel) authPanel.hidden = true;
  if (gamePanel) gamePanel.hidden = false;
  const { startGame } = await import("./game.js");
  startGame(payload.ticket, profile.id);
}

async function login() {
  const input = values();
  const response = await request("/api/auth/login", {
    email: input.email,
    password: input.password,
  });
  if (!response.ok) throw new Error("E-mail ou senha inválidos");
  const payload = (await response.json()) as { profile: Profile };
  await enterGame(payload.profile);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void login().catch((error: unknown) => {
    if (status)
      status.textContent =
        error instanceof Error ? error.message : "Falha ao entrar";
  });
});

registerButton?.addEventListener("click", () => {
  void (async () => {
    const input = values();
    const response = await request("/api/auth/register", input);
    if (!response.ok && response.status !== 409)
      throw new Error("Não foi possível criar a conta");
    await login();
  })().catch((error: unknown) => {
    if (status)
      status.textContent =
        error instanceof Error ? error.message : "Falha no cadastro";
  });
});

startBattleButton?.addEventListener("click", () => {
  void import("./battle-ui.js").then(({ startBattle }) => {
    return startBattle();
  });
});
