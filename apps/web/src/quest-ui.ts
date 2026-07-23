interface QuestObjective {
  id: string;
  current: number;
  required: number;
}

interface QuestEntry {
  questId: string;
  title: string;
  status: "active" | "completed" | "claimed";
  objectives: QuestObjective[];
  reward: { itemId: string; quantity: number };
}

const objectiveLabels: Record<string, string> = {
  "visit-meadow": "Visite a campina",
  "talk-caretaker": "Converse com a cuidadora",
  "win-battle": "Vença uma batalha",
  "capture-creature": "Capture uma criatura",
};

const itemLabels: Record<string, string> = {
  "item:field-tonic": "Tônico de campo",
};

const gamePanel = document.querySelector<HTMLElement>("#game-panel");
const questPanel = document.querySelector<HTMLElement>("#quest-panel");
const questList = document.querySelector<HTMLElement>("#quest-list");
const questStatus = document.querySelector<HTMLElement>("#quest-status");
const closeButton = document.querySelector<HTMLButtonElement>(
  "#close-quest-journal",
);

function text(element: Element, value: string): void {
  element.append(document.createTextNode(value));
}

function render(entries: QuestEntry[]): void {
  if (!questList) return;
  questList.replaceChildren();
  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = "quest-card";
    const title = document.createElement("h3");
    text(title, entry.title);
    const state = document.createElement("p");
    text(
      state,
      entry.status === "claimed"
        ? "Concluída — recompensa recebida"
        : entry.status === "completed"
          ? "Concluída — recompensa disponível"
          : "Em andamento",
    );
    const objectives = document.createElement("ul");
    for (const objective of entry.objectives) {
      const item = document.createElement("li");
      item.dataset.complete = String(objective.current >= objective.required);
      text(
        item,
        `${objectiveLabels[objective.id] ?? objective.id}: ${String(objective.current)}/${String(objective.required)}`,
      );
      objectives.append(item);
    }
    const reward = document.createElement("p");
    reward.className = "quest-reward";
    text(
      reward,
      `Recompensa: ${String(entry.reward.quantity)}× ${
        itemLabels[entry.reward.itemId] ?? entry.reward.itemId
      }`,
    );
    card.append(title, state, objectives, reward);
    if (entry.status === "completed") {
      const claim = document.createElement("button");
      claim.type = "button";
      text(claim, "Receber recompensa");
      claim.addEventListener("click", () => {
        void claimReward(entry.questId);
      });
      card.append(claim);
    }
    questList.append(card);
  }
}

async function loadJournal(): Promise<void> {
  if (questPanel) questPanel.ariaBusy = "true";
  if (questStatus) questStatus.textContent = "Carregando diário...";
  const response = await fetch("/api/quests", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar as missões");
  const entries = (await response.json()) as QuestEntry[];
  render(entries);
  if (questStatus)
    questStatus.textContent =
      entries.length === 0 ? "Nenhuma missão ativa." : "Diário atualizado.";
  if (questPanel) questPanel.ariaBusy = "false";
}

async function claimReward(questId: string): Promise<void> {
  const response = await fetch(
    `/api/quests/${encodeURIComponent(questId)}/claim`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  if (!response.ok) throw new Error("Não foi possível receber a recompensa");
  await loadJournal();
}

export async function openQuestJournal(): Promise<void> {
  if (gamePanel) gamePanel.hidden = true;
  if (questPanel) questPanel.hidden = false;
  try {
    await loadJournal();
  } catch (error) {
    if (questPanel) questPanel.ariaBusy = "false";
    if (questStatus)
      questStatus.textContent =
        error instanceof Error ? error.message : "Falha ao abrir o diário";
  }
  closeButton?.focus();
}

closeButton?.addEventListener("click", () => {
  if (questPanel) questPanel.hidden = true;
  if (gamePanel) gamePanel.hidden = false;
  document.querySelector<HTMLButtonElement>("#quest-journal-button")?.focus();
});
