import { playSound } from "./audio.js";

export interface StarterOption {
  definitionId: string;
  name: string;
  affinity: string;
  description: string;
  summary: string;
}

interface InventoryStack {
  itemId: string;
  name: string;
  quantity: number;
}

interface Creature {
  id: string;
  definitionId: string;
  name: string;
  level: number;
  experience: number;
  teamSlot: number | null;
}

interface QuestObjective {
  id: string;
  current: number;
  required: number;
}

interface Quest {
  questId: string;
  title: string;
  status: "active" | "completed" | "claimed";
  objectives: QuestObjective[];
  reward: { itemId: string; quantity: number };
}

export interface GameState {
  profile: {
    displayName: string;
    starterDefinitionId: string | null;
  };
  checkpoint: {
    zoneId: string;
    x: number;
    y: number;
  } | null;
  starterOptions: StarterOption[];
  inventory: InventoryStack[];
  creatures: Creature[];
  quests: Quest[];
}

type PlayerView = "inventory" | "team" | "quests";

const objectiveLabels: Readonly<Record<string, string>> = {
  "talk-caretaker": "Converse com a Cuidadora",
  "visit-meadow": "Atravesse a porta para a campina",
  "win-battle": "Vença o encontro selvagem",
  "capture-creature": "Capture a Folha Noturna",
};

const objectiveOrder = [
  "talk-caretaker",
  "visit-meadow",
  "win-battle",
  "capture-creature",
] as const;

let currentState: GameState | undefined;
let currentView: PlayerView = "inventory";

function element(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}

function creatureSlug(definitionId: string): string {
  return definitionId.split(":").at(-1) ?? "emberbud";
}

async function request(path: string, body?: object): Promise<Response> {
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

export async function fetchGameState(): Promise<GameState> {
  const response = await request("/game/state");
  if (!response.ok) throw new Error("Não foi possível carregar sua jornada.");
  currentState = (await response.json()) as GameState;
  renderPlayerState(currentState);
  return currentState;
}

export async function chooseStarter(definitionId: string): Promise<void> {
  const response = await request("/game/starter", { definitionId });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: unknown;
    };
    throw new Error(
      body.error === "starter_already_selected"
        ? "Esta conta já escolheu um companheiro."
        : "Não foi possível confirmar a escolha.",
    );
  }
  playSound("select");
}

export function renderStarterOptions(
  options: readonly StarterOption[],
  onChoose: (definitionId: string) => Promise<void>,
): void {
  const container = element("#starter-options");
  const status = element("#starter-status");
  if (!container) return;
  container.replaceChildren(
    ...options.map((option, index) => {
      const article = document.createElement("article");
      article.className = "starter-card";
      article.dataset.affinity = option.affinity.toLowerCase();
      const number = document.createElement("span");
      number.className = "starter-number";
      number.textContent = `0${String(index + 1)}`;
      const portrait = document.createElement("div");
      portrait.className = "creature-pixel starter-creature";
      portrait.dataset.creature = creatureSlug(option.definitionId);
      portrait.ariaHidden = "true";
      portrait.append(
        document.createElement("span"),
        document.createElement("i"),
      );
      const affinity = document.createElement("p");
      affinity.className = "affinity";
      affinity.textContent = option.affinity;
      const title = document.createElement("h3");
      title.textContent = option.name;
      const description = document.createElement("p");
      description.textContent = option.description;
      const summary = document.createElement("p");
      summary.className = "starter-summary";
      summary.textContent = option.summary;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-button";
      button.textContent = `Escolher ${option.name}`;
      button.addEventListener("click", () => {
        for (const candidate of container.querySelectorAll("button"))
          candidate.disabled = true;
        if (status)
          status.textContent = `Criando vínculo com ${option.name}...`;
        void onChoose(option.definitionId).catch((error: unknown) => {
          for (const candidate of container.querySelectorAll("button"))
            candidate.disabled = false;
          if (status)
            status.textContent =
              error instanceof Error ? error.message : "Falha na escolha.";
        });
      });
      article.append(
        number,
        portrait,
        affinity,
        title,
        description,
        summary,
        button,
      );
      return article;
    }),
  );
}

function renderPlayerState(state: GameState): void {
  const profileName = element("#profile-name");
  if (profileName) profileName.textContent = state.profile.displayName;
  const companion =
    state.creatures.find(({ teamSlot }) => teamSlot === 1) ??
    state.creatures[0];
  const companionName = element("#hud-creature-name");
  const companionLevel = element("#hud-creature-level");
  const companionSprite = element("#hud-creature-sprite");
  if (companionName) companionName.textContent = companion?.name ?? "—";
  if (companionLevel)
    companionLevel.textContent = companion
      ? `Nível ${String(companion.level)}`
      : "Sem companheiro";
  if (companionSprite && companion)
    companionSprite.dataset.creature = creatureSlug(companion.definitionId);

  const inventoryCount = element("#inventory-count");
  const totalItems = state.inventory.reduce(
    (total, stack) => total + stack.quantity,
    0,
  );
  if (inventoryCount)
    inventoryCount.textContent = `${String(totalItems)} ${totalItems === 1 ? "item" : "itens"}`;
  const teamCount = element("#team-count");
  if (teamCount)
    teamCount.textContent = `${String(state.creatures.filter(({ teamSlot }) => teamSlot !== null).length)}/6`;

  const quest = state.quests[0];
  const objectiveById = new Map(
    quest?.objectives.map((objective) => [objective.id, objective]) ?? [],
  );
  const completed = objectiveOrder.filter((id) => {
    const objective = objectiveById.get(id);
    return objective && objective.current >= objective.required;
  }).length;
  const progressCount = element("#quest-progress-count");
  if (progressCount)
    progressCount.textContent = `${String(completed)}/${String(objectiveOrder.length)}`;
  const steps = element("#journey-steps");
  if (steps) {
    steps.replaceChildren(
      ...objectiveOrder.map((id) => {
        const objective = objectiveById.get(id);
        const done = Boolean(
          objective && objective.current >= objective.required,
        );
        const item = document.createElement("li");
        item.dataset.complete = String(done);
        const marker = document.createElement("span");
        marker.textContent = done
          ? "✓"
          : String(objectiveOrder.indexOf(id) + 1);
        const label = document.createElement("span");
        label.textContent = objectiveLabels[id] ?? id;
        item.append(marker, label);
        return item;
      }),
    );
  }
  const nextObjective = objectiveOrder.find((id) => {
    const objective = objectiveById.get(id);
    return !objective || objective.current < objective.required;
  });
  const objective = element("#world-objective");
  if (objective)
    objective.textContent = nextObjective
      ? (objectiveLabels[nextObjective] ?? nextObjective)
      : "Expedição concluída";

  if (!element("#player-panel")?.hidden) renderView(currentView, state);
}

function inventoryIcon(itemId: string): string {
  if (itemId.includes("capture")) return "◇";
  if (itemId.includes("herb")) return "♧";
  return "+";
}

const itemDescriptions: Readonly<Record<string, string>> = {
  "item:capture-orb": "Estabiliza o vínculo com uma criatura enfraquecida.",
  "item:bright-herb": "Planta rara encontrada nas áreas iluminadas da campina.",
  "item:field-tonic": "Recompensa de expedição preparada pela Cuidadora.",
};

function renderInventory(state: GameState, container: HTMLElement): void {
  const intro = document.createElement("p");
  intro.className = "panel-intro";
  intro.textContent =
    "Itens coletados no mundo ficam associados à sua conta e sobrevivem ao recarregamento.";
  const grid = document.createElement("div");
  grid.className = "inventory-grid";
  if (state.inventory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "A mochila está vazia. Procure brilhos na campina.";
    grid.append(empty);
  }
  for (const stack of state.inventory) {
    const card = document.createElement("article");
    card.className = "inventory-card";
    const icon = document.createElement("span");
    icon.className = "item-icon";
    icon.textContent = inventoryIcon(stack.itemId);
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = stack.name;
    const quantity = document.createElement("small");
    quantity.textContent = `Quantidade: ${String(stack.quantity)}`;
    const description = document.createElement("small");
    description.textContent =
      itemDescriptions[stack.itemId] ?? "Item da jornada.";
    details.append(name, quantity, description);
    card.append(icon, details);
    grid.append(card);
  }
  container.append(intro, grid);
}

function renderTeam(state: GameState, container: HTMLElement): void {
  const intro = document.createElement("p");
  intro.className = "panel-intro";
  intro.textContent =
    "Marque até seis criaturas. A primeira posição representa seu companheiro ativo.";
  const form = document.createElement("form");
  form.className = "team-grid";
  for (const creature of state.creatures) {
    const label = document.createElement("label");
    label.className = "team-card";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "team";
    checkbox.value = creature.id;
    checkbox.checked = creature.teamSlot !== null;
    const portrait = document.createElement("div");
    portrait.className = "creature-pixel team-creature";
    portrait.dataset.creature = creatureSlug(creature.definitionId);
    portrait.ariaHidden = "true";
    portrait.append(
      document.createElement("span"),
      document.createElement("i"),
    );
    const details = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = creature.name;
    const level = document.createElement("small");
    level.textContent = `Nível ${String(creature.level)}${
      creature.teamSlot === null
        ? " · coleção"
        : ` · posição ${String(creature.teamSlot)}`
    }`;
    details.append(name, level);
    label.append(checkbox, portrait, details);
    form.append(label);
  }
  if (state.creatures.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma criatura foi encontrada.";
    form.append(empty);
  } else {
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "primary-button";
    save.textContent = "Salvar equipe";
    form.append(save);
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const ids = [
      ...form.querySelectorAll<HTMLInputElement>('input[name="team"]:checked'),
    ].map(({ value }) => value);
    const status = element("#player-panel-status");
    if (ids.length === 0) {
      if (status) status.textContent = "Mantenha ao menos um companheiro.";
      return;
    }
    if (ids.length > 6) {
      if (status) status.textContent = "A equipe aceita no máximo seis.";
      return;
    }
    void request("/game/team", { creatureIds: ids })
      .then(async (response) => {
        if (!response.ok) throw new Error("Equipe rejeitada.");
        await fetchGameState();
        if (status) status.textContent = "Equipe salva.";
        playSound("select");
      })
      .catch((error: unknown) => {
        if (status)
          status.textContent =
            error instanceof Error ? error.message : "Falha ao salvar.";
      });
  });
  container.append(intro, form);
}

function renderQuests(state: GameState, container: HTMLElement): void {
  for (const quest of state.quests) {
    const card = document.createElement("article");
    card.className = "quest-detail-card";
    const stateLabel = document.createElement("span");
    stateLabel.className = "quest-state";
    stateLabel.textContent =
      quest.status === "claimed"
        ? "Concluída"
        : quest.status === "completed"
          ? "Recompensa disponível"
          : "Em andamento";
    const title = document.createElement("h3");
    title.textContent = quest.title;
    const list = document.createElement("ul");
    for (const objective of objectiveOrder) {
      const progress = quest.objectives.find(({ id }) => id === objective);
      const item = document.createElement("li");
      const done = Boolean(progress && progress.current >= progress.required);
      item.dataset.complete = String(done);
      item.textContent = `${done ? "✓" : "○"} ${
        objectiveLabels[objective] ?? objective
      }`;
      list.append(item);
    }
    const reward = document.createElement("p");
    reward.className = "quest-reward";
    reward.textContent = `Recompensa: ${String(quest.reward.quantity)}× Tônico de campo`;
    card.append(stateLabel, title, list, reward);
    container.append(card);
  }
}

function renderView(view: PlayerView, state: GameState): void {
  currentView = view;
  const content = element("#player-panel-content");
  const title = element("#player-panel-title");
  const labels: Readonly<Record<PlayerView, string>> = {
    inventory: "Inventário",
    team: "Equipe e coleção",
    quests: "Diário de missões",
  };
  if (title) title.textContent = labels[view];
  if (!content) return;
  content.replaceChildren();
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-player-tab]",
  ))
    button.dataset.active = String(button.dataset.playerTab === view);
  if (view === "inventory") renderInventory(state, content);
  else if (view === "team") renderTeam(state, content);
  else renderQuests(state, content);
}

export function openPlayerView(view: PlayerView): void {
  const panel = element("#player-panel");
  if (!panel || !currentState) return;
  panel.hidden = false;
  const status = element("#player-panel-status");
  if (status) status.textContent = "";
  renderView(view, currentState);
  playSound("open");
  element("#close-player-panel")?.focus();
}

function closePlayerPanel(): void {
  const panel = element("#player-panel");
  if (panel) panel.hidden = true;
}

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-open-player-view]",
))
  button.addEventListener("click", () => {
    openPlayerView(button.dataset.openPlayerView as PlayerView);
  });

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-player-tab]",
))
  button.addEventListener("click", () => {
    if (currentState)
      renderView(button.dataset.playerTab as PlayerView, currentState);
  });

element("#close-player-panel")?.addEventListener("click", closePlayerPanel);

window.addEventListener("lt:state-changed", () => {
  window.setTimeout(() => {
    void fetchGameState();
  }, 120);
});
