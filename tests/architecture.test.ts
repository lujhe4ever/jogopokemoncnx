import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const forbiddenInEngine = ["phaser", "fastify", "@prisma/client", "node:"];

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? sourceFiles(fullPath)
        : entry.name.endsWith(".ts")
          ? [fullPath]
          : [];
    }),
  );
  return nested.flat();
}

describe("architecture boundaries", () => {
  it("keeps engine-core independent from frameworks and Node APIs", async () => {
    const files = await sourceFiles("packages/engine-core/src");
    const violations: string[] = [];

    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const dependency of forbiddenInEngine) {
        if (
          content.includes(`"${dependency}`) ||
          content.includes(`'${dependency}`)
        ) {
          violations.push(`${file}: ${dependency}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
