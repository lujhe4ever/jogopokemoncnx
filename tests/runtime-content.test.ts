import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const runtimeFiles = [
  "apps/web/index.html",
  "apps/web/src/audio.ts",
  "apps/web/src/game.ts",
  "apps/web/src/player-state.ts",
  "apps/web/src/styles.css",
  "apps/server/src/game/catalog.ts",
  "content/packs/original-creatures/manifest.json",
  "content/packs/original-vertical-slice/manifest.json",
] as const;

describe("runtime content boundary", () => {
  it("keeps protected franchise identifiers outside the active runtime", async () => {
    const source = (
      await Promise.all(runtimeFiles.map((file) => readFile(file, "utf8")))
    ).join("\n");
    expect(source).not.toMatch(
      /pok[eé]mon|pikachu|bulbasaur|charmander|squirtle/iu,
    );
  });

  it("loads only declared local procedural sources for the vertical slice", async () => {
    const manifest = JSON.parse(
      await readFile(
        "content/packs/original-vertical-slice/manifest.json",
        "utf8",
      ),
    ) as {
      author?: unknown;
      license?: unknown;
      runtimeEnabled?: unknown;
      sources?: Array<{ path?: unknown }>;
    };
    expect(manifest).toMatchObject({
      author: "Projeto LT",
      license: "Original project content",
      runtimeEnabled: true,
    });
    for (const source of manifest.sources ?? []) {
      expect(source.path).toEqual(expect.any(String));
      const path = String(source.path);
      expect(path).not.toMatch(/^(?:https?:|[\\/]|.*\.\.)/u);
      await expect(access(path)).resolves.toBeUndefined();
    }
  });
});
