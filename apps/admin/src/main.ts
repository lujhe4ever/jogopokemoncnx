interface SupportProfile {
  supportRef: string;
  displayName: string;
  zoneId: string | null;
  checkpointUpdatedAt: string | null;
  creatureCount: number;
  inventoryStackCount: number;
  questCount: number;
  activeSessionCount: number;
}

const accessForm = document.querySelector<HTMLFormElement>("#access-form");
const stepUpInput = document.querySelector<HTMLInputElement>("#step-up");
const workspace = document.querySelector<HTMLElement>("#admin-workspace");
const status = document.querySelector<HTMLElement>("#admin-status");
const profileForm = document.querySelector<HTMLFormElement>("#profile-form");
const displayName = document.querySelector<HTMLInputElement>("#display-name");
const profileResult = document.querySelector<HTMLElement>("#profile-result");
const profileFields = document.querySelector<HTMLElement>("#profile-fields");
const revokeForm = document.querySelector<HTMLFormElement>("#revoke-form");
const revokeReason = document.querySelector<HTMLInputElement>("#revoke-reason");
const revokeConfirmation = document.querySelector<HTMLInputElement>(
  "#revoke-confirmation",
);
const manifestInput = document.querySelector<HTMLTextAreaElement>("#manifest");
const contentForm = document.querySelector<HTMLFormElement>("#content-form");
const publishConfirmation = document.querySelector<HTMLInputElement>(
  "#publish-confirmation",
);
const contentResult = document.querySelector<HTMLElement>("#content-result");
const auditList = document.querySelector<HTMLOListElement>("#audit-list");
const supportSection = document.querySelector<HTMLElement>("#support-section");
const contentSection = document.querySelector<HTMLElement>("#content-section");
const auditSection = document.querySelector<HTMLElement>("#audit-section");
let stepUp = "";
let currentProfile: SupportProfile | undefined;

function setStatus(message: string): void {
  if (status) status.textContent = message;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-admin-step-up", stepUp);
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "admin_request_failed";
    throw new Error(code);
  }
  return body as T;
}

function renderProfile(profile: SupportProfile): void {
  if (!profileFields || !profileResult) return;
  const values: Array<[string, string]> = [
    ["Nome público", profile.displayName],
    ["Zona", profile.zoneId ?? "Sem checkpoint"],
    ["Criaturas", String(profile.creatureCount)],
    ["Stacks no inventário", String(profile.inventoryStackCount)],
    ["Missões", String(profile.questCount)],
    ["Sessões ativas", String(profile.activeSessionCount)],
  ];
  profileFields.replaceChildren(
    ...values.flatMap(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      return [term, description];
    }),
  );
  profileResult.hidden = false;
}

function manifest(): unknown {
  return JSON.parse(manifestInput?.value ?? "{}") as unknown;
}

accessForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  stepUp = stepUpInput?.value ?? "";
  void api<{ role: string }>("/api/admin/me")
    .then(({ role }) => {
      if (workspace) workspace.hidden = false;
      if (supportSection)
        supportSection.hidden = role !== "SUPPORT" && role !== "OWNER";
      if (contentSection)
        contentSection.hidden = role !== "CONTENT_EDITOR" && role !== "OWNER";
      if (auditSection) auditSection.hidden = role !== "OWNER";
      setStatus(`Acesso elevado com papel ${role}.`);
    })
    .catch((error: unknown) => {
      stepUp = "";
      if (workspace) workspace.hidden = true;
      setStatus(error instanceof Error ? error.message : "Acesso negado.");
    });
});

profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = displayName?.value.trim();
  if (!name) return;
  void api<SupportProfile>(
    `/api/admin/profiles?displayName=${encodeURIComponent(name)}`,
  )
    .then((profile) => {
      currentProfile = profile;
      renderProfile(profile);
      setStatus("Consulta minimizada concluída e auditada.");
    })
    .catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Consulta falhou.");
    });
});

revokeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentProfile) return;
  void api<{ revoked: number }>("/api/admin/sessions/revoke", {
    method: "POST",
    body: JSON.stringify({
      supportRef: currentProfile.supportRef,
      confirmation: revokeConfirmation?.value ?? "",
      reason: revokeReason?.value ?? "",
    }),
  })
    .then(({ revoked }) => {
      setStatus(
        `${String(revoked)} sessão(ões) revogada(s). A conta pode entrar novamente.`,
      );
      if (revokeConfirmation) revokeConfirmation.value = "";
    })
    .catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Revogação falhou.");
    });
});

document.querySelector("#validate-content")?.addEventListener("click", () => {
  try {
    void api<{ valid: boolean; errors: string[] }>(
      "/api/admin/content/validate",
      { method: "POST", body: JSON.stringify(manifest()) },
    )
      .then((result) => {
        if (contentResult)
          contentResult.textContent = JSON.stringify(result, null, 2);
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Validação falhou.");
      });
  } catch {
    setStatus("Manifesto JSON inválido.");
  }
});

contentForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    void api<{ status: string }>("/api/admin/content/publish", {
      method: "POST",
      body: JSON.stringify({
        manifest: manifest(),
        confirmation: publishConfirmation?.value ?? "",
      }),
    })
      .then((result) => {
        if (contentResult)
          contentResult.textContent = JSON.stringify(result, null, 2);
        setStatus("Publicação declarativa concluída e auditada.");
        if (publishConfirmation) publishConfirmation.value = "";
      })
      .catch((error: unknown) => {
        setStatus(
          error instanceof Error ? error.message : "Publicação falhou.",
        );
      });
  } catch {
    setStatus("Manifesto JSON inválido.");
  }
});

document.querySelector("#load-audits")?.addEventListener("click", () => {
  void api<{
    audits: Array<{
      action: string;
      outcome: string;
      createdAt: string;
    }>;
  }>("/api/admin/audits?limit=25")
    .then(({ audits }) => {
      auditList?.replaceChildren(
        ...audits.map((audit) => {
          const item = document.createElement("li");
          item.textContent = `${audit.createdAt} — ${audit.action}: ${audit.outcome}`;
          return item;
        }),
      );
    })
    .catch((error: unknown) => {
      setStatus(
        error instanceof Error ? error.message : "Auditoria indisponível.",
      );
    });
});
