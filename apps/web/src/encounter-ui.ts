import { startBattle, type BattleState } from "./battle-ui.js";

interface Encounter {
  id: string;
  battleId: string;
  status: "battling" | "captured" | "escaped";
}

const captureButton =
  document.querySelector<HTMLButtonElement>("#capture-creature");
const status = document.querySelector<HTMLElement>("#battle-status");
let encounter: Encounter | undefined;

async function post(path: string, body?: object) {
  const init: RequestInit = {
    method: "POST",
    credentials: "include",
  };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) throw new Error("Falha no fluxo de encontro");
  return response.json() as Promise<unknown>;
}

function parseEncounter(value: unknown): Encounter {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("battleId" in value) ||
    typeof value.battleId !== "string"
  )
    throw new Error("Encontro inválido");
  return value as Encounter;
}

async function finishBattle(state: BattleState) {
  if (!encounter) return;
  if (state.outcome === "player_win") {
    if (captureButton) captureButton.hidden = false;
    if (status)
      status.textContent =
        "Alvo elegível. Use um Orbe de captura ou retorne ao mundo.";
  } else {
    await post(`/encounters/${encounter.id}/return`);
    if (status)
      status.textContent =
        "O encontro terminou sem captura. Retorno seguro liberado.";
  }
}

export async function startEncounter(authorization: string) {
  encounter = parseEncounter(await post("/encounters", { authorization }));
  await startBattle(encounter.battleId, (state) => {
    void finishBattle(state);
  });
}

captureButton?.addEventListener("click", () => {
  if (!encounter) return;
  captureButton.disabled = true;
  void post(`/encounters/${encounter.id}/capture`, {
    requestId: crypto.randomUUID(),
  })
    .then((value) => {
      const result = value as {
        result?: string;
        capturedCreatureId?: string;
      };
      if (encounter && result.result === "captured")
        encounter.status = "captured";
      else if (encounter && result.result === "escaped")
        encounter.status = "escaped";
      if (status)
        status.textContent =
          result.result === "captured"
            ? "Captura confirmada e adicionada à coleção."
            : result.result === "item_required"
              ? "Você precisa coletar um Orbe de captura."
              : "A criatura escapou. Retorno seguro liberado.";
      captureButton.hidden = result.result !== "item_required";
      captureButton.disabled = false;
    })
    .catch(() => {
      captureButton.disabled = false;
      if (status) status.textContent = "Não foi possível concluir a captura.";
    });
});

document.querySelector("#return-world")?.addEventListener("click", () => {
  if (!encounter || encounter.status !== "battling") return;
  void post(`/encounters/${encounter.id}/return`).then(() => {
    if (encounter) encounter.status = "escaped";
  });
});

window.addEventListener("pagehide", () => {
  if (encounter?.status === "battling")
    navigator.sendBeacon(`/api/encounters/${encounter.id}/return`);
});
