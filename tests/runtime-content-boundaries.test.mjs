import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  RuntimeContentBoundaryError,
  checkRuntimeContentBoundaries,
} from "../scripts/lib/runtime-content-boundary.mjs";

const temporaryRoots = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "runtime-boundary-"));
  temporaryRoots.push(root);
  const manifestPath = path.join(
    root,
    "content",
    "packs",
    "pokemon-canonical",
    "manifest.json",
  );
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      runtimeEnabled: false,
      replacementRequired: true,
      licenseStatus: "doubtful",
      publicationPolicy: "temporary-owner-authorized-reference",
      ownerAuthorization: { decisionId: "D-023" },
    }),
  );
  return { root, manifestPath };
}

async function runtimeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return filePath;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("runtime pokemon content boundary", () => {
  it("passes when runtime contains no prohibited reference", async () => {
    const { root, manifestPath } = await fixture();
    await runtimeFile(
      root,
      "apps/web/src/main.ts",
      "export const ready = true;",
    );
    await expect(
      checkRuntimeContentBoundaries({ root, manifestPath }),
    ).resolves.toMatchObject({ violations: 0 });
  });

  it.each([
    ["static import", `import sprite from "pokemon-canonical/sprite.png";`],
    ["dynamic import", `await import("pokemon-canonical");`],
    ["require", `require("../../content/packs/pokemon-canonical");`],
    [
      "new URL",
      `new URL("../../content/packs/pokemon-canonical/x.png", import.meta.url);`,
    ],
    [
      "Phaser loader",
      `scene.load.image("x", "/content/packs/pokemon-canonical/x.png");`,
    ],
    [
      "physical sprite path",
      `const sprite = "0001-bulbasaur--pokeapi-default--front--normal.png";`,
    ],
    [
      "raw cry URL",
      `const cry = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/1.ogg";`,
    ],
    [
      "remote GIF",
      `const animation = "https://example.test/animations/attack.gif";`,
    ],
  ])("rejects %s and reports file and line", async (_label, source) => {
    const { root, manifestPath } = await fixture();
    await runtimeFile(
      root,
      "apps/web/src/main.ts",
      `const safe = true;\n${source}\n`,
    );
    await expect(
      checkRuntimeContentBoundaries({ root, manifestPath }),
    ).rejects.toMatchObject({
      name: "RuntimeContentBoundaryError",
      violations: [
        expect.objectContaining({
          file: "apps/web/src/main.ts",
          line: 2,
        }),
      ],
    });
  });

  it.each([
    ["HTML", `<img src="/content/packs/pokemon-canonical/x.png">`],
    ["CSS", `.sprite{background:url("/pokemon-canonical/x.png")}`],
  ])("rejects runtime %s references", async (extension, source) => {
    const { root, manifestPath } = await fixture();
    await runtimeFile(
      root,
      `apps/web/src/runtime.${extension.toLowerCase()}`,
      source,
    );
    await expect(
      checkRuntimeContentBoundaries({ root, manifestPath }),
    ).rejects.toBeInstanceOf(RuntimeContentBoundaryError);
  });

  it("ignores documentation, fixtures, and tests outside runtime", async () => {
    const { root, manifestPath } = await fixture();
    await runtimeFile(root, "docs/notes.md", "pokemon-canonical");
    await runtimeFile(root, "apps/web/tests/fixture.ts", "pokemon-canonical");
    await runtimeFile(
      root,
      "packages/core/src/core.test.ts",
      "pokemon-canonical",
    );
    await expect(
      checkRuntimeContentBoundaries({ root, manifestPath }),
    ).resolves.toMatchObject({ violations: 0 });
  });

  it("cannot be bypassed by toggling runtimeEnabled while rights stay doubtful", async () => {
    const { root, manifestPath } = await fixture();
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.runtimeEnabled = true;
    await writeFile(manifestPath, JSON.stringify(manifest));
    await runtimeFile(
      root,
      "packages/core/src/index.ts",
      `export const path = "pokemon-canonical";`,
    );
    await expect(
      checkRuntimeContentBoundaries({ root, manifestPath }),
    ).rejects.toBeInstanceOf(RuntimeContentBoundaryError);
  });

  it("reports a blocked catalog asset with its exact status and policy", async () => {
    const { root, manifestPath } = await fixture();
    await runtimeFile(
      root,
      "content/assets/catalogs/static-sprites.json",
      JSON.stringify({
        assets: [
          {
            assetId: "pokemon:0001:temporary",
            localPath: "content/temporary/0001.png",
            licenseStatus: "doubtful",
            runtimeEnabled: false,
          },
        ],
      }),
    );
    await runtimeFile(
      root,
      "apps/web/src/main.ts",
      `export const asset = "pokemon:0001:temporary";`,
    );

    await expect(
      checkRuntimeContentBoundaries({ root, manifestPath }),
    ).rejects.toMatchObject({
      violations: [
        expect.objectContaining({
          asset: "pokemon:0001:temporary",
          status: "doubtful",
          policy: "asset-runtime-disabled",
        }),
      ],
    });
  });
});
