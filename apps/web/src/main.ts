import { soundEnabled, toggleSound } from "./audio.js";
import {
  chooseStarter,
  fetchGameState,
  renderStarterOptions,
  type GameState,
} from "./player-state.js";

interface Profile {
  id: string;
  email: string;
  displayName: string;
}

const form = document.querySelector<HTMLFormElement>("#auth-form");
const registerButton = document.querySelector<HTMLButtonElement>("#register");
const status = document.querySelector<HTMLParagraphElement>("#status");
const authPanel = document.querySelector<HTMLElement>("#auth-panel");
const starterPanel = document.querySelector<HTMLElement>("#starter-panel");
const gamePanel = document.querySelector<HTMLElement>("#game-panel");
const enterArenaButton =
  document.querySelector<HTMLButtonElement>("#enter-arena");
const soundButton = document.querySelector<HTMLButtonElement>("#sound-toggle");
let gameStarted = false;

function setStatus(message: string): void {
  if (status) status.textContent = message;
}

function values() {
  if (!form) throw new Error("Formulário indisponível");
  const data = new FormData(form);
  const text = (key: string) => {
    const value = data.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    displayName: text("displayName").trim(),
    email: text("email").trim(),
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
  return fetch(`/api${path}`, init);
}

function showOnly(panel: "auth" | "starter" | "game"): void {
  if (authPanel) authPanel.hidden = panel !== "auth";
  if (starterPanel) starterPanel.hidden = panel !== "starter";
  if (gamePanel) gamePanel.hidden = panel !== "game";
}

async function launchWorld(profile: Profile): Promise<void> {
  if (gameStarted) {
    showOnly("game");
    return;
  }
  const response = await request("/auth/ws-ticket", {});
  if (!response.ok) throw new Error("Não foi possível abrir o mundo.");
  const payload = (await response.json()) as { ticket?: unknown };
  if (typeof payload.ticket !== "string")
    throw new Error("O servidor retornou um ticket inválido.");
  showOnly("game");
  const { startGame } = await import("./game.js");
  startGame(payload.ticket, profile.id);
  gameStarted = true;
}

async function continueJourney(
  profile: Profile,
  state?: GameState,
): Promise<void> {
  const journey = state ?? (await fetchGameState());
  if (!journey.profile.starterDefinitionId) {
    showOnly("starter");
    renderStarterOptions(journey.starterOptions, async (definitionId) => {
      await chooseStarter(definitionId);
      const updated = await fetchGameState();
      await launchWorld(profile);
      window.dispatchEvent(
        new CustomEvent("lt:starter-selected", { detail: updated }),
      );
    });
    return;
  }
  await launchWorld(profile);
}

async function login(): Promise<void> {
  const input = values();
  setStatus("Entrando...");
  const response = await request("/auth/login", {
    email: input.email,
    password: input.password,
  });
  if (!response.ok) throw new Error("E-mail ou senha inválidos.");
  const payload = (await response.json()) as { profile: Profile };
  await continueJourney(payload.profile);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void login().catch((error: unknown) => {
    setStatus(error instanceof Error ? error.message : "Falha ao entrar.");
  });
});

registerButton?.addEventListener("click", () => {
  void (async () => {
    const input = values();
    if (input.displayName.length < 2)
      throw new Error("Informe um nome público para criar a conta.");
    setStatus("Criando sua conta...");
    const response = await request("/auth/register", input);
    if (!response.ok && response.status !== 409)
      throw new Error("Não foi possível criar a conta.");
    await login();
  })().catch((error: unknown) => {
    setStatus(error instanceof Error ? error.message : "Falha no cadastro.");
  });
});

document.querySelector("#logout")?.addEventListener("click", () => {
  void (async () => {
    await request("/auth/logout", {});
    if (gameStarted) {
      const { stopGame } = await import("./game.js");
      stopGame();
    }
    gameStarted = false;
    for (const panel of document.querySelectorAll<HTMLElement>(
      "#starter-panel, #player-panel, #battle-panel, #arena-panel, #pvp-panel",
    ))
      panel.hidden = true;
    showOnly("auth");
    form?.reset();
    setStatus("Sessão encerrada com segurança.");
  })();
});

soundButton?.addEventListener("click", () => {
  void toggleSound().then((enabled) => {
    soundButton.textContent = `Som: ${enabled ? "ligado" : "desligado"}`;
  });
});

enterArenaButton?.addEventListener("click", () => {
  void import("./arena-ui.js").then(({ openArena }) => openArena("arena-1"));
});

window.addEventListener("lt:encounter", (event) => {
  const detail =
    event instanceof CustomEvent ? (event.detail as unknown) : undefined;
  if (
    typeof detail !== "object" ||
    detail === null ||
    !("authorization" in detail) ||
    typeof detail.authorization !== "string"
  )
    return;
  const authorization = detail.authorization;
  void import("./encounter-ui.js").then(({ startEncounter }) =>
    startEncounter(authorization),
  );
});

window.addEventListener("lt:zone-changed", (event) => {
  const zoneId =
    event instanceof CustomEvent && typeof event.detail === "string"
      ? event.detail
      : "house";
  const title = document.querySelector<HTMLElement>("#zone-title");
  if (title)
    title.textContent =
      zoneId === "meadow" ? "Campina do Luar" : "Casa do Explorador";
});

void (async () => {
  const response = await request("/auth/session");
  if (!response.ok) {
    setStatus("Entre ou crie uma conta para começar.");
    return;
  }
  const payload = (await response.json()) as { profile: Profile };
  setStatus("Sessão encontrada. Retomando a jornada...");
  await continueJourney(payload.profile);
})().catch((error: unknown) => {
  showOnly("auth");
  setStatus(
    error instanceof Error
      ? error.message
      : "Não foi possível retomar a sessão.",
  );
});

if (soundButton)
  soundButton.textContent = `Som: ${soundEnabled() ? "ligado" : "desligado"}`;
