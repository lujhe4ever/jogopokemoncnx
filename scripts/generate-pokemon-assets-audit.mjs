import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pngjs from "pngjs";

const { PNG } = pngjs;
const ROOT = process.cwd();
const PACK_ROOT = path.join(ROOT, "content", "packs", "pokemon-canonical");
const OUTPUT_ROOT = path.join(ROOT, "docs", "assets");
const CACHE_ROOT = path.join(ROOT, ".cache", "pokemon-assets-audit");
const AUDITED_AT = "2026-07-23";
const POKEAPI_SHA = "091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f";
const SPRITES_SHA = "bf4c47ac82c33b330e33d98b8882d1cedb2f53e7";
const CRIES_SHA = "7ba07038103b3482973fa781e25c09debbaaedd8";
const USER_AGENT = "Projeto-LT-Pokemon-Assets-Audit/1";
const ENGLISH_LANGUAGE_ID = 9;
const CSV_FILES = [
  "ability_names.csv",
  "move_names.csv",
  "pokemon.csv",
  "pokemon_forms.csv",
  "pokemon_species.csv",
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...dataRows] = rows;
  return dataRows
    .filter((values) => values.some((value) => value !== ""))
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [
          header.replace(/\r$/, ""),
          values[index] ?? "",
        ]),
      ),
    );
}

async function fetchText(url) {
  const response = await globalThis.fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await globalThis.fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function cachedText(cacheName, url) {
  const filePath = path.join(CACHE_ROOT, cacheName);
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const text = await fetchText(url);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, "utf8");
  return text;
}

async function cachedJson(cacheName, loader) {
  const filePath = path.join(CACHE_ROOT, cacheName);
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const value = await loader();
  await writeJson(filePath, value);
  return value;
}

async function loadTables() {
  const entries = await Promise.all(
    CSV_FILES.map(async (name) => {
      const url =
        `https://raw.githubusercontent.com/PokeAPI/pokeapi/${POKEAPI_SHA}` +
        `/data/v2/csv/${name}`;
      const text = await cachedText(
        path.join(`pokeapi-${POKEAPI_SHA}`, name),
        url,
      );
      return [name, parseCsv(text)];
    }),
  );
  return Object.fromEntries(entries);
}

async function loadSpriteTree() {
  const existing = path.join(
    ROOT,
    ".cache",
    "pokemon-canonical",
    `sprites-${SPRITES_SHA}`,
    "pokemon-tree.json",
  );
  try {
    return await readJson(existing);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return cachedJson(`sprites-${SPRITES_SHA}-tree.json`, async () => {
    const tree = await fetchJson(
      `https://api.github.com/repos/PokeAPI/sprites/git/trees/${SPRITES_SHA}?recursive=1`,
    );
    if (tree.truncated) throw new Error("PokéAPI sprites tree was truncated");
    return tree.tree
      .filter(
        (entry) =>
          entry.type === "blob" && entry.path.startsWith("sprites/pokemon/"),
      )
      .map((entry) => ({
        ...entry,
        path: entry.path.slice("sprites/pokemon/".length),
      }));
  });
}

async function loadCriesTree() {
  return cachedJson(`cries-${CRIES_SHA}-tree.json`, async () => {
    const tree = await fetchJson(
      `https://api.github.com/repos/PokeAPI/cries/git/trees/${CRIES_SHA}?recursive=1`,
    );
    if (tree.truncated) throw new Error("PokéAPI cries tree was truncated");
    return tree.tree.filter(
      (entry) =>
        entry.type === "blob" &&
        /^cries\/pokemon\/(latest|legacy)\/\d+\.ogg$/.test(entry.path),
    );
  });
}

function integer(value) {
  return value === "" || value === undefined
    ? null
    : Number.parseInt(value, 10);
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("|") : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(row[column])).join(","),
    ),
    "",
  ].join("\n");
}

function mediaTraits(relativePath) {
  const lower = relativePath.toLowerCase();
  const extension = path.extname(lower).slice(1);
  const segments = relativePath.split("/");
  let collection = "pokeapi-default";
  if (segments[0] === "versions") {
    collection = segments.slice(1, -1).join("-");
  } else if (segments[0] === "other") {
    collection = `other-${segments.slice(1, -1).join("-")}`;
  } else if (segments.length > 1) {
    collection = `pokeapi-${segments.slice(0, -1).join("-")}`;
  }
  return {
    animated: extension === "gif" || lower.includes("/animated/"),
    collection: collection.replace(/--+/g, "-").replace(/-$/, ""),
    extension,
    perspective: lower.includes("/back/") ? "back" : "front",
    variation: lower.includes("shiny") ? "shiny" : "normal",
    gender: lower.includes("female") ? "female" : null,
    communityCollection: lower.includes("/showdown/"),
    generationVCommunityContinuation: lower.startsWith(
      "versions/generation-v/black-white",
    ),
  };
}

function visualFamily(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.startsWith("other/home/")) return "home-render";
  if (lower.startsWith("other/official-artwork/")) return "official-artwork";
  if (lower.startsWith("other/dream-world/")) return "dream-world-vector";
  if (lower.startsWith("other/showdown/")) return "showdown-community";
  if (lower.includes("/icons/")) return "icon";
  if (lower.startsWith("versions/generation-i/")) return "generation-i-pixel";
  if (lower.startsWith("versions/generation-ii/")) return "generation-ii-pixel";
  if (lower.startsWith("versions/generation-iii/"))
    return "generation-iii-pixel";
  if (lower.startsWith("versions/generation-iv/")) return "generation-iv-pixel";
  if (lower.startsWith("versions/generation-v/")) return "generation-v-pixel";
  if (lower.startsWith("versions/generation-vi/"))
    return "generation-vi-render";
  if (lower.startsWith("versions/generation-vii/")) {
    return "generation-vii-render";
  }
  if (lower.startsWith("versions/generation-viii/")) {
    return "generation-viii-render";
  }
  if (lower.startsWith("versions/generation-ix/")) {
    return "generation-ix-render";
  }
  return "pokeapi-default-generation-v-style";
}

function compatibilityFor(relativePath) {
  const family = visualFamily(relativePath);
  const scores = {
    "pokeapi-default-generation-v-style": 90,
    "generation-v-pixel": 88,
    "showdown-community": 72,
    "generation-iv-pixel": 68,
    "generation-iii-pixel": 62,
    "generation-ii-pixel": 52,
    "generation-i-pixel": 42,
    "generation-vi-render": 48,
    "generation-vii-render": 48,
    "generation-viii-render": 45,
    "generation-ix-render": 45,
    icon: 25,
    "home-render": 20,
    "official-artwork": 15,
    "dream-world-vector": 10,
  };
  const score = scores[family] ?? 0;
  return {
    family,
    score,
    classification:
      score >= 80
        ? "compatible"
        : score >= 55
          ? "compatible-with-normalization"
          : score >= 30
            ? "restricted-use"
            : "reference-only",
  };
}

function mimeType(extension) {
  return (
    {
      gif: "image/gif",
      png: "image/png",
      svg: "image/svg+xml",
    }[extension] ?? "application/octet-stream"
  );
}

function sourceRegister() {
  const sources = [
    {
      id: "pokeapi-data",
      site: "PokéAPI",
      originalUrl: `https://github.com/PokeAPI/pokeapi/tree/${POKEAPI_SHA}/data/v2/csv`,
      revision: POKEAPI_SHA,
      authorOrMaintainer: "Paul Hallett and PokéAPI contributors",
      category: ["canonical-metadata", "moves", "abilities", "learnsets"],
      assetType: "structured CSV data and English prose",
      generationsOrGames: "Generations 1-9 plus source-defined version groups",
      creditRequirement:
        "Retain the BSD-3-Clause notice and credit PokéAPI contributors.",
      licenseFound: "BSD-3-Clause for the repository",
      limitations:
        "Trademark, character-name, and underlying franchise rights are not granted by the software license.",
      status: "pending",
      allowedUse:
        "audit and canonical reference; runtime adoption needs an explicit baseline decision",
    },
    {
      id: "pokeapi-sprites",
      site: "PokéAPI Sprites",
      originalUrl: `https://github.com/PokeAPI/sprites/tree/${SPRITES_SHA}`,
      revision: SPRITES_SHA,
      authorOrMaintainer:
        "PokéAPI contributors, official-image rippers, Smogon community, and named fan artists by collection",
      category: ["battle-sprites", "icons", "artwork", "animations"],
      assetType: "PNG, SVG, and GIF",
      generationsOrGames:
        "Multiple official generations and community continuations",
      creditRequirement:
        "The source names The Pokémon Company and collection-specific community artists.",
      licenseFound:
        "Repository states CC0 while also stating that image contents are Copyright The Pokémon Company.",
      limitations:
        "The apparent licensor may not control all underlying image rights; no hotlinking or runtime use is approved.",
      status: "doubtful",
      allowedUse:
        "metadata inventory only; four temporary sprites per species remain isolated under D-023",
    },
    {
      id: "pokeapi-cries",
      site: "PokéAPI Cries",
      originalUrl: `https://github.com/PokeAPI/cries/tree/${CRIES_SHA}`,
      revision: CRIES_SHA,
      authorOrMaintainer:
        "PokéAPI maintainers; files sourced from Pokémon Showdown and Veekun",
      category: ["cries", "audio"],
      assetType: "OGG",
      generationsOrGames: "Generations 1-9; latest and legacy sets",
      creditRequirement:
        "The repository names The Pokémon Company as copyright owner.",
      licenseFound:
        "Repository states CC0 while also stating that audio contents are Copyright The Pokémon Company.",
      limitations:
        "The apparent licensor may not control the underlying audio rights; binaries are not approved for import.",
      status: "doubtful",
      allowedUse: "availability inventory only",
    },
    {
      id: "pokemon-official-pokedex",
      site: "The Pokémon Company",
      originalUrl: "https://www.pokemon.com/us/pokedex",
      revision: null,
      authorOrMaintainer: "The Pokémon Company",
      category: ["manual-reference"],
      assetType:
        "official names, descriptions, images, and franchise presentation",
      generationsOrGames: "Current official Pokédex",
      creditRequirement: "No redistribution permission identified.",
      licenseFound: "No reusable asset license identified.",
      limitations:
        "Manual comparison only; do not copy images, audio, or prose.",
      status: "pending",
      allowedUse: "manual reference",
    },
    {
      id: "bulbapedia",
      site: "Bulbapedia",
      originalUrl: "https://bulbapedia.bulbagarden.net/",
      revision: null,
      authorOrMaintainer: "Bulbagarden community",
      category: ["manual-secondary-reference"],
      assetType: "community encyclopedia",
      generationsOrGames: "Multiple games and media",
      creditRequirement: "Site- and page-specific; no asset reuse assumed.",
      licenseFound: "Not evaluated for bulk reuse in this audit.",
      limitations:
        "Manual divergence checks only; never a media import source and no bulk scraping.",
      status: "pending",
      allowedUse: "manual cross-check with recorded divergence",
    },
    {
      id: "serebii",
      site: "Serebii",
      originalUrl: "https://www.serebii.net/",
      revision: null,
      authorOrMaintainer: "Serebii.net",
      category: ["manual-secondary-reference"],
      assetType: "reference website",
      generationsOrGames: "Multiple games",
      creditRequirement: "No redistribution permission identified.",
      licenseFound: "No reusable asset license identified.",
      limitations:
        "Manual divergence checks only; never a media import source and no bulk scraping.",
      status: "pending",
      allowedUse: "manual cross-check with recorded divergence",
    },
    {
      id: "pokemondb",
      site: "Pokémon Database",
      originalUrl: "https://pokemondb.net/",
      revision: null,
      authorOrMaintainer: "Pokémon Database",
      category: ["manual-secondary-reference", "visual-reference"],
      assetType: "reference website",
      generationsOrGames: "Multiple games",
      creditRequirement:
        "The site attributes Pokémon names and images to Nintendo/Game Freak.",
      licenseFound: "No reusable asset license identified.",
      limitations:
        "Manual reference only; no hotlink, bulk scraping, or media import.",
      status: "doubtful",
      allowedUse: "manual cross-check only",
    },
    {
      id: "pokemon-showdown-server",
      site: "Pokémon Showdown",
      originalUrl: `https://github.com/smogon/pokemon-showdown/tree/20ad99ffc9a5a4a4e8fb56ab04ad8e4255b3f2b4`,
      revision: "20ad99ffc9a5a4a4e8fb56ab04ad8e4255b3f2b4",
      authorOrMaintainer: "Smogon and Pokémon Showdown contributors",
      category: ["mechanics-reference", "battle-simulator"],
      assetType: "TypeScript source and structured mechanics data",
      generationsOrGames: "Generations 1-9",
      creditRequirement: "MIT notice for server/simulator code.",
      licenseFound: "MIT for the server repository",
      limitations:
        "The server code license does not grant rights to Pokémon artwork, cries, names, or separately hosted resources.",
      status: "pending",
      allowedUse:
        "independent mechanics cross-check only; no code copied in this audit",
    },
    {
      id: "pokemon-showdown-client-resources",
      site: "Pokémon Showdown Client",
      originalUrl: `https://github.com/smogon/pokemon-showdown-client/tree/2a5133088021c1fe2711a096802896b2055744a3`,
      revision: "2a5133088021c1fe2711a096802896b2055744a3",
      authorOrMaintainer:
        "Pokémon Showdown contributors and individual sprite artists",
      category: ["animations", "sprites", "cries"],
      assetType: "separately hosted GIF/PNG/audio resources",
      generationsOrGames: "Multiple generations and fan continuations",
      creditRequirement:
        "Collection- and artist-specific; permission must be proven.",
      licenseFound:
        "AGPL-3.0 covers client code; the repository expressly excludes /audio and /sprites resources.",
      limitations:
        "Do not infer an asset license from the client or server code license.",
      status: "pending",
      allowedUse: "metadata and provenance investigation only",
    },
    {
      id: "kenney",
      site: "Kenney",
      originalUrl: "https://kenney.nl/assets",
      revision: null,
      authorOrMaintainer: "Kenney",
      category: ["replacement-ui", "generic-effects", "generic-audio"],
      assetType: "game assets with per-pack license files",
      generationsOrGames: "Not Pokémon-specific",
      creditRequirement:
        "Not required for CC0 packs; attribution is recommended.",
      licenseFound: "Kenney states asset-page packs are CC0.",
      limitations:
        "Suitable for generic replacements only; verify each downloaded pack's bundled license.",
      status: "approved",
      allowedUse: "future original-content replacement candidates",
    },
    {
      id: "opengameart",
      site: "OpenGameArt",
      originalUrl: "https://opengameart.org/content/faq",
      revision: null,
      authorOrMaintainer: "Individual uploaders",
      category: ["replacement-sprites", "effects", "audio"],
      assetType: "per-submission assets",
      generationsOrGames: "Not Pokémon-specific",
      creditRequirement: "Varies by CC0, CC-BY, CC-BY-SA, OGA-BY, or GPL.",
      licenseFound: "Per submission; no site-wide approval.",
      limitations:
        "Verify exact uploader, provenance, license version, attribution, share-alike, and DRM implications.",
      status: "pending",
      allowedUse: "discovery only until each asset is reviewed",
    },
    {
      id: "freesound",
      site: "Freesound",
      originalUrl: "https://freesound.org/help/faq/#licenses",
      revision: null,
      authorOrMaintainer: "Individual uploaders",
      category: ["replacement-audio"],
      assetType: "audio under per-file Creative Commons terms",
      generationsOrGames: "Not Pokémon-specific",
      creditRequirement: "Varies: CC0, CC-BY, or CC-BY-NC.",
      licenseFound: "Per file; CC0 and CC-BY are potential candidates.",
      limitations:
        "Avoid NC for a durable commercial-capable project; verify that the uploader created or lawfully recorded the sound.",
      status: "pending",
      allowedUse: "discovery only until each sound is reviewed",
    },
    {
      id: "itch-game-assets",
      site: "itch.io Game Assets",
      originalUrl: "https://itch.io/game-assets",
      revision: null,
      authorOrMaintainer: "Individual publishers",
      category: ["replacement-sprites", "effects", "audio", "ui"],
      assetType: "per-package game assets",
      generationsOrGames: "Not Pokémon-specific",
      creditRequirement: "Defined by each package and purchase receipt.",
      licenseFound: "No platform-wide asset license.",
      limitations:
        "Record package page, author, exact license, receipt, modification, redistribution, and attribution terms.",
      status: "pending",
      allowedUse: "discovery only until each package is reviewed",
    },
    {
      id: "phaser-audio-docs",
      site: "Phaser",
      originalUrl: "https://docs.phaser.io/phaser/concepts/audio",
      revision: "3.90.0 project baseline",
      authorOrMaintainer: "Phaser",
      category: ["technical-compatibility"],
      assetType: "audio loader and Sound Manager documentation",
      generationsOrGames: "Browser runtime",
      creditRequirement: "Documentation reference only.",
      licenseFound: "Not an asset source.",
      limitations: "Does not supply media rights.",
      status: "approved",
      allowedUse: "technical planning",
    },
  ];
  return {
    schemaVersion: 1,
    auditedAt: AUDITED_AT,
    policy:
      "Registration is not approval. A source is usable only when the exact asset has proven provenance and redistribution rights.",
    sources: sources.map((source) => ({
      sourceId: source.id,
      name: source.site,
      url: source.originalUrl,
      owner: source.authorOrMaintainer,
      maintainer: source.authorOrMaintainer,
      type: source.assetType,
      scope: source.category,
      generationsOrGames: source.generationsOrGames,
      revision: source.revision,
      commitSha:
        typeof source.revision === "string" &&
        /^[0-9a-f]{40}$/.test(source.revision)
          ? source.revision
          : null,
      consultedAt: AUDITED_AT,
      declaredLicense: source.licenseFound,
      declaredOwnership: source.creditRequirement,
      knownConflict: source.limitations,
      attributionRequired: source.creditRequirement,
      modificationAllowed:
        source.status === "approved" ? "yes-with-exact-license" : "unconfirmed",
      redistributionAllowed:
        source.status === "approved" ? "yes-with-exact-license" : "unconfirmed",
      commercialUseAllowed:
        source.id === "kenney"
          ? "yes-for-verified-CC0-packs"
          : source.id === "pokeapi-data"
            ? "software-license-allows; underlying-IP-unresolved"
            : "unconfirmed",
      legalStatus: source.status,
      evidence: [source.originalUrl],
      recommendation: source.allowedUse,
      relatedDecision: source.id === "pokeapi-sprites" ? "D-023" : null,
    })),
  };
}

function proposedAssetSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/lujhe4ever/jogopokemoncnx/docs/assets/proposed-asset-schema.json",
    title: "Proposed replaceable creature asset manifest",
    description:
      "Proposal only. Logical asset IDs remain stable while source files and rights records can be replaced.",
    type: "object",
    required: [
      "schemaVersion",
      "creatureId",
      "assetSetId",
      "runtimeEnabled",
      "assets",
    ],
    properties: {
      schemaVersion: { const: 1 },
      creatureId: { type: "string", pattern: "^creature:[a-z0-9-]+$" },
      canonicalReference: {
        type: ["object", "null"],
        properties: {
          nationalDexNumber: { type: "integer", minimum: 1 },
          pokemonId: { type: "integer", minimum: 1 },
          formSlug: { type: ["string", "null"] },
        },
        required: ["nationalDexNumber", "pokemonId", "formSlug"],
        additionalProperties: false,
      },
      assetSetId: { type: "string", pattern: "^[a-z0-9-]+:[a-z0-9-]+$" },
      runtimeEnabled: { type: "boolean" },
      assets: {
        type: "array",
        items: { $ref: "#/$defs/asset" },
      },
    },
    additionalProperties: false,
    $defs: {
      status: {
        enum: ["approved", "pending", "doubtful", "rejected", "quarantined"],
      },
      asset: {
        type: "object",
        required: [
          "logicalId",
          "kind",
          "variant",
          "files",
          "provenance",
          "approval",
        ],
        properties: {
          logicalId: {
            type: "string",
            pattern: "^[a-z0-9-]+:[a-z0-9-]+(?:[.:][a-z0-9-]+)*$",
          },
          kind: {
            enum: [
              "battle-sprite",
              "overworld-sprite",
              "portrait",
              "icon",
              "animation",
              "cry",
              "sound-effect",
            ],
          },
          variant: {
            type: "object",
            required: ["perspective", "palette", "animation"],
            properties: {
              perspective: {
                enum: ["front", "back", "side", "overworld", "not-applicable"],
              },
              palette: { enum: ["normal", "shiny", "project-original"] },
              form: { type: ["string", "null"] },
              gender: { enum: ["male", "female", "neutral", "not-applicable"] },
              animation: { type: ["string", "null"] },
            },
            additionalProperties: false,
          },
          files: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["path", "format", "sha256", "bytes"],
              properties: {
                path: {
                  type: "string",
                  pattern: "^[a-zA-Z0-9_./-]+\\.(png|webp|ogg|mp3)$",
                },
                format: { enum: ["png", "webp", "ogg", "mp3"] },
                role: { enum: ["primary", "fallback"] },
                sha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
                bytes: { type: "integer", minimum: 1 },
                width: { type: "integer", minimum: 1 },
                height: { type: "integer", minimum: 1 },
                frameCount: { type: "integer", minimum: 1 },
                durationMs: { type: "integer", minimum: 1 },
              },
              additionalProperties: false,
            },
          },
          provenance: {
            type: "object",
            required: [
              "sourceUrl",
              "sourceRevision",
              "creator",
              "licenseSpdx",
              "licenseEvidenceUrl",
              "requiredCredit",
            ],
            properties: {
              sourceUrl: { type: "string", format: "uri" },
              sourceRevision: { type: ["string", "null"] },
              creator: { type: "string", minLength: 1 },
              licenseSpdx: { type: ["string", "null"] },
              licenseEvidenceUrl: { type: ["string", "null"], format: "uri" },
              requiredCredit: { type: ["string", "null"] },
              derivativeOf: { type: ["string", "null"] },
            },
            additionalProperties: false,
          },
          approval: {
            type: "object",
            required: ["status", "reviewedAt", "reviewedBy", "runtimeAllowed"],
            properties: {
              status: { $ref: "#/$defs/status" },
              reviewedAt: { type: ["string", "null"], format: "date" },
              reviewedBy: { type: ["string", "null"] },
              runtimeAllowed: { type: "boolean" },
              decisionId: { type: ["string", "null"] },
              replacementForLogicalId: { type: ["string", "null"] },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  };
}

async function auditDefinitions(manifest, tables) {
  const movesCatalog = await readJson(
    path.join(PACK_ROOT, "catalogs", "moves.json"),
  );
  const abilitiesCatalog = await readJson(
    path.join(PACK_ROOT, "catalogs", "abilities.json"),
  );
  const versionGroups = await readJson(
    path.join(PACK_ROOT, "catalogs", "version-groups.json"),
  );
  const moveMethods = await readJson(
    path.join(PACK_ROOT, "catalogs", "move-methods.json"),
  );
  const moveIds = new Set(movesCatalog.moves.map((move) => move.id));
  const abilityIds = new Set(
    abilitiesCatalog.abilities.map((ability) => ability.id),
  );
  const versionGroupIds = new Set(
    versionGroups.versionGroups.map((group) => group.id),
  );
  const methodIds = new Set(moveMethods.methods.map((method) => method.id));
  const metrics = {
    speciesDefinitions: 0,
    approvedStatusFiles: 0,
    sourceRevisionMatches: 0,
    sixStatDefinitions: 0,
    definitionsWithUnknownType: 0,
    abilityAssignments: 0,
    hiddenAbilityAssignments: 0,
    learnsetMoveReferences: 0,
    learnMethodTuples: 0,
    machineTuples: 0,
    machineMethodsWithoutMachineRecord: 0,
    invalidMoveReferences: 0,
    invalidAbilityReferences: 0,
    invalidVersionGroupReferences: 0,
    invalidMethodReferences: 0,
    duplicateMoveReferencesWithinDefinition: 0,
    definitionsWithoutMoves: 0,
    evolutionEdges: 0,
    invalidEvolutionSpeciesReferences: 0,
  };
  const methodFrequency = {};
  const generationFrequency = {};
  for (const creature of manifest.creatures) {
    const definitionRoot = path.join(PACK_ROOT, creature.path, "definitions");
    const [pokemon, abilities, moves, status] = await Promise.all([
      readJson(path.join(definitionRoot, "pokemon.json")),
      readJson(path.join(definitionRoot, "abilities.json")),
      readJson(path.join(definitionRoot, "moves.json")),
      readJson(path.join(definitionRoot, "status.json")),
    ]);
    metrics.speciesDefinitions += 1;
    increment(generationFrequency, pokemon.generationIntroduced);
    if (status.status === "approved") metrics.approvedStatusFiles += 1;
    if (
      pokemon.source.sourceRevision === POKEAPI_SHA &&
      abilities.source.sourceRevision === POKEAPI_SHA &&
      moves.source.sourceRevision === POKEAPI_SHA &&
      status.sourceRevision === POKEAPI_SHA
    ) {
      metrics.sourceRevisionMatches += 1;
    }
    if (Object.keys(pokemon.baseStats).length === 6) {
      metrics.sixStatDefinitions += 1;
    }
    if (pokemon.types.includes("unknown"))
      metrics.definitionsWithUnknownType += 1;
    for (const evolution of pokemon.evolution.evolvesTo) {
      metrics.evolutionEdges += 1;
      if (
        !Number.isInteger(evolution.toSpeciesId) ||
        evolution.toSpeciesId < 1 ||
        evolution.toSpeciesId > manifest.creatures.length
      ) {
        metrics.invalidEvolutionSpeciesReferences += 1;
      }
    }
    metrics.abilityAssignments += abilities.abilities.length;
    metrics.hiddenAbilityAssignments += abilities.abilities.filter(
      (ability) => ability.isHidden,
    ).length;
    for (const ability of abilities.abilities) {
      if (!abilityIds.has(ability.abilityId))
        metrics.invalidAbilityReferences += 1;
    }
    if (moves.moves.length === 0) metrics.definitionsWithoutMoves += 1;
    const localMoveIds = new Set();
    for (const [moveId, methods] of moves.moves) {
      metrics.learnsetMoveReferences += 1;
      if (localMoveIds.has(moveId)) {
        metrics.duplicateMoveReferencesWithinDefinition += 1;
      }
      localMoveIds.add(moveId);
      if (!moveIds.has(moveId)) metrics.invalidMoveReferences += 1;
      for (const [versionGroupId, methodId, , , , machines] of methods) {
        metrics.learnMethodTuples += 1;
        increment(methodFrequency, methodId);
        if (!versionGroupIds.has(versionGroupId)) {
          metrics.invalidVersionGroupReferences += 1;
        }
        if (!methodIds.has(methodId)) metrics.invalidMethodReferences += 1;
        metrics.machineTuples += machines.length;
        if (methodId === 4 && machines.length === 0) {
          metrics.machineMethodsWithoutMachineRecord += 1;
        }
      }
    }
  }
  const englishMoveNames = new Map(
    tables["move_names.csv"]
      .filter((row) => integer(row.local_language_id) === ENGLISH_LANGUAGE_ID)
      .map((row) => [integer(row.move_id), row.name]),
  );
  const englishAbilityNames = new Map(
    tables["ability_names.csv"]
      .filter((row) => integer(row.local_language_id) === ENGLISH_LANGUAGE_ID)
      .map((row) => [integer(row.ability_id), row.name]),
  );
  const moveNameMismatches = movesCatalog.moves
    .filter(
      (move) =>
        englishMoveNames.has(move.id) &&
        englishMoveNames.get(move.id) !== move.canonicalName,
    )
    .map((move) => ({
      id: move.id,
      slug: move.slug,
      generatedName: move.canonicalName,
      sourceEnglishName: englishMoveNames.get(move.id),
    }));
  const abilityNameMismatches = abilitiesCatalog.abilities
    .filter(
      (ability) =>
        englishAbilityNames.has(ability.id) &&
        englishAbilityNames.get(ability.id) !== ability.canonicalName,
    )
    .map((ability) => ({
      id: ability.id,
      slug: ability.slug,
      generatedName: ability.canonicalName,
      sourceEnglishName: englishAbilityNames.get(ability.id),
    }));
  return {
    metrics,
    methodFrequency,
    generationFrequency,
    catalogs: {
      moveCount: movesCatalog.moves.length,
      abilityCount: abilitiesCatalog.abilities.length,
      versionGroupCount: versionGroups.versionGroups.length,
      moveMethodCount: moveMethods.methods.length,
      moveIdsUnique: moveIds.size === movesCatalog.moves.length,
      abilityIdsUnique: abilityIds.size === abilitiesCatalog.abilities.length,
      movesWithUnknownType: movesCatalog.moves.filter(
        (move) => move.type === "unknown",
      ).length,
      movesWithUnknownCategory: movesCatalog.moves.filter(
        (move) => move.category === "unknown",
      ).length,
      movesWithoutEnglishEffect: movesCatalog.moves.filter(
        (move) => move.effect === "No English effect text available.",
      ).length,
      abilitiesWithoutEnglishEffect: abilitiesCatalog.abilities.filter(
        (ability) => ability.effect === "No English effect text available.",
      ).length,
      movesWithNullPower: movesCatalog.moves.filter(
        (move) => move.power === null,
      ).length,
      movesWithNullAccuracy: movesCatalog.moves.filter(
        (move) => move.accuracy === null,
      ).length,
      movesWithNullPp: movesCatalog.moves.filter((move) => move.pp === null)
        .length,
      moveNameMismatchCount: moveNameMismatches.length,
      abilityNameMismatchCount: abilityNameMismatches.length,
    },
    moveNameMismatches,
    abilityNameMismatches,
  };
}

async function inspectPublishedSprites(manifest) {
  const dimensions = {};
  const dimensionsByVariant = {};
  const hashes = new Map();
  let count = 0;
  let bytes = 0;
  let transparent = 0;
  let empty = 0;
  let touchesCanvasEdge = 0;
  let occupiedRatioSum = 0;
  let occupiedRatioMin = 1;
  let occupiedRatioMax = 0;
  for (const creature of manifest.creatures) {
    const inventory = await readJson(
      path.join(PACK_ROOT, creature.path, "sprites", "inventory.json"),
    );
    for (const entry of inventory.entries.filter(
      (item) => item.repositoryAsset,
    )) {
      const asset = entry.repositoryAsset;
      const filePath = path.join(
        PACK_ROOT,
        creature.path,
        asset.repositoryPath,
      );
      const buffer = await readFile(filePath);
      const image = PNG.sync.read(buffer);
      const actualSha = createHash("sha256").update(buffer).digest("hex");
      if (actualSha !== asset.sha256) {
        throw new Error(`Published sprite hash mismatch: ${filePath}`);
      }
      count += 1;
      bytes += buffer.length;
      if (asset.hasTransparency) transparent += 1;
      const dimension = `${image.width}x${image.height}`;
      increment(dimensions, dimension);
      dimensionsByVariant[asset.variantId] ??= {};
      increment(dimensionsByVariant[asset.variantId], dimension);
      hashes.set(actualSha, (hashes.get(actualSha) ?? 0) + 1);
      let minX = image.width;
      let minY = image.height;
      let maxX = -1;
      let maxY = -1;
      let occupied = 0;
      for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
        if (image.data[pixel * 4 + 3] === 0) continue;
        const x = pixel % image.width;
        const y = Math.floor(pixel / image.width);
        occupied += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (occupied === 0) {
        empty += 1;
        continue;
      }
      if (
        minX === 0 ||
        minY === 0 ||
        maxX === image.width - 1 ||
        maxY === image.height - 1
      ) {
        touchesCanvasEdge += 1;
      }
      const ratio = occupied / (image.width * image.height);
      occupiedRatioSum += ratio;
      occupiedRatioMin = Math.min(occupiedRatioMin, ratio);
      occupiedRatioMax = Math.max(occupiedRatioMax, ratio);
    }
  }
  return {
    count,
    bytes,
    transparent,
    empty,
    dimensions,
    dimensionsByVariant,
    uniqueContentHashes: hashes.size,
    duplicateAssetInstances: [...hashes.values()].reduce(
      (sum, instances) => sum + Math.max(0, instances - 1),
      0,
    ),
    touchesCanvasEdge,
    occupiedPixelRatio: {
      minimum: Number(occupiedRatioMin.toFixed(6)),
      average: Number((occupiedRatioSum / (count - empty)).toFixed(6)),
      maximum: Number(occupiedRatioMax.toFixed(6)),
    },
  };
}

async function main() {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const [manifest, tables, spriteTree, criesTree] = await Promise.all([
    readJson(path.join(PACK_ROOT, "manifest.json")),
    loadTables(),
    loadSpriteTree(),
    loadCriesTree(),
  ]);
  if (manifest.source.sourceRevision !== POKEAPI_SHA) {
    throw new Error("Pack data revision differs from the audit revision");
  }
  if (manifest.spriteSource.sourceRevision !== SPRITES_SHA) {
    throw new Error("Pack sprite revision differs from the audit revision");
  }

  const speciesRows = tables["pokemon_species.csv"]
    .filter((row) => integer(row.id) <= 1025)
    .sort((left, right) => integer(left.id) - integer(right.id));
  const speciesById = new Map(speciesRows.map((row) => [integer(row.id), row]));
  const pokemonRows = tables["pokemon.csv"]
    .filter((row) => speciesById.has(integer(row.species_id)))
    .sort((left, right) => integer(left.id) - integer(right.id));
  const pokemonById = new Map(pokemonRows.map((row) => [integer(row.id), row]));
  const pokemonBySlug = new Map(
    pokemonRows.map((row) => [row.identifier, row]),
  );
  const forms = tables["pokemon_forms.csv"].filter((row) =>
    pokemonById.has(integer(row.pokemon_id)),
  );
  const formsByPokemonId = new Map();
  for (const form of forms) {
    const pokemonId = integer(form.pokemon_id);
    const entries = formsByPokemonId.get(pokemonId) ?? [];
    entries.push(form);
    formsByPokemonId.set(pokemonId, entries);
  }
  const mediaByPokemonId = new Map();
  let unmappedPokemonMedia = 0;
  const unmappedPokemonMediaPaths = [];
  for (const entry of spriteTree) {
    const baseName = path.basename(entry.path, path.extname(entry.path));
    const numeric = /^(\d+)(?:-|$)/.exec(baseName);
    const pokemon =
      (numeric && pokemonById.get(Number.parseInt(numeric[1], 10))) ||
      pokemonBySlug.get(baseName);
    if (!pokemon) {
      unmappedPokemonMedia += 1;
      unmappedPokemonMediaPaths.push(entry.path);
      continue;
    }
    const pokemonId = integer(pokemon.id);
    const entries = mediaByPokemonId.get(pokemonId) ?? [];
    const traits = mediaTraits(entry.path);
    entries.push({
      ...entry,
      ...traits,
      provenanceClass:
        traits.communityCollection ||
        (traits.generationVCommunityContinuation &&
          integer(pokemon.species_id) > 649)
          ? "community-or-fan-derived"
          : "official-image-or-derivative",
    });
    mediaByPokemonId.set(pokemonId, entries);
  }
  const criesByPokemonId = new Map();
  for (const entry of criesTree) {
    const match = /^cries\/pokemon\/(latest|legacy)\/(\d+)\.ogg$/.exec(
      entry.path,
    );
    if (!match) continue;
    const pokemonId = Number.parseInt(match[2], 10);
    const sets = criesByPokemonId.get(pokemonId) ?? {};
    sets[match[1]] = {
      path: entry.path,
      bytes: entry.size,
      gitBlobSha: entry.sha,
    };
    criesByPokemonId.set(pokemonId, sets);
  }

  const packCreatureByDex = new Map(
    manifest.creatures.map((creature) => [
      creature.nationalDexNumber,
      creature,
    ]),
  );
  const entitySpriteRows = [];
  const entityAudioRows = [];
  const spriteCandidateRows = [];
  const audioCandidateRows = [];
  const gapEntities = [];
  for (const pokemon of pokemonRows) {
    const pokemonId = integer(pokemon.id);
    const speciesId = integer(pokemon.species_id);
    const species = speciesById.get(speciesId);
    const isDefault = pokemon.is_default === "1";
    const media = mediaByPokemonId.get(pokemonId) ?? [];
    const staticMedia = media.filter((entry) => !entry.animated);
    const animatedMedia = media.filter((entry) => entry.animated);
    const staticSlot = (perspective, variation) =>
      staticMedia.filter(
        (entry) =>
          entry.perspective === perspective && entry.variation === variation,
      ).length;
    const animatedSlot = (perspective, variation) =>
      animatedMedia.filter(
        (entry) =>
          entry.perspective === perspective && entry.variation === variation,
      ).length;
    const formRows = formsByPokemonId.get(pokemonId) ?? [];
    const creature = isDefault ? packCreatureByDex.get(speciesId) : undefined;
    let published = [];
    const publishedBySourcePath = new Map();
    if (creature) {
      const inventory = await readJson(
        path.join(PACK_ROOT, creature.path, "sprites", "inventory.json"),
      );
      const publishedEntries = inventory.entries.filter(
        (entry) => entry.repositoryAsset,
      );
      published = publishedEntries.map(
        (entry) => entry.repositoryAsset.variantId,
      );
      for (const entry of publishedEntries) {
        publishedBySourcePath.set(
          entry.sourceRepositoryPath,
          entry.repositoryAsset,
        );
      }
    }
    const rightsClasses = new Set(media.map((entry) => entry.provenanceClass));
    const cries = criesByPokemonId.get(pokemonId) ?? {};
    const common = {
      entity_id: `pokemon-form:${String(speciesId).padStart(4, "0")}:${pokemon.identifier}`,
      pokemon_id: pokemonId,
      species_id: speciesId,
      national_dex_number: speciesId,
      species_slug: species.identifier,
      pokemon_slug: pokemon.identifier,
      entity_kind: isDefault ? "default-pokemon" : "alternate-pokemon",
      is_default: isDefault,
      form_record_count: formRows.length,
      form_ids: formRows.map((form) => form.id),
      form_identifiers: formRows.map((form) => form.identifier),
      battle_only_form_count: formRows.filter(
        (form) => form.is_battle_only === "1",
      ).length,
      is_regional_form: /-(alola|galar|hisui|paldea)n?$/.test(
        pokemon.identifier,
      ),
      is_mega:
        pokemon.identifier.includes("-mega") ||
        formRows.some((form) => form.is_mega === "1"),
      is_gigantamax: pokemon.identifier.includes("-gmax"),
    };
    const spriteRow = {
      ...common,
      static_candidate_count: staticMedia.length,
      animation_candidate_count: animatedMedia.length,
      front_normal_static_count: staticSlot("front", "normal"),
      front_shiny_static_count: staticSlot("front", "shiny"),
      back_normal_static_count: staticSlot("back", "normal"),
      back_shiny_static_count: staticSlot("back", "shiny"),
      front_normal_animation_count: animatedSlot("front", "normal"),
      front_shiny_animation_count: animatedSlot("front", "shiny"),
      back_normal_animation_count: animatedSlot("back", "normal"),
      back_shiny_animation_count: animatedSlot("back", "shiny"),
      female_static_count: staticMedia.filter(
        (entry) => entry.gender === "female",
      ).length,
      published_temporary_count: published.length,
      published_variants: published.sort(),
      source_revision: SPRITES_SHA,
      rights_status:
        media.length === 0
          ? "pending"
          : rightsClasses.size > 1
            ? "mixed-pending-doubtful"
            : rightsClasses.has("community-or-fan-derived")
              ? "pending"
              : "doubtful",
      runtime_status: "blocked",
    };
    entitySpriteRows.push(spriteRow);
    entityAudioRows.push({
      ...common,
      latest_available: Boolean(cries.latest),
      latest_bytes: cries.latest?.bytes ?? null,
      latest_git_blob_sha: cries.latest?.gitBlobSha ?? null,
      legacy_available: Boolean(cries.legacy),
      legacy_bytes: cries.legacy?.bytes ?? null,
      legacy_git_blob_sha: cries.legacy?.gitBlobSha ?? null,
      imported_count: 0,
      source_revision: CRIES_SHA,
      rights_status: cries.latest || cries.legacy ? "doubtful" : "pending",
      runtime_status: "blocked",
    });
    for (const entry of media) {
      const sourceRepositoryPath = `sprites/pokemon/${entry.path}`;
      const publishedAsset = publishedBySourcePath.get(sourceRepositoryPath);
      const compatibility = compatibilityFor(entry.path);
      const community = entry.provenanceClass === "community-or-fan-derived";
      const generationMatch = /^versions\/(generation-[^/]+)\//.exec(
        entry.path,
      );
      spriteCandidateRows.push({
        candidate_id: entry.sha,
        ...common,
        category: entry.animated ? "animation" : "sprite",
        collection: entry.collection,
        visual_family: compatibility.family,
        visual_generation: generationMatch?.[1] ?? null,
        game_or_set: entry.collection,
        perspective: entry.perspective,
        variation: entry.variation,
        gender: entry.gender ?? "unspecified",
        animated: entry.animated,
        extension: entry.extension,
        mime_type: mimeType(entry.extension),
        width: publishedAsset?.width ?? null,
        height: publishedAsset?.height ?? null,
        bytes: entry.size,
        has_transparency: publishedAsset?.hasTransparency ?? null,
        frame_count: publishedAsset?.frameCount ?? (entry.animated ? null : 1),
        duration_ms: null,
        frame_speed_ms: null,
        loop: entry.animated ? "unknown" : false,
        sha256: publishedAsset?.sha256 ?? null,
        source_id: "pokeapi-sprites",
        source_path: sourceRepositoryPath,
        artist_or_ripper_status: "unresolved",
        rights_policy_id: community
          ? "community-collection-specific"
          : "official-image-rights-unclear",
        legal_status: community ? "pending" : "doubtful",
        legal_confidence: "low",
        compatibility_score: compatibility.score,
        compatibility_class: compatibility.classification,
        published_temporary: Boolean(publishedAsset),
        runtime_status: "blocked",
        recommendation: publishedAsset ? "replace-d023" : "reference-only",
      });
    }
    for (const set of ["latest", "legacy"]) {
      const cry = cries[set];
      if (!cry) continue;
      audioCandidateRows.push({
        candidate_id: cry.gitBlobSha,
        ...common,
        set,
        extension: "ogg",
        mime_type: "audio/ogg",
        bytes: cry.bytes,
        duration_ms: null,
        channels: null,
        sample_rate_hz: null,
        leading_silence_ms: null,
        trailing_silence_ms: null,
        sha256: null,
        source_git_blob_sha: cry.gitBlobSha,
        source_path: cry.path,
        source_url: `https://github.com/PokeAPI/cries/blob/${CRIES_SHA}/${cry.path}`,
        source_repository: "PokeAPI/cries",
        source_revision: CRIES_SHA,
        declared_origin: "Pokémon Showdown and Veekun",
        declared_license: "CC0 repository declaration",
        declared_ownership:
          "The source states that audio contents are Copyright The Pokémon Company.",
        legal_status: "doubtful",
        legal_confidence: "low",
        imported: false,
        runtime_status: "blocked",
        recommendation: "availability reference only; do not import",
      });
    }
    const missing = [];
    for (const [slot, count] of [
      ["battle-front-normal-static", spriteRow.front_normal_static_count],
      ["battle-front-shiny-static", spriteRow.front_shiny_static_count],
      ["battle-back-normal-static", spriteRow.back_normal_static_count],
      ["battle-back-shiny-static", spriteRow.back_shiny_static_count],
      ["battle-front-normal-animation", spriteRow.front_normal_animation_count],
      ["battle-back-normal-animation", spriteRow.back_normal_animation_count],
      ["cry-latest", cries.latest ? 1 : 0],
    ]) {
      if (count === 0) missing.push(slot);
    }
    gapEntities.push({
      entityId: common.entity_id,
      pokemonId,
      speciesId,
      speciesSlug: species.identifier,
      pokemonSlug: pokemon.identifier,
      entityKind: common.entity_kind,
      coverage: {
        staticCandidates: staticMedia.length,
        animationCandidates: animatedMedia.length,
        latestCry: Boolean(cries.latest),
        legacyCry: Boolean(cries.legacy),
        temporaryPublishedSprites: published.length,
        approvedRuntimeAssets: 0,
      },
      missing,
      replacementRequired: true,
    });
  }

  const definitionAudit = await auditDefinitions(manifest, tables);
  const publishedInspection = await inspectPublishedSprites(manifest);
  const sourceCollections = { static: {}, animated: {} };
  const sourceExtensions = { static: {}, animated: {} };
  const familyCoverageState = {};
  for (const [pokemonId, entries] of mediaByPokemonId) {
    for (const entry of entries) {
      const bucket = entry.animated ? "animated" : "static";
      increment(sourceCollections[bucket], entry.collection);
      increment(sourceExtensions[bucket], entry.extension);
      const family = visualFamily(entry.path);
      familyCoverageState[family] ??= {
        staticCandidates: 0,
        animationCandidates: 0,
        entityIds: new Set(),
      };
      increment(
        familyCoverageState[family],
        entry.animated ? "animationCandidates" : "staticCandidates",
      );
      familyCoverageState[family].entityIds.add(pokemonId);
    }
  }
  const familyCoverage = Object.fromEntries(
    Object.entries(familyCoverageState).map(([family, values]) => [
      family,
      {
        staticCandidates: values.staticCandidates,
        animationCandidates: values.animationCandidates,
        entityCount: values.entityIds.size,
        compatibility: compatibilityFor(
          family === "pokeapi-default-generation-v-style"
            ? "1.png"
            : family === "showdown-community"
              ? "other/showdown/1.gif"
              : family === "icon"
                ? "versions/generation-v/icons/1.png"
                : family === "home-render"
                  ? "other/home/1.png"
                  : family === "official-artwork"
                    ? "other/official-artwork/1.png"
                    : family === "dream-world-vector"
                      ? "other/dream-world/1.svg"
                      : `versions/${family.replace(/-(pixel|render)$/, "")}/set/1.png`,
        ),
      },
    ]),
  );
  const canonicalFindings = {
    schemaVersion: 1,
    auditedAt: AUDITED_AT,
    source: {
      repository: "PokeAPI/pokeapi",
      revision: POKEAPI_SHA,
      sourceUrl: `https://github.com/PokeAPI/pokeapi/tree/${POKEAPI_SHA}/data/v2/csv`,
    },
    scope: {
      speciesRows: speciesRows.length,
      pokemonRows: pokemonRows.length,
      defaultPokemonRows: pokemonRows.filter((row) => row.is_default === "1")
        .length,
      alternatePokemonRows: pokemonRows.filter((row) => row.is_default !== "1")
        .length,
      pokemonFormRows: forms.length,
      battleOnlyFormRows: forms.filter((row) => row.is_battle_only === "1")
        .length,
      packCreatureFolders: manifest.creatures.length,
      standaloneAlternateFormFolders: 0,
    },
    automatedAudit: definitionAudit,
    classifications: {
      confirmed:
        "All 1,025 default-species folders pass source-revision, six-stat, type, ability, move, method, and version-group referential checks.",
      sourceFaithfulButNotIndependentlyConfirmed:
        "Move effects, ability effects, learnsets, machines, evolutions, and biological fields are generated from the same pinned PokéAPI CSV snapshot and have not been manually cross-checked one by one.",
      projectOriginal:
        "Runtime actions strike/guard and creatures emberbud/nightleaf are original project abstractions, not canonical Pokémon moves or definitions.",
      absent:
        "The pack has no standalone definitions for 326 alternate Pokémon rows or the complete 1,579 pokemon_form rows.",
      approvalMeaning:
        "definitionStatus=approved means automated schema/coverage/referential validation only.",
    },
    findings: [
      {
        id: "DATA-001",
        severity: "high",
        status: "confirmed-gap",
        subject: "alternate forms",
        evidence: {
          alternatePokemonRows: pokemonRows.filter(
            (row) => row.is_default !== "1",
          ).length,
          pokemonFormRows: forms.length,
          standaloneAlternateFormFolders: 0,
        },
        conclusion:
          "Species coverage is complete, but form coverage is not complete and must not be described as all forms.",
      },
      {
        id: "DATA-002",
        severity: "medium",
        status: "confirmed-gap",
        subject: "canonical display names",
        evidence: {
          moveNameMismatches: definitionAudit.catalogs.moveNameMismatchCount,
          abilityNameMismatches:
            definitionAudit.catalogs.abilityNameMismatchCount,
        },
        conclusion:
          "Move and ability display names are title-cased from slugs instead of using the source English name tables.",
      },
      {
        id: "DATA-003",
        severity: "high",
        status: "decision-required",
        subject: "game baseline",
        evidence: {
          versionGroups: definitionAudit.catalogs.versionGroupCount,
        },
        conclusion:
          "Learnsets combine every source version group; runtime use requires an explicit game/version baseline and deterministic fallback rules.",
      },
      {
        id: "DATA-004",
        severity: "medium",
        status: "validation-limitation",
        subject: "independent canonical verification",
        evidence: { manuallyVerifiedSpecies: 0, manuallyVerifiedMoves: 0 },
        conclusion:
          "The current validation proves internal consistency with PokéAPI, not independent correctness against a second authoritative source.",
      },
      {
        id: "DATA-005",
        severity: "low",
        status: "correct-separation",
        subject: "invented moves",
        evidence: {
          canonicalCatalogUnknownReferences:
            definitionAudit.metrics.invalidMoveReferences,
          projectBattleActions: ["strike", "guard"],
        },
        conclusion:
          "No invented move is present in the canonical catalog; original runtime actions remain in the generic battle domain.",
      },
      {
        id: "DATA-006",
        severity: "medium",
        status: "confirmed-gap",
        subject: "move flags and exact mechanics",
        evidence: {
          moveFlagsModeled: false,
          examplesAbsent: ["contact", "sound", "punch", "bite", "protect"],
        },
        conclusion:
          "The move catalog records core stats and meta fields but omits move flags needed for exact battle mechanics.",
      },
    ],
  };

  const slotCoverage = {};
  for (const entity of gapEntities) {
    for (const [slot, present] of [
      ["anyStaticCandidate", entity.coverage.staticCandidates > 0],
      ["anyAnimationCandidate", entity.coverage.animationCandidates > 0],
      ["latestCryCandidate", entity.coverage.latestCry],
      ["legacyCryCandidate", entity.coverage.legacyCry],
      [
        "fourTemporaryPublishedSprites",
        entity.coverage.temporaryPublishedSprites === 4,
      ],
      ["approvedRuntimeAsset", entity.coverage.approvedRuntimeAssets > 0],
    ]) {
      if (present) increment(slotCoverage, slot);
    }
  }
  const gapMatrix = {
    schemaVersion: 1,
    auditedAt: AUDITED_AT,
    entityCount: gapEntities.length,
    definition:
      "Availability is not approval. Candidate coverage counts source-tree metadata; approved runtime coverage remains zero.",
    sourceMetrics: {
      sprites: {
        revision: SPRITES_SHA,
        treeBlobCount: spriteTree.length,
        mappedMediaCount: [...mediaByPokemonId.values()].reduce(
          (sum, entries) => sum + entries.length,
          0,
        ),
        unmappedMediaCount: unmappedPokemonMedia,
        unmappedMediaPaths: unmappedPokemonMediaPaths.sort(),
        collections: sourceCollections,
        extensions: sourceExtensions,
        familyCoverage,
      },
      cries: {
        revision: CRIES_SHA,
        audioFileCount: criesTree.length,
      },
    },
    slotCoverage,
    entities: gapEntities,
  };
  const spriteSummary = {
    sourceRevision: SPRITES_SHA,
    sourceTreeBlobCount: spriteTree.length,
    mappedEntities: mediaByPokemonId.size,
    unmappedPokemonMedia,
    entityRows: entitySpriteRows.length,
    candidateRows: spriteCandidateRows.length,
    entitiesWithStaticCandidates: entitySpriteRows.filter(
      (row) => row.static_candidate_count > 0,
    ).length,
    entitiesWithAnimationCandidates: entitySpriteRows.filter(
      (row) => row.animation_candidate_count > 0,
    ).length,
    staticCandidateCount: entitySpriteRows.reduce(
      (sum, row) => sum + row.static_candidate_count,
      0,
    ),
    animationCandidateCount: entitySpriteRows.reduce(
      (sum, row) => sum + row.animation_candidate_count,
      0,
    ),
    publishedInspection,
  };
  const audioSummary = {
    sourceRevision: CRIES_SHA,
    sourceTreeAudioFiles: criesTree.length,
    entityRows: entityAudioRows.length,
    candidateRows: audioCandidateRows.length,
    latestAvailable: entityAudioRows.filter((row) => row.latest_available)
      .length,
    legacyAvailable: entityAudioRows.filter((row) => row.legacy_available)
      .length,
    latestBytes: entityAudioRows.reduce(
      (sum, row) => sum + (row.latest_bytes ?? 0),
      0,
    ),
    legacyBytes: entityAudioRows.reduce(
      (sum, row) => sum + (row.legacy_bytes ?? 0),
      0,
    ),
    importedCount: 0,
    approvedRuntimeCount: 0,
  };

  await Promise.all([
    writeJson(path.join(OUTPUT_ROOT, "source-register.json"), sourceRegister()),
    writeJson(
      path.join(OUTPUT_ROOT, "canonical-data-findings.json"),
      canonicalFindings,
    ),
    writeJson(path.join(OUTPUT_ROOT, "asset-gap-matrix.json"), gapMatrix),
    writeJson(
      path.join(OUTPUT_ROOT, "proposed-asset-schema.json"),
      proposedAssetSchema(),
    ),
    writeFile(
      path.join(OUTPUT_ROOT, "sprite-availability.csv"),
      csv(spriteCandidateRows, [
        "candidate_id",
        "entity_id",
        "pokemon_id",
        "species_id",
        "national_dex_number",
        "species_slug",
        "pokemon_slug",
        "entity_kind",
        "is_default",
        "form_record_count",
        "form_ids",
        "form_identifiers",
        "battle_only_form_count",
        "is_regional_form",
        "is_mega",
        "is_gigantamax",
        "category",
        "collection",
        "visual_family",
        "visual_generation",
        "game_or_set",
        "perspective",
        "variation",
        "gender",
        "animated",
        "extension",
        "mime_type",
        "width",
        "height",
        "bytes",
        "has_transparency",
        "frame_count",
        "duration_ms",
        "frame_speed_ms",
        "loop",
        "sha256",
        "source_id",
        "source_path",
        "artist_or_ripper_status",
        "rights_policy_id",
        "legal_status",
        "legal_confidence",
        "compatibility_score",
        "compatibility_class",
        "published_temporary",
        "runtime_status",
        "recommendation",
      ]),
      "utf8",
    ),
    writeFile(
      path.join(OUTPUT_ROOT, "audio-availability.csv"),
      csv(audioCandidateRows, [
        "candidate_id",
        "entity_id",
        "pokemon_id",
        "species_id",
        "national_dex_number",
        "species_slug",
        "pokemon_slug",
        "entity_kind",
        "is_default",
        "form_record_count",
        "form_ids",
        "form_identifiers",
        "battle_only_form_count",
        "is_regional_form",
        "is_mega",
        "is_gigantamax",
        "set",
        "extension",
        "mime_type",
        "bytes",
        "duration_ms",
        "channels",
        "sample_rate_hz",
        "leading_silence_ms",
        "trailing_silence_ms",
        "sha256",
        "source_git_blob_sha",
        "source_path",
        "source_url",
        "source_repository",
        "source_revision",
        "declared_origin",
        "declared_license",
        "declared_ownership",
        "legal_status",
        "legal_confidence",
        "imported",
        "runtime_status",
        "recommendation",
      ]),
      "utf8",
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify(
      {
        species: speciesRows.length,
        pokemon: pokemonRows.length,
        forms: forms.length,
        spriteRows: spriteCandidateRows.length,
        audioRows: audioCandidateRows.length,
        staticCandidates: spriteSummary.staticCandidateCount,
        animationCandidates: spriteSummary.animationCandidateCount,
        latestCries: audioSummary.latestAvailable,
        legacyCries: audioSummary.legacyAvailable,
        publishedSpritesInspected: publishedInspection.count,
      },
      null,
      2,
    )}\n`,
  );
}

await main();
