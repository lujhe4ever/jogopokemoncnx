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

  await move(page, "ArrowLeft", 520);
  await page.keyboard.press("e");
  await expect(page.locator("#interaction-feedback")).toContainText(
    "Cuidadora:",
  );

  await move(page, "ArrowLeft", 320);
  await move(page, "ArrowDown", 1_450);
  await move(page, "ArrowRight", 900);
  await expect(page.locator("#zone-title")).toHaveText("Campina do Luar");
  await page.screenshot({
    path: testInfo.outputPath("02-campina-do-luar.png"),
    fullPage: true,
  });

  await move(page, "ArrowDown", 1_120);
  await page.keyboard.press("e");
  await expect(page.locator("#interaction-feedback")).toContainText(
    "Orbe de captura",
  );

  await move(page, "ArrowRight", 1_850);
  await move(page, "ArrowUp", 650);
  await page.keyboard.press("e");
  await expect(page.locator("#battle-panel")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("03-encontro-selvagem.png"),
    fullPage: true,
  });

  const attack = page.getByRole("button", { name: /Golpe de campo/ });
  const capture = page.getByRole("button", { name: /Usar Orbe de captura/ });
  for (let turn = 0; turn < 12 && !(await capture.isVisible()); turn += 1) {
    await expect(attack).toBeEnabled();
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
