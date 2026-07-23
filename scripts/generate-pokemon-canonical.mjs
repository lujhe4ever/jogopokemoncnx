import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = process.cwd();
const PACK_ROOT = path.join("content", "packs", "pokemon-canonical");
const CREATURES_ROOT = path.join(PACK_ROOT, "creatures");
const CATALOGS_ROOT = path.join(PACK_ROOT, "catalogs");
const REPORTS_ROOT = path.join(PACK_ROOT, "reports");
const CACHE_ROOT = path.join(".cache", "pokemon-canonical");
const PRIVATE_ROOT = path.join(".private", "pokemon-canonical");
const RETRIEVED_AT = new Date().toISOString().slice(0, 10);
const DOWNLOAD_PRIVATE_SPRITES = process.argv.includes(
  "--with-private-sprites",
);
const PUBLISH_BATTLE_SPRITES =
  process.argv.includes("--publish-battle-sprites") ||
  process.argv.includes("--publish-front-sprites");
const REFRESH = process.argv.includes("--refresh");
const POKEAPI_REVISION = argumentValue("--pokeapi-revision");
const SPRITES_REVISION = argumentValue("--sprites-revision");
const NATIONAL_DEX_LIMIT = 1025;
const ENGLISH_LANGUAGE_ID = 9;
const APPROVAL_STATUSES = [
  "approved",
  "pending",
  "doubtful",
  "rejected",
  "quarantined",
];
const POKEAPI_REPOSITORY = "PokeAPI/pokeapi";
const SPRITES_REPOSITORY = "PokeAPI/sprites";
const USER_AGENT = "Projeto-LT-Pokemon-Catalog/2";
const BATTLE_SPRITE_VARIANTS = [
  {
    id: "front-normal",
    perspective: "front",
    variation: "normal",
    sourcePath: (pokemonId) => `${pokemonId}.png`,
  },
  {
    id: "front-shiny",
    perspective: "front",
    variation: "shiny",
    sourcePath: (pokemonId) => `shiny/${pokemonId}.png`,
  },
  {
    id: "back-normal",
    perspective: "back",
    variation: "normal",
    sourcePath: (pokemonId) => `back/${pokemonId}.png`,
  },
  {
    id: "back-shiny",
    perspective: "back",
    variation: "shiny",
    sourcePath: (pokemonId) => `back/shiny/${pokemonId}.png`,
  },
];

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

const CSV_FILES = [
  "abilities.csv",
  "ability_prose.csv",
  "egg_groups.csv",
  "evolution_triggers.csv",
  "generations.csv",
  "growth_rates.csv",
  "items.csv",
  "machines.csv",
  "move_damage_classes.csv",
  "move_effect_prose.csv",
  "move_meta.csv",
  "move_meta_ailments.csv",
  "move_meta_categories.csv",
  "move_meta_stat_changes.csv",
  "move_targets.csv",
  "moves.csv",
  "pokemon.csv",
  "pokemon_abilities.csv",
  "pokemon_colors.csv",
  "pokemon_egg_groups.csv",
  "pokemon_evolution.csv",
  "pokemon_habitats.csv",
  "pokemon_move_methods.csv",
  "pokemon_moves.csv",
  "pokemon_shapes.csv",
  "pokemon_species.csv",
  "pokemon_species_names.csv",
  "pokemon_stats.csv",
  "pokemon_types.csv",
  "stats.csv",
  "types.csv",
  "version_groups.csv",
  "versions.csv",
];

function toInteger(value) {
  return value === "" || value === undefined
    ? null
    : Number.parseInt(value, 10);
}

function toBoolean(value) {
  return value === "1";
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceInfo(pokeapiSha) {
  return {
    retrievedAt: RETRIEVED_AT,
    sourceRevision: pokeapiSha,
    sourceUrls: [
      `https://github.com/${POKEAPI_REPOSITORY}/tree/${pokeapiSha}/data/v2/csv`,
      `https://github.com/${POKEAPI_REPOSITORY}/blob/${pokeapiSha}/LICENSE.md`,
    ],
    licenseStatus: "pending",
    requiredCredits: ["PokéAPI contributors for the structured API data."],
    notes: [
      "Structured data is sourced from PokéAPI under its BSD-3-Clause terms.",
      "Pokémon names and character data remain subject to owner review and applicable trademark or copyright rights.",
      "English source prose is preserved to avoid inventing translations of gameplay behavior.",
    ],
  };
}

function spriteSourceInfo(spritesSha) {
  return {
    retrievedAt: RETRIEVED_AT,
    sourceRevision: spritesSha,
    sourceUrls: [
      `https://github.com/${SPRITES_REPOSITORY}/tree/${spritesSha}`,
      `https://github.com/${SPRITES_REPOSITORY}/blob/${spritesSha}/LICENCE.txt`,
    ],
    licenseStatus: "doubtful",
    requiredCredits: [
      "The Pokémon Company for official image contents, as declared by the source repository.",
      "PokéAPI and the named community artists where a candidate comes from a fan-made collection.",
    ],
    notes: [
      "The source repository applies CC0 while also declaring image copyright owned by The Pokémon Company.",
      "That conflict does not establish clear authority to redistribute the images in this public repository.",
      PUBLISH_BATTLE_SPRITES
        ? "The repository owner explicitly directed publication of four compact battle sprites per species; rights remain doubtful and the runtime does not load them."
        : "Candidates remain pending or quarantined and are never used by the runtime.",
    ],
  };
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await globalThis.fetch(url, {
        ...options,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": USER_AGENT,
          ...options.headers,
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(attempt * 500);
      }
    }
  }
  throw lastError;
}

async function fetchJson(url) {
  return (await fetchWithRetry(url)).json();
}

async function getHeadSha(repository) {
  const ref = await fetchJson(
    `https://api.github.com/repos/${repository}/git/refs/heads/master`,
  );
  return ref.object.sha;
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

async function loadCsv(name, pokeapiSha) {
  const directory = path.join(CACHE_ROOT, `pokeapi-${pokeapiSha}`);
  const filePath = path.join(directory, name);
  await mkdir(directory, { recursive: true });

  let text;
  if (!REFRESH) {
    try {
      text = await readFile(filePath, "utf8");
    } catch {
      text = undefined;
    }
  }

  if (text === undefined) {
    const url = `https://raw.githubusercontent.com/${POKEAPI_REPOSITORY}/${pokeapiSha}/data/v2/csv/${name}`;
    text = await (await fetchWithRetry(url)).text();
    await writeFile(filePath, text, "utf8");
  }
  return parseCsv(text);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function indexBy(rows, key) {
  return new Map(rows.map((row) => [row[key], row]));
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    const group = groups.get(value) ?? [];
    group.push(row);
    groups.set(value, group);
  }
  return groups;
}

function englishProse(rows, idKey) {
  return new Map(
    rows
      .filter((row) => toInteger(row.local_language_id) === ENGLISH_LANGUAGE_ID)
      .map((row) => [row[idKey], row]),
  );
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCompactJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

async function getTree(sha, recursive = false) {
  const suffix = recursive ? "?recursive=1" : "";
  return fetchJson(
    `https://api.github.com/repos/${SPRITES_REPOSITORY}/git/trees/${sha}${suffix}`,
  );
}

async function collectTree(sha, prefix = "") {
  const recursiveTree = await getTree(sha, true);
  if (!recursiveTree.truncated) {
    return recursiveTree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => ({
        ...entry,
        path: prefix ? `${prefix}/${entry.path}` : entry.path,
      }));
  }

  const shallowTree = await getTree(sha, false);
  const blobs = shallowTree.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => ({
      ...entry,
      path: prefix ? `${prefix}/${entry.path}` : entry.path,
    }));
  const childTrees = shallowTree.tree.filter((entry) => entry.type === "tree");
  const children = await mapLimit(childTrees, 4, (entry) =>
    collectTree(entry.sha, prefix ? `${prefix}/${entry.path}` : entry.path),
  );
  return blobs.concat(...children);
}

async function loadSpriteTree(spritesSha) {
  const cachePath = path.join(
    CACHE_ROOT,
    `sprites-${spritesSha}`,
    "pokemon-tree.json",
  );
  if (!REFRESH) {
    try {
      return JSON.parse(await readFile(cachePath, "utf8"));
    } catch {
      // Fetch and cache below.
    }
  }

  const root = await getTree(spritesSha);
  const spritesEntry = root.tree.find(
    (entry) => entry.type === "tree" && entry.path === "sprites",
  );
  const spritesTree = await getTree(spritesEntry.sha);
  const pokemonEntry = spritesTree.tree.find(
    (entry) => entry.type === "tree" && entry.path === "pokemon",
  );
  const entries = await collectTree(pokemonEntry.sha);
  await writeJson(cachePath, entries);
  return entries;
}

function classifySpritePath(relativePath) {
  const extension = path.extname(relativePath).slice(1).toLowerCase();
  const segments = relativePath.split("/");
  const lowerPath = relativePath.toLowerCase();
  const isAnimation = extension === "gif" || lowerPath.includes("/animated/");
  const perspective = lowerPath.includes("/back/") ? "back" : "front";
  const variation = lowerPath.includes("shiny") ? "shiny" : "normal";
  const gender = lowerPath.includes("female") ? "female" : null;
  let collection = "pokeapi-default";

  if (segments[0] === "versions") {
    collection = segments.slice(1, -1).join("-");
  } else if (segments[0] === "other") {
    collection = `other-${segments.slice(1, -1).join("-")}`;
  } else if (segments.length > 1) {
    collection = `pokeapi-${segments.slice(0, -1).join("-")}`;
  }

  return {
    collection: collection.replace(/--+/g, "-").replace(/-$/, ""),
    extension,
    gender,
    isAnimation,
    perspective,
    variation,
  };
}

function pokemonIdFromSpritePath(relativePath, speciesBySlug) {
  const baseName = path.basename(relativePath, path.extname(relativePath));
  const numericMatch = /^(\d+)(?:-|$)/.exec(baseName);
  if (numericMatch) {
    const id = Number.parseInt(numericMatch[1], 10);
    return id >= 1 && id <= NATIONAL_DEX_LIMIT ? id : null;
  }
  return speciesBySlug.get(baseName)?.id ?? null;
}

function approvalForSprite(relativePath, pokemonId) {
  const lowerPath = relativePath.toLowerCase();
  const community =
    lowerPath.includes("/showdown/") ||
    (lowerPath.startsWith("versions/generation-v/black-white") &&
      pokemonId > 649);
  return {
    status: community ? "pending" : "doubtful",
    rightsPolicyId: community
      ? "smogon-project-specific"
      : "official-image-rights-unclear",
  };
}

function inspectImage(buffer, extension) {
  if (
    extension === "png" &&
    buffer.length >= 24 &&
    buffer.subarray(1, 4).toString("ascii") === "PNG"
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      animated: false,
      frameCount: 1,
      transparency: "present-or-palette-dependent",
    };
  }
  if (
    extension === "gif" &&
    buffer.length >= 10 &&
    buffer.subarray(0, 3).toString("ascii") === "GIF"
  ) {
    const frameMarkers = buffer
      .toString("latin1")
      .split(String.fromCharCode(0x2c)).length;
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
      animated: frameMarkers > 2,
      frameCount: Math.max(1, frameMarkers - 1),
      transparency: "palette-dependent",
    };
  }
  return {
    width: null,
    height: null,
    animated: extension === "gif",
    frameCount: null,
    transparency: "unknown",
  };
}

async function mirrorPrivateSprite(
  species,
  variant,
  spritesSha,
  availablePaths,
) {
  const relativeSourcePath = variant.sourcePath(species.id);
  if (
    (!DOWNLOAD_PRIVATE_SPRITES && !PUBLISH_BATTLE_SPRITES) ||
    !availablePaths.has(relativeSourcePath)
  ) {
    return null;
  }

  const folder = `${String(species.id).padStart(4, "0")}-${species.slug}`;
  const fileName = `${folder}--pokeapi-default--${variant.perspective}--${variant.variation}.png`;
  const relativePrivatePath = path
    .join(".private", "pokemon-canonical", folder, "sprites", fileName)
    .replaceAll("\\", "/");
  const absolutePrivatePath = path.join(ROOT, relativePrivatePath);
  let buffer;

  if (!REFRESH) {
    try {
      buffer = await readFile(absolutePrivatePath);
    } catch {
      buffer = undefined;
    }
  }
  if (buffer === undefined) {
    const url = `https://raw.githubusercontent.com/${SPRITES_REPOSITORY}/${spritesSha}/sprites/pokemon/${relativeSourcePath}`;
    buffer = Buffer.from(await (await fetchWithRetry(url)).arrayBuffer());
    await mkdir(path.dirname(absolutePrivatePath), { recursive: true });
    await writeFile(absolutePrivatePath, buffer);
  }

  return {
    variantId: variant.id,
    sourceRelativePath: relativeSourcePath,
    localOnly: true,
    relativePrivatePath,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.length,
    ...inspectImage(buffer, "png"),
  };
}

function buildMoveCatalog(tables) {
  const types = indexBy(tables["types.csv"], "id");
  const damageClasses = indexBy(tables["move_damage_classes.csv"], "id");
  const targets = indexBy(tables["move_targets.csv"], "id");
  const effects = englishProse(
    tables["move_effect_prose.csv"],
    "move_effect_id",
  );
  const metaByMove = indexBy(tables["move_meta.csv"], "move_id");
  const ailments = indexBy(tables["move_meta_ailments.csv"], "id");
  const metaCategories = indexBy(tables["move_meta_categories.csv"], "id");
  const statChangesByMove = groupBy(
    tables["move_meta_stat_changes.csv"],
    "move_id",
  );
  const stats = indexBy(tables["stats.csv"], "id");

  return tables["moves.csv"].map((move) => {
    const effect = effects.get(move.effect_id);
    const meta = metaByMove.get(move.id);
    return {
      id: toInteger(move.id),
      slug: move.identifier,
      canonicalName: titleFromSlug(move.identifier),
      generationIntroduced: toInteger(move.generation_id),
      type: types.get(move.type_id)?.identifier ?? "unknown",
      category:
        damageClasses.get(move.damage_class_id)?.identifier ?? "unknown",
      power: toInteger(move.power),
      accuracy: toInteger(move.accuracy),
      pp: toInteger(move.pp),
      priority: toInteger(move.priority) ?? 0,
      target: targets.get(move.target_id)?.identifier ?? "unknown",
      effectChance: toInteger(move.effect_chance),
      shortEffect: effect?.short_effect ?? "No English effect text available.",
      effect: effect?.effect ?? "No English effect text available.",
      meta: meta
        ? {
            category:
              metaCategories.get(meta.meta_category_id)?.identifier ?? null,
            ailment: ailments.get(meta.meta_ailment_id)?.identifier ?? null,
            minHits: toInteger(meta.min_hits),
            maxHits: toInteger(meta.max_hits),
            minTurns: toInteger(meta.min_turns),
            maxTurns: toInteger(meta.max_turns),
            drainPercent: toInteger(meta.drain),
            healingPercent: toInteger(meta.healing),
            criticalHitRateStage: toInteger(meta.crit_rate),
            ailmentChance: toInteger(meta.ailment_chance),
            flinchChance: toInteger(meta.flinch_chance),
            statChance: toInteger(meta.stat_chance),
          }
        : null,
      statChanges: (statChangesByMove.get(move.id) ?? []).map((change) => ({
        stat: stats.get(change.stat_id)?.identifier ?? "unknown",
        stages: toInteger(change.change),
      })),
      sourceUrl: `https://pokeapi.co/api/v2/move/${move.id}/`,
    };
  });
}

function buildAbilityCatalog(tables) {
  const prose = englishProse(tables["ability_prose.csv"], "ability_id");
  return tables["abilities.csv"].map((ability) => {
    const effect = prose.get(ability.id);
    return {
      id: toInteger(ability.id),
      slug: ability.identifier,
      canonicalName: titleFromSlug(ability.identifier),
      generationIntroduced: toInteger(ability.generation_id),
      isMainSeries: toBoolean(ability.is_main_series),
      shortEffect: effect?.short_effect ?? "No English effect text available.",
      effect: effect?.effect ?? "No English effect text available.",
      sourceUrl: `https://pokeapi.co/api/v2/ability/${ability.id}/`,
    };
  });
}

function buildVersionGroupCatalog(tables) {
  const generations = indexBy(tables["generations.csv"], "id");
  const versionsByGroup = groupBy(tables["versions.csv"], "version_group_id");
  return tables["version_groups.csv"].map((group) => ({
    id: toInteger(group.id),
    slug: group.identifier,
    generation: toInteger(group.generation_id),
    generationSlug:
      generations.get(group.generation_id)?.identifier ?? "unknown",
    order: toInteger(group.order),
    versions: (versionsByGroup.get(group.id) ?? []).map(
      (version) => version.identifier,
    ),
  }));
}

function buildSpeciesModels(tables) {
  const englishNames = new Map(
    tables["pokemon_species_names.csv"]
      .filter((row) => toInteger(row.local_language_id) === ENGLISH_LANGUAGE_ID)
      .map((row) => [row.pokemon_species_id, row]),
  );
  const defaultPokemonBySpecies = new Map(
    tables["pokemon.csv"]
      .filter((row) => toBoolean(row.is_default))
      .map((row) => [row.species_id, row]),
  );
  const generations = indexBy(tables["generations.csv"], "id");
  const types = indexBy(tables["types.csv"], "id");
  const stats = indexBy(tables["stats.csv"], "id");
  const colors = indexBy(tables["pokemon_colors.csv"], "id");
  const shapes = indexBy(tables["pokemon_shapes.csv"], "id");
  const habitats = indexBy(tables["pokemon_habitats.csv"], "id");
  const growthRates = indexBy(tables["growth_rates.csv"], "id");
  const eggGroups = indexBy(tables["egg_groups.csv"], "id");
  const pokemonTypes = groupBy(tables["pokemon_types.csv"], "pokemon_id");
  const pokemonStats = groupBy(tables["pokemon_stats.csv"], "pokemon_id");
  const pokemonAbilities = groupBy(
    tables["pokemon_abilities.csv"],
    "pokemon_id",
  );
  const speciesEggGroups = groupBy(
    tables["pokemon_egg_groups.csv"],
    "species_id",
  );

  return tables["pokemon_species.csv"]
    .filter((row) => toInteger(row.id) <= NATIONAL_DEX_LIMIT)
    .map((speciesRow) => {
      const pokemon = defaultPokemonBySpecies.get(speciesRow.id);
      if (!pokemon) {
        throw new Error(`No default Pokémon row for species ${speciesRow.id}`);
      }
      const name = englishNames.get(speciesRow.id);
      return {
        id: toInteger(speciesRow.id),
        pokemonId: toInteger(pokemon.id),
        slug: speciesRow.identifier,
        canonicalName: name?.name ?? titleFromSlug(speciesRow.identifier),
        genus: name?.genus || null,
        generation: toInteger(speciesRow.generation_id),
        generationSlug:
          generations.get(speciesRow.generation_id)?.identifier ?? "unknown",
        types: (pokemonTypes.get(pokemon.id) ?? [])
          .sort((left, right) => Number(left.slot) - Number(right.slot))
          .map((row) => types.get(row.type_id)?.identifier ?? "unknown"),
        heightDecimeters: toInteger(pokemon.height),
        weightHectograms: toInteger(pokemon.weight),
        baseExperience: toInteger(pokemon.base_experience),
        baseStats: Object.fromEntries(
          (pokemonStats.get(pokemon.id) ?? []).map((row) => [
            stats.get(row.stat_id)?.identifier ?? `stat-${row.stat_id}`,
            {
              value: toInteger(row.base_stat),
              effortYield: toInteger(row.effort),
            },
          ]),
        ),
        abilitySlots: (pokemonAbilities.get(pokemon.id) ?? [])
          .sort((left, right) => Number(left.slot) - Number(right.slot))
          .map((row) => ({
            abilityId: toInteger(row.ability_id),
            slot: toInteger(row.slot),
            isHidden: toBoolean(row.is_hidden),
          })),
        color: colors.get(speciesRow.color_id)?.identifier ?? null,
        shape: shapes.get(speciesRow.shape_id)?.identifier ?? null,
        habitat: habitats.get(speciesRow.habitat_id)?.identifier ?? null,
        genderRate: toInteger(speciesRow.gender_rate),
        captureRate: toInteger(speciesRow.capture_rate),
        baseHappiness: toInteger(speciesRow.base_happiness),
        hatchCounter: toInteger(speciesRow.hatch_counter),
        hasGenderDifferences: toBoolean(speciesRow.has_gender_differences),
        growthRate:
          growthRates.get(speciesRow.growth_rate_id)?.identifier ?? null,
        eggGroups: (speciesEggGroups.get(speciesRow.id) ?? []).map(
          (row) => eggGroups.get(row.egg_group_id)?.identifier ?? "unknown",
        ),
        isBaby: toBoolean(speciesRow.is_baby),
        isLegendary: toBoolean(speciesRow.is_legendary),
        isMythical: toBoolean(speciesRow.is_mythical),
        evolvesFromSpeciesId: toInteger(speciesRow.evolves_from_species_id),
        evolutionChainId: toInteger(speciesRow.evolution_chain_id),
      };
    })
    .sort((left, right) => left.id - right.id);
}

function buildEvolutionDetails(tables, speciesById) {
  const triggers = indexBy(tables["evolution_triggers.csv"], "id");
  const items = indexBy(tables["items.csv"], "id");
  const moves = indexBy(tables["moves.csv"], "id");
  const types = indexBy(tables["types.csv"], "id");
  return groupBy(
    tables["pokemon_evolution.csv"].map((row) => ({
      fromSpeciesId:
        speciesById.get(toInteger(row.evolved_species_id))
          ?.evolvesFromSpeciesId ?? null,
      toSpeciesId: toInteger(row.evolved_species_id),
      trigger: triggers.get(row.evolution_trigger_id)?.identifier ?? "unknown",
      versionGroupId: toInteger(row.version_group_id),
      isDefault: toBoolean(row.is_default),
      triggerItem: items.get(row.trigger_item_id)?.identifier ?? null,
      minimumLevel: toInteger(row.minimum_level),
      genderId: toInteger(row.gender_id),
      locationId: toInteger(row.location_id),
      heldItem: items.get(row.held_item_id)?.identifier ?? null,
      timeOfDay: row.time_of_day || null,
      knownMove: moves.get(row.known_move_id)?.identifier ?? null,
      knownMoveType: types.get(row.known_move_type_id)?.identifier ?? null,
      minimumHappiness: toInteger(row.minimum_happiness),
      minimumBeauty: toInteger(row.minimum_beauty),
      minimumAffection: toInteger(row.minimum_affection),
      relativePhysicalStats: toInteger(row.relative_physical_stats),
      partySpeciesId: toInteger(row.party_species_id),
      partyType: types.get(row.party_type_id)?.identifier ?? null,
      tradeSpeciesId: toInteger(row.trade_species_id),
      needsOverworldRain: toBoolean(row.needs_overworld_rain),
      turnUpsideDown: toBoolean(row.turn_upside_down),
      needsMultiplayer: toBoolean(row.needs_multiplayer),
      nearSpecialRock: toBoolean(row.near_special_rock),
      regionId: toInteger(row.region_id),
      usedMove: moves.get(row.used_move_id)?.identifier ?? null,
      minimumMoveCount: toInteger(row.minimum_move_count),
      minimumSteps: toInteger(row.minimum_steps),
      minimumDamageTaken: toInteger(row.minimum_damage_taken),
    })),
    "fromSpeciesId",
  );
}

function buildLearnsets(tables, moveCatalogById) {
  const items = indexBy(tables["items.csv"], "id");
  const machinesByVersionMove = new Map();
  for (const machine of tables["machines.csv"]) {
    const key = `${machine.version_group_id}:${machine.move_id}`;
    const current = machinesByVersionMove.get(key) ?? [];
    current.push({
      machineNumber: toInteger(machine.machine_number),
      item: items.get(machine.item_id)?.identifier ?? null,
    });
    machinesByVersionMove.set(key, current);
  }

  const rowsByPokemon = groupBy(tables["pokemon_moves.csv"], "pokemon_id");
  const result = new Map();
  for (const [pokemonId, rows] of rowsByPokemon) {
    const byMove = groupBy(rows, "move_id");
    const entries = [];
    for (const [moveId, moveRows] of byMove) {
      const move = moveCatalogById.get(toInteger(moveId));
      if (!move) {
        continue;
      }
      entries.push([
        move.id,
        moveRows
          .map((row) => {
            const methodId = toInteger(row.pokemon_move_method_id);
            return [
              toInteger(row.version_group_id),
              methodId,
              methodId === 1 ? toInteger(row.level) : null,
              toInteger(row.order),
              toInteger(row.mastery),
              methodId === 4
                ? (
                    machinesByVersionMove.get(
                      `${row.version_group_id}:${row.move_id}`,
                    ) ?? []
                  ).map((machine) => [machine.machineNumber, machine.item])
                : [],
            ];
          })
          .sort(
            (left, right) =>
              (left[0] ?? 0) - (right[0] ?? 0) ||
              (left[1] ?? 0) - (right[1] ?? 0) ||
              (left[2] ?? 0) - (right[2] ?? 0),
          ),
      ]);
    }
    result.set(
      pokemonId,
      entries.sort((left, right) => left[0] - right[0]),
    );
  }
  return result;
}

function spriteEntry(relativePath, treeEntry, species) {
  const classification = classifySpritePath(relativePath);
  const approval = approvalForSprite(relativePath, species.id);
  const originalName = path.basename(relativePath);
  const hashSuffix = treeEntry.sha.slice(0, 8);
  const proposedName = [
    String(species.id).padStart(4, "0"),
    species.slug,
    classification.collection,
    classification.perspective,
    classification.variation,
    classification.gender,
    classification.isAnimation ? "animated" : null,
    hashSuffix,
  ]
    .filter(Boolean)
    .join("--");
  return {
    id: treeEntry.sha,
    collection: classification.collection,
    perspective: classification.perspective,
    variation: classification.variation,
    ...(classification.gender ? { gender: classification.gender } : {}),
    animated: classification.isAnimation,
    extension: classification.extension,
    bytes: treeEntry.size ?? null,
    sourceRepositoryPath: `sprites/pokemon/${relativePath}`,
    rightsPolicyId: approval.rightsPolicyId,
    status: approval.status,
    originalName,
    proposedName: `${proposedName}.${classification.extension}`,
  };
}

function inventorySummary(entries) {
  return Object.fromEntries(
    APPROVAL_STATUSES.map((status) => [
      status,
      entries.filter((entry) => entry.status === status).length,
    ]),
  );
}

async function main() {
  const [pokeapiSha, spritesSha] = await Promise.all([
    POKEAPI_REVISION ?? getHeadSha(POKEAPI_REPOSITORY),
    SPRITES_REVISION ?? getHeadSha(SPRITES_REPOSITORY),
  ]);

  globalThis.console.log(`PokéAPI data revision: ${pokeapiSha}`);
  globalThis.console.log(`PokéAPI sprites revision: ${spritesSha}`);

  const csvEntries = await mapLimit(CSV_FILES, 6, async (name) => [
    name,
    await loadCsv(name, pokeapiSha),
  ]);
  const tables = Object.fromEntries(csvEntries);
  const [spriteTree] = await Promise.all([loadSpriteTree(spritesSha)]);

  const source = sourceInfo(pokeapiSha);
  const spriteSource = spriteSourceInfo(spritesSha);
  const moveCatalog = buildMoveCatalog(tables);
  const abilityCatalog = buildAbilityCatalog(tables);
  const versionGroupCatalog = buildVersionGroupCatalog(tables);
  const species = buildSpeciesModels(tables);
  const speciesById = new Map(species.map((entry) => [entry.id, entry]));
  const speciesBySlug = new Map(species.map((entry) => [entry.slug, entry]));
  const abilityCatalogById = new Map(
    abilityCatalog.map((entry) => [entry.id, entry]),
  );
  const moveCatalogById = new Map(
    moveCatalog.map((entry) => [entry.id, entry]),
  );
  const evolutionsByFromSpecies = buildEvolutionDetails(tables, speciesById);
  const learnsets = buildLearnsets(tables, moveCatalogById);

  const spriteEntriesByPokemon = new Map();
  const availableSpritePaths = new Set();
  for (const treeEntry of spriteTree) {
    const relativePath = treeEntry.path.replaceAll("\\", "/");
    availableSpritePaths.add(relativePath);
    const pokemonId = pokemonIdFromSpritePath(relativePath, speciesBySlug);
    const model = speciesById.get(pokemonId);
    if (!model) {
      continue;
    }
    const entries = spriteEntriesByPokemon.get(pokemonId) ?? [];
    entries.push(spriteEntry(relativePath, treeEntry, model));
    spriteEntriesByPokemon.set(pokemonId, entries);
  }

  await rm(CREATURES_ROOT, { recursive: true, force: true });
  await rm(CATALOGS_ROOT, { recursive: true, force: true });
  await rm(REPORTS_ROOT, { recursive: true, force: true });
  await mkdir(CREATURES_ROOT, { recursive: true });

  const privateMirrors = await mapLimit(species, 5, async (model) =>
    (
      await Promise.all(
        BATTLE_SPRITE_VARIANTS.map((variant) =>
          mirrorPrivateSprite(model, variant, spritesSha, availableSpritePaths),
        ),
      )
    ).filter(Boolean),
  );
  const privateMirrorById = new Map(
    species.map((model, index) => [model.id, privateMirrors[index]]),
  );

  const summaries = [];
  let spriteCandidateCount = 0;
  let animationCandidateCount = 0;
  let privateSpriteCount = 0;
  let publishedSpriteCount = 0;
  let approvedDefinitionCount = 0;

  for (const model of species) {
    const dex = String(model.id).padStart(4, "0");
    const folderName = `${dex}-${model.slug}`;
    const creatureRoot = path.join(CREATURES_ROOT, folderName);
    const pokemonId = `pokemon:${folderName}`;
    await mkdir(creatureRoot, { recursive: true });
    const abilities = model.abilitySlots.map((slot) => {
      const ability = abilityCatalogById.get(slot.abilityId);
      return {
        ...slot,
        slug: ability?.slug ?? `ability-${slot.abilityId}`,
        canonicalName: ability?.canonicalName ?? `Ability ${slot.abilityId}`,
        shortEffect:
          ability?.shortEffect ?? "No English effect text available.",
        effect: ability?.effect ?? "No English effect text available.",
        sourceUrl:
          ability?.sourceUrl ??
          `https://pokeapi.co/api/v2/ability/${slot.abilityId}/`,
      };
    });
    const allMediaEntries = (spriteEntriesByPokemon.get(model.id) ?? []).sort(
      (left, right) =>
        left.sourceRepositoryPath.localeCompare(right.sourceRepositoryPath),
    );
    const spriteEntries = allMediaEntries.filter((entry) => !entry.animated);
    const animationEntries = allMediaEntries.filter((entry) => entry.animated);
    const speciesPrivateMirrors = privateMirrorById.get(model.id) ?? [];
    const repositorySprites = [];
    privateSpriteCount += speciesPrivateMirrors.length;
    for (const privateMirror of speciesPrivateMirrors) {
      const selected = spriteEntries.find(
        (entry) =>
          entry.sourceRepositoryPath ===
          `sprites/pokemon/${privateMirror.sourceRelativePath}`,
      );
      if (selected) {
        selected.localQuarantine = privateMirror;
        if (PUBLISH_BATTLE_SPRITES) {
          const fileName = path.basename(privateMirror.relativePrivatePath);
          const repositoryPath = path
            .join("sprites", fileName)
            .replaceAll("\\", "/");
          await mkdir(path.join(creatureRoot, "sprites"), { recursive: true });
          await copyFile(
            path.join(ROOT, privateMirror.relativePrivatePath),
            path.join(creatureRoot, repositoryPath),
          );
          const repositorySprite = {
            variantId: privateMirror.variantId,
            repositoryPath,
            sha256: privateMirror.sha256,
            bytes: privateMirror.bytes,
            width: privateMirror.width,
            height: privateMirror.height,
            animated: false,
            frameCount: 1,
            ownerAuthorizedAt: RETRIEVED_AT,
            rightsStatus: "doubtful",
          };
          selected.status = "doubtful";
          selected.repositoryAsset = repositorySprite;
          repositorySprites.push(repositorySprite);
          publishedSpriteCount += 1;
        } else {
          selected.status = "quarantined";
        }
      }
    }
    spriteCandidateCount += spriteEntries.length;
    animationCandidateCount += animationEntries.length;

    const manifest = {
      schemaVersion: 2,
      id: pokemonId,
      nationalDexNumber: model.id,
      canonicalName: model.canonicalName,
      slug: model.slug,
      generationIntroduced: model.generation,
      types: model.types,
      assetStatus: repositorySprites.length > 0 ? "doubtful" : "pending",
      definitionStatus: "approved",
      licenseStatus: repositorySprites.length > 0 ? "doubtful" : "pending",
      sourceUrls: source.sourceUrls,
      requiredCredits: source.requiredCredits,
      notes: [
        "Definitions passed automated schema, coverage, and referential-integrity validation and are not coupled to engine IDs.",
        repositorySprites.length > 0
          ? `${repositorySprites.length} compact battle sprites are tracked after explicit repository-owner direction; third-party redistribution rights remain doubtful.`
          : "No sprite, animation, or sound binary in this folder is tracked by Git.",
        speciesPrivateMirrors.length > 0 && repositorySprites.length === 0
          ? `${speciesPrivateMirrors.length} real battle sprites were verified in the ignored local quarantine.`
          : repositorySprites.length > 0
            ? "Every tracked sprite matches its quarantined source by SHA-256."
            : "No local sprite mirror was requested or available during this generation.",
      ],
    };

    const pokemonDefinition = {
      schemaVersion: 2,
      id: pokemonId,
      nationalDexNumber: model.id,
      canonicalName: model.canonicalName,
      slug: model.slug,
      genus: model.genus,
      generationIntroduced: model.generation,
      generationSource: model.generationSlug,
      types: model.types,
      physical: {
        heightDecimeters: model.heightDecimeters,
        weightHectograms: model.weightHectograms,
      },
      baseExperience: model.baseExperience,
      baseStats: model.baseStats,
      biologyAndTraining: {
        color: model.color,
        shape: model.shape,
        habitat: model.habitat,
        genderRate: model.genderRate,
        captureRate: model.captureRate,
        baseHappiness: model.baseHappiness,
        hatchCounter: model.hatchCounter,
        hasGenderDifferences: model.hasGenderDifferences,
        growthRate: model.growthRate,
        eggGroups: model.eggGroups,
        isBaby: model.isBaby,
        isLegendary: model.isLegendary,
        isMythical: model.isMythical,
      },
      abilities: model.abilitySlots.map((slot) => ({
        slug:
          abilityCatalogById.get(slot.abilityId)?.slug ??
          `ability-${slot.abilityId}`,
        slot: slot.slot,
        isHidden: slot.isHidden,
      })),
      evolution: {
        chainId: model.evolutionChainId,
        evolvesFromSpeciesId: model.evolvesFromSpeciesId,
        evolvesTo: evolutionsByFromSpecies.get(model.id) ?? [],
      },
      source,
    };
    const pokemonLearnset = learnsets.get(String(model.pokemonId)) ?? [];
    const definitionValidation = {
      schemaVersion: 1,
      pokemonId,
      status: "approved",
      validatedAt: RETRIEVED_AT,
      validationLevel: "automated-schema-coverage-and-referential-integrity",
      sourceRevision: source.sourceRevision,
      checks: {
        pokemonDefinitionPresent: true,
        baseStatCount: Object.keys(model.baseStats).length,
        typeCount: model.types.length,
        abilityReferenceCount: abilities.length,
        learnsetMoveReferenceCount: pokemonLearnset.length,
        sourceRevisionPinned: true,
      },
      limitations: [
        "Approved means the generated definition passed automated structural and referential checks.",
        "It does not represent manual verification of every game-specific rule or project balancing.",
        "Canonical source data remains separate from runtime balancing overrides.",
      ],
    };
    approvedDefinitionCount += 1;

    await Promise.all([
      writeJson(path.join(creatureRoot, "manifest.json"), manifest),
      writeJson(
        path.join(creatureRoot, "definitions", "status.json"),
        definitionValidation,
      ),
      writeJson(
        path.join(creatureRoot, "definitions", "pokemon.json"),
        pokemonDefinition,
      ),
      writeJson(path.join(creatureRoot, "definitions", "abilities.json"), {
        schemaVersion: 2,
        pokemonId,
        abilities,
        source,
      }),
      writeCompactJson(path.join(creatureRoot, "definitions", "moves.json"), {
        schemaVersion: 2,
        pokemonId,
        format: {
          moveTuple: ["moveId", "learnMethods"],
          learnMethodTuple: [
            "versionGroupId",
            "methodId",
            "level",
            "order",
            "masteryLevel",
            "machines",
          ],
          machineTuple: ["machineNumber", "itemSlug"],
        },
        catalogs: {
          moves: "../../../catalogs/moves.json",
          moveMethods: "../../../catalogs/move-methods.json",
          versionGroups: "../../../catalogs/version-groups.json",
        },
        moves: pokemonLearnset,
        source,
      }),
      writeCompactJson(path.join(creatureRoot, "sprites", "inventory.json"), {
        schemaVersion: 2,
        pokemonId,
        source: spriteSource,
        sourceUrlBase: `https://raw.githubusercontent.com/${SPRITES_REPOSITORY}/${spritesSha}/`,
        rightsCatalogPath: "../../../catalogs/asset-rights.json",
        mediaImportedCount: repositorySprites.length,
        statusSummary: inventorySummary(spriteEntries),
        entries: spriteEntries,
      }),
      writeCompactJson(
        path.join(creatureRoot, "animations", "inventory.json"),
        {
          schemaVersion: 2,
          pokemonId,
          source: spriteSource,
          sourceUrlBase: `https://raw.githubusercontent.com/${SPRITES_REPOSITORY}/${spritesSha}/`,
          rightsCatalogPath: "../../../catalogs/asset-rights.json",
          mediaImportedCount: 0,
          statusSummary: inventorySummary(animationEntries),
          entries: animationEntries,
        },
      ),
      writeJson(path.join(creatureRoot, "sounds", "inventory.json"), {
        schemaVersion: 2,
        pokemonId,
        source: {
          retrievedAt: RETRIEVED_AT,
          sourceRevision: null,
          sourceUrls: [],
          licenseStatus: "pending",
          requiredCredits: [],
          notes: [
            "Sound research and acquisition are reserved for a future authorized task.",
          ],
        },
        statusSummary: inventorySummary([]),
        entries: [],
      }),
      writeFile(
        path.join(creatureRoot, "README.md"),
        `# ${dex} ${model.canonicalName}\n\n` +
          `Dados canônicos e inventários auditáveis de \`${model.slug}\`.\n\n` +
          "- `definitions/`: espécie, habilidades, learnset e status de validação.\n" +
          (repositorySprites.length > 0
            ? `- \`sprites/\`: inventário e ${repositorySprites.length} sprites compactos de batalha versionados por decisão do proprietário.\n`
            : "- `sprites/`: candidatos estáticos; nenhum binário é versionado.\n") +
          "- `animations/`: candidatos animados; nenhum binário é versionado.\n" +
          "- `sounds/`: reservado para uma tarefa futura.\n\n" +
          "O estado `doubtful` registra que a publicação decidida pelo proprietário não resolve os direitos de terceiros e ainda não autoriza uso pelo runtime.\n",
        "utf8",
      ),
    ]);

    summaries.push({
      id: pokemonId,
      nationalDexNumber: model.id,
      canonicalName: model.canonicalName,
      slug: model.slug,
      path: `creatures/${folderName}`,
      assetStatus: repositorySprites.length > 0 ? "doubtful" : "pending",
      definitionStatus: "approved",
      licenseStatus: repositorySprites.length > 0 ? "doubtful" : "pending",
      spriteCandidates: spriteEntries.length,
      animationCandidates: animationEntries.length,
      localQuarantineVerified:
        speciesPrivateMirrors.length === BATTLE_SPRITE_VARIANTS.length,
    });
  }

  await Promise.all([
    writeJson(path.join(CATALOGS_ROOT, "moves.json"), {
      schemaVersion: 2,
      count: moveCatalog.length,
      language: "en",
      source,
      moves: moveCatalog,
    }),
    writeJson(path.join(CATALOGS_ROOT, "abilities.json"), {
      schemaVersion: 2,
      count: abilityCatalog.length,
      language: "en",
      source,
      abilities: abilityCatalog,
    }),
    writeJson(path.join(CATALOGS_ROOT, "version-groups.json"), {
      schemaVersion: 2,
      count: versionGroupCatalog.length,
      source,
      versionGroups: versionGroupCatalog,
    }),
    writeJson(path.join(CATALOGS_ROOT, "move-methods.json"), {
      schemaVersion: 2,
      source,
      methods: tables["pokemon_move_methods.csv"].map((method) => ({
        id: toInteger(method.id),
        slug: method.identifier,
      })),
    }),
    writeJson(path.join(CATALOGS_ROOT, "asset-rights.json"), {
      schemaVersion: 2,
      source: spriteSource,
      policies: [
        {
          id: "official-image-rights-unclear",
          authorOrRipper:
            "Official-image provenance; individual ripper not established by the source index.",
          licenseOrCondition:
            "The source declares The Pokémon Company copyright and also applies CC0; authority to license the image is unclear.",
          status: "doubtful",
          requiredCredits: [
            "The Pokémon Company, according to the source repository declaration.",
          ],
          limitations: [
            PUBLISH_BATTLE_SPRITES
              ? "Published after explicit repository-owner direction despite unresolved third-party redistribution rights."
              : "Not approved for publication in this public repository.",
            "Do not hotlink in the game runtime.",
            "Legal review is required before distribution or runtime use.",
          ],
        },
        {
          id: "smogon-project-specific",
          authorOrRipper: "Smogon community and individual credited artists.",
          licenseOrCondition:
            "Some Smogon projects permit non-commercial use with credits, while redistribution is restricted or unclear; collection-specific terms control.",
          status: "pending",
          requiredCredits: [
            "Smogon sprite project and the individual artists named by the applicable project.",
          ],
          limitations: [
            "Not approved for publication in this public repository.",
            "Do not hotlink in the game runtime.",
            "Verify the exact project thread and credits before use.",
          ],
        },
      ],
    }),
  ]);

  const manifest = {
    schemaVersion: 2,
    id: "pokemon-canonical",
    version: 2,
    title: "Pokémon canonical definitions and asset inventory",
    completionStatus: PUBLISH_BATTLE_SPRITES
      ? "complete-definitions-battle-sprites"
      : "complete-metadata-inventory",
    author: "Projeto LT",
    licenseStatus: PUBLISH_BATTLE_SPRITES ? "doubtful" : "pending",
    source,
    spriteSource,
    scope: {
      firstNationalDexNumber: 1,
      lastNationalDexNumber: NATIONAL_DEX_LIMIT,
      speciesCount: summaries.length,
      moveCount: moveCatalog.length,
      abilityCount: abilityCatalog.length,
      spriteCandidateCount,
      animationCandidateCount,
      localPrivateSpriteCount: privateSpriteCount,
      mediaImportedCount: publishedSpriteCount,
      approvedDefinitionCount,
      excluded: [
        "Animation and sound binaries in the public repository",
        "Non-default forms as standalone creature folders",
        "Project-specific balancing overrides",
      ],
    },
    creatures: summaries,
  };
  await writeJson(path.join(PACK_ROOT, "manifest.json"), manifest);

  const report = {
    generatedAt: new Date().toISOString(),
    pokeapiRevision: pokeapiSha,
    spritesRevision: spritesSha,
    speciesCount: summaries.length,
    firstSpecies: summaries[0],
    lastSpecies: summaries.at(-1),
    moveCount: moveCatalog.length,
    abilityCount: abilityCatalog.length,
    versionGroupCount: versionGroupCatalog.length,
    spriteTreeBlobCount: spriteTree.length,
    spriteCandidateCount,
    animationCandidateCount,
    privateSpriteCount,
    mediaFilesTracked: publishedSpriteCount,
    approvedDefinitionCount,
    definitionsModel:
      "Per-Pokémon learnsets reference normalized move and ability catalogs.",
  };
  await writeJson(path.join(REPORTS_ROOT, "generation-report.json"), report);

  const privateBytes =
    DOWNLOAD_PRIVATE_SPRITES || PUBLISH_BATTLE_SPRITES
      ? await directorySize(PRIVATE_ROOT)
      : 0;
  globalThis.console.log(JSON.stringify({ ...report, privateBytes }, null, 2));
}

async function directorySize(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    total += entry.isDirectory()
      ? await directorySize(entryPath)
      : (await stat(entryPath)).size;
  }
  return total;
}

await main();
