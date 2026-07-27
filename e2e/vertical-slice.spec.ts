import { expect, test, type Page } from "@playwright/test";

async function move(
  page: Page,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  duration: number,
) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

async function moveTo(
  page: Page,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  axis: "x" | "y",
  target: number,
  direction: "at-most" | "at-least",
) {
  const game = page.locator("#game");
  await expect(game).toHaveAttribute(`data-player-${axis}`, /\d/);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const position = Number(await game.getAttribute(`data-player-${axis}`));
    if (
      (direction === "at-most" && position <= target) ||
      (direction === "at-least" && position >= target)
    )
      return;
    await move(page, key, 180);
    await page.waitForTimeout(70);
  }
  throw new Error(
    `player did not reach ${axis} ${direction} ${String(target)}`,
  );
}

async function moveUntilZone(
  page: Page,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  title: string,
) {
  const zoneTitle = page.locator("#zone-title");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if ((await zoneTitle.textContent()) === title) return;
    await move(page, key, 180);
    await page.waitForTimeout(70);
  }
  await expect(zoneTitle).toHaveText(title);
}

async function interact(page: Page) {
  await page.keyboard.down("e");
  await page.waitForTimeout(120);
  await page.keyboard.up("e");
  await page.waitForTimeout(70);
}

test("completes and persists the first expedition", async ({
  page,
}, testInfo) => {
  const email = `vertical.slice.${String(Date.now())}@example.test`;
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Comece sua jornada" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("00-login.png"),
    fullPage: true,
  });

  await page.getByLabel(/Nome público/).fill("Lia E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/Senha/).fill("jornada-segura-2026");
  await page.getByRole("button", { name: "Criar nova conta" }).click();

  await expect(
    page.getByRole("heading", { name: "Quem caminhará ao seu lado?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Escolher Musgote" }).click();
  await expect(page.locator("#game canvas")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("01-casa-e-jornada.png"),
    fullPage: true,
  });

  await moveTo(page, "ArrowLeft", "x", 270, "at-most");
  await interact(page);
  await expect(page.locator("#interaction-feedback")).toContainText(
    "Cuidadora:",
  );

  await moveTo(page, "ArrowLeft", "x", 230, "at-most");
  await moveTo(page, "ArrowDown", "y", 352, "at-least");
  await moveUntilZone(page, "ArrowRight", "Campina do Luar");
  await expect(page.locator("#zone-title")).toHaveText("Campina do Luar");
  await page.screenshot({
    path: testInfo.outputPath("02-campina-do-luar.png"),
    fullPage: true,
  });

  await moveTo(page, "ArrowDown", "y", 200, "at-least");
  await interact(page);
  await expect(page.locator("#interaction-feedback")).toContainText(
    "Orbe de captura",
  );

  await moveTo(page, "ArrowUp", "y", 190, "at-most");
  await moveTo(page, "ArrowRight", "x", 530, "at-least");
  await moveTo(page, "ArrowUp", "y", 140, "at-most");
  await interact(page);
  await expect(page.locator("#battle-panel")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("03-encontro-selvagem.png"),
    fullPage: true,
  });

  const attack = page.getByRole("button", { name: /Golpe de campo/ });
  const capture = page.getByRole("button", { name: /Usar Orbe de captura/ });
  for (let turn = 0; turn < 12; turn += 1) {
    await expect
      .poll(async () =>
        (await capture.isVisible())
          ? "capture"
          : (await attack.isEnabled())
            ? "attack"
            : "waiting",
      )
      .not.toBe("waiting");
    if (await capture.isVisible()) break;
    await attack.click();
  }
  await expect(capture).toBeVisible();
  await capture.click();
  await expect(page.locator("#battle-status")).toContainText(
    "Captura confirmada",
  );
  await page.screenshot({
    path: testInfo.outputPath("04-captura-confirmada.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Retornar à campina" }).click();

  await page.getByRole("button", { name: /Equipe/ }).click();
  await expect(page.locator("#player-panel-content")).toContainText("Musgote");
  await expect(page.locator("#player-panel-content")).toContainText(
    "Folha Noturna",
  );
  await page.screenshot({
    path: testInfo.outputPath("05-equipe-persistida.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Voltar ao mundo" }).click();

  await page.reload();
  await expect(page.locator("#game canvas")).toBeVisible();
  await page.getByRole("button", { name: /Equipe/ }).click();
  await expect(page.locator("#player-panel-content")).toContainText(
    "Folha Noturna",
  );
  await page.getByRole("button", { name: "Voltar ao mundo" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(
    page.getByRole("heading", { name: "Comece sua jornada" }),
  ).toBeVisible();
});
