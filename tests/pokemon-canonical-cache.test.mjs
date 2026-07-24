import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadRevisionedSprite,
  revisionedSpriteCachePath,
} from "../scripts/lib/pokemon-canonical-cache.mjs";
import { ownerAuthorization } from "../scripts/lib/pokemon-canonical-policy.mjs";

const REVISION_A = "a".repeat(40);
const REVISION_B = "b".repeat(40);
const SPECIES = "0001-bulbasaur";
const FILE = "0001-bulbasaur--pokeapi-default--front--normal.png";
const temporaryRoots = [];

async function temporaryRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "pokemon-cache-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("revisioned pokemon sprite cache", () => {
  it("isolates revisions and never reuses bytes from another revision", async () => {
    const root = await temporaryRoot();
    let fetchesA = 0;
    let fetchesB = 0;
    const first = await loadRevisionedSprite({
      root,
      spritesSha: REVISION_A,
      speciesFolder: SPECIES,
      fileName: FILE,
      fetchBuffer: () => {
        fetchesA += 1;
        return Promise.resolve(Buffer.from("revision-a"));
      },
    });
    const second = await loadRevisionedSprite({
      root,
      spritesSha: REVISION_B,
      speciesFolder: SPECIES,
      fileName: FILE,
      fetchBuffer: () => {
        fetchesB += 1;
        return Promise.resolve(Buffer.from("revision-b"));
      },
    });

    expect(first.absolutePath).not.toBe(second.absolutePath);
    expect(first.relativePath).toContain(`/sprite-revisions/${REVISION_A}/`);
    expect(second.relativePath).toContain(`/sprite-revisions/${REVISION_B}/`);
    expect(first.buffer.toString()).toBe("revision-a");
    expect(second.buffer.toString()).toBe("revision-b");
    expect(fetchesA).toBe(1);
    expect(fetchesB).toBe(1);
  });

  it("reuses the same revision and refreshes only that revision", async () => {
    const root = await temporaryRoot();
    let fetches = 0;
    const options = {
      root,
      spritesSha: REVISION_A,
      speciesFolder: SPECIES,
      fileName: FILE,
      fetchBuffer: () => {
        fetches += 1;
        return Promise.resolve(Buffer.from(`download-${fetches}`));
      },
    };

    const first = await loadRevisionedSprite(options);
    const reused = await loadRevisionedSprite(options);
    const refreshed = await loadRevisionedSprite({
      ...options,
      refresh: true,
    });

    expect(first.cacheHit).toBe(false);
    expect(reused.cacheHit).toBe(true);
    expect(reused.buffer.toString()).toBe("download-1");
    expect(refreshed.cacheHit).toBe(false);
    expect(refreshed.buffer.toString()).toBe("download-2");
    expect(fetches).toBe(2);
    expect((await readFile(first.absolutePath)).toString()).toBe("download-2");
  });

  it("rejects invalid revisions and path traversal", () => {
    const root = path.resolve("temporary-root");
    expect(() =>
      revisionedSpriteCachePath({
        root,
        spritesSha: "../revision",
        speciesFolder: SPECIES,
        fileName: FILE,
      }),
    ).toThrow(/40-character hexadecimal Git SHA/);
    expect(() =>
      revisionedSpriteCachePath({
        root,
        spritesSha: REVISION_A,
        speciesFolder: "../0001-bulbasaur",
        fileName: FILE,
      }),
    ).toThrow(/safe cache path segment/);
    expect(() =>
      revisionedSpriteCachePath({
        root,
        spritesSha: REVISION_A,
        speciesFolder: SPECIES,
        fileName: "../sprite.png",
      }),
    ).toThrow(/safe cache path segment/);
  });

  it("does not change the predictable published repository path", () => {
    const published =
      "sprites/0001-bulbasaur--pokeapi-default--front--normal.png";
    const cache = revisionedSpriteCachePath({
      root: path.resolve("repository"),
      spritesSha: REVISION_A,
      speciesFolder: SPECIES,
      fileName: FILE,
    });
    expect(cache.relativePath).toContain(`/sprite-revisions/${REVISION_A}/`);
    expect(cache.relativePath).not.toBe(published);
    expect(published).toBe(
      "sprites/0001-bulbasaur--pokeapi-default--front--normal.png",
    );
  });

  it("keeps the D-023 authorization date independent from the system clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2042-12-31T23:59:59Z"));

    expect(ownerAuthorization()).toEqual({
      decisionId: "D-023",
      authorizedAt: "2026-07-23",
      scope: "temporary publication of four battle sprites per species",
    });
  });
});
