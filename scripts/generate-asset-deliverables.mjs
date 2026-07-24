import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function writeText(relativePath, value) {
  await writeFile(path.join(ROOT, relativePath), value, "utf8");
}

function csvValue(value) {
  const text =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join("|")
        : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers, rows) {
  return `${[
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvValue(row[header])).join(","),
    ),
  ].join("\n")}\n`;
}

function countBy(values) {
  return Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((value) => [
        value,
        values.filter((candidate) => candidate === value).length,
      ]),
  );
}

function markdownCounts(counts) {
  return Object.entries(counts)
    .map(([name, count]) => `| ${name} | ${count} |`)
    .join("\n");
}

async function readStaticAssets() {
  const index = await readJson("content/assets/catalogs/static-sprites.json");
  const shards = await Promise.all(
    index.shards.map((shard) => readJson(shard.path)),
  );
  return shards.flatMap((shard) => shard.assets);
}

async function main() {
  const [
    staticAssets,
    approved,
    audioCandidates,
    animations,
    sources,
    coverage,
    manifest,
  ] = await Promise.all([
    readStaticAssets(),
    readJson("content/assets/catalogs/approved-library.json"),
    readJson("content/assets/catalogs/audio.json"),
    readJson("content/assets/catalogs/animations.json"),
    readJson("content/assets/source-registry.json"),
    readJson("content/assets/coverage.json"),
    readJson("content/packs/production-assets/manifest.json"),
  ]);
  const approvedVisual = approved.assets.filter((asset) =>
    asset.mimeType.startsWith("image/"),
  );
  const approvedAudio = approved.assets.filter((asset) =>
    asset.mimeType.startsWith("audio/"),
  );
  const characterRows = approvedVisual.flatMap((asset) =>
    (asset.atlasGroups?.characterCandidates ?? []).map((frameIndex) => ({
      id: `${asset.assetId}:frame-${String(frameIndex).padStart(4, "0")}`,
      source_asset_id: asset.assetId,
      atlas_path: asset.localPath,
      frame_index: frameIndex,
      frame_width: 16,
      frame_height: 16,
      coverage: "static-candidate",
      idle: "candidate",
      walk_up: "missing",
      walk_down: "missing",
      walk_left: "missing",
      walk_right: "missing",
      run: "missing",
      interaction: "missing",
      portrait: "missing",
      battle: "missing",
      status: "approved-source-semantic-pending",
      license: "CC0-1.0",
      runtime_enabled: false,
    })),
  );

  const spriteRows = [
    ...staticAssets.map((asset) => ({
      id: asset.assetId,
      category: asset.assetType,
      species_id: asset.speciesId,
      pokemon_id: asset.pokemonId,
      form_id: asset.formId,
      variant: asset.variantId,
      orientation: asset.orientation,
      shiny: asset.shiny,
      animated: asset.animated,
      format: asset.format,
      width: asset.width,
      height: asset.height,
      frame_count: asset.frameCount,
      size_bytes: asset.sizeBytes,
      sha256: asset.sha256,
      source_id: asset.sourceId,
      source_revision: asset.sourceRevision,
      source_path: asset.sourcePath,
      local_path: asset.localPath,
      license_status: asset.licenseStatus,
      compatibility_score: 100,
      compatibility_class: "temporary-baseline-only",
      runtime_enabled: asset.runtimeEnabled,
      replacement_required: asset.replacementRequired,
    })),
    ...approvedVisual.map((asset) => ({
      id: asset.assetId,
      category: asset.assetType,
      species_id: "",
      pokemon_id: "",
      form_id: "",
      variant: asset.variantId,
      orientation: asset.orientation,
      shiny: false,
      animated: false,
      format: asset.format,
      width: asset.width,
      height: asset.height,
      frame_count: asset.atlasFrameCount ?? asset.frameCount,
      size_bytes: asset.sizeBytes,
      sha256: asset.sha256,
      source_id: asset.sourceId,
      source_revision: asset.sourceRevision,
      source_path: asset.sourcePath,
      local_path: asset.localPath,
      license_status: asset.licenseStatus,
      compatibility_score: asset.compatibilityScore,
      compatibility_class: asset.compatibilityClass,
      runtime_enabled: asset.runtimeEnabled,
      replacement_required: asset.replacementRequired,
    })),
  ];

  const audioRows = [
    ...audioCandidates.assets.map((asset) => ({
      id: asset.assetId,
      category: "cry-reference",
      local_path: "",
      source_id: asset.sourceId,
      source_revision: asset.sourceRevision,
      source_path: asset.sourcePath,
      format: asset.format,
      duration_ms: "",
      channels: "",
      sample_rate: "",
      loudness_dbfs: "",
      peak_amplitude: "",
      clipping: "not-measured",
      size_bytes: asset.sizeBytes,
      sha256: "",
      license_status: asset.licenseStatus,
      runtime_enabled: false,
      decision: "",
      notes: "Reference only; binary not downloaded.",
    })),
    ...approvedAudio.map((asset) => ({
      id: asset.assetId,
      category: asset.category,
      local_path: asset.localPath,
      source_id: asset.sourceId,
      source_revision: asset.sourceRevision,
      source_path: asset.sourcePath,
      format: asset.format,
      duration_ms: asset.durationMs,
      channels: asset.channels,
      sample_rate: asset.sampleRate,
      loudness_dbfs: asset.loudness,
      peak_amplitude: asset.peakAmplitude,
      clipping: asset.clippingDetected,
      size_bytes: asset.sizeBytes,
      sha256: asset.sha256,
      license_status: asset.licenseStatus,
      runtime_enabled: asset.runtimeEnabled,
      decision: asset.decisionId,
      notes: asset.notes,
    })),
    ...approved.rejectedAssets.map((asset) => ({
      id: asset.assetId,
      category: "rejected-audio",
      local_path: "",
      source_id: asset.sourceId,
      source_revision: asset.sourceRevision,
      source_path: asset.sourcePath,
      format: "ogg",
      duration_ms: "",
      channels: "",
      sample_rate: "",
      loudness_dbfs: "",
      peak_amplitude: asset.peakAmplitude,
      clipping: true,
      size_bytes: "",
      sha256: asset.sha256,
      license_status: "rejected",
      runtime_enabled: false,
      decision: "D-025",
      notes: asset.reason,
    })),
  ];

  const animationRows = [
    ...animations.proceduralProfiles.map((profile) => ({
      id: profile.id,
      kind: "procedural",
      source_id: "project-metadata",
      local_path: "content/assets/catalogs/animations.json",
      frame_count: profile.frames.length,
      duration_ms: profile.durationMs,
      loop: profile.loop,
      status: "approved",
      runtime_enabled: false,
      gap: "",
    })),
    {
      id: "frame-animation-coverage",
      kind: "frame",
      source_id: "",
      local_path: "",
      frame_count: 0,
      duration_ms: "",
      loop: false,
      status: "missing",
      runtime_enabled: false,
      gap: "No approved frame animation in this batch.",
    },
  ];

  const gaps = {
    schemaVersion: 1,
    generatedAt: "2026-07-24",
    pokemon: coverage.gaps,
    characters: {
      approvedStaticCandidates: characterRows.length,
      directionalWalkCycles: 0,
      idleCycles: 0,
      runCycles: 0,
      portraits: 0,
      battlePoses: 0,
    },
    world: {
      approvedTilesets: 2,
      approvedWorldSheets: 2,
      semanticallyMappedFrames: 0,
      missingContexts: [
        "beach",
        "snow",
        "desert",
        "farm",
        "laboratory",
        "healing-center",
        "arena",
      ],
    },
    audio: {
      approved: approvedAudio.length,
      rejectedForClipping: approved.rejectedAssets.length,
      pokemonCriesApproved: 0,
      completeMusicLoops: 0,
      missingCategories: [
        "creature-cries",
        "weather-ambience",
        "water-ambience",
        "forest-ambience",
        "cave-ambience",
        "city-ambience",
        "full-music-loops",
      ],
    },
    animation: {
      proceduralProfiles: animations.proceduralProfiles.length,
      approvedFrameAnimations: animations.frameAnimations.length,
      approvedStaticVfx: approvedVisual.filter(
        (asset) => asset.assetType === "visual-effect",
      ).length,
    },
  };

  const quarantine = {
    schemaVersion: 1,
    generatedAt: "2026-07-24",
    policy:
      "No restricted binary was added by this task. Existing D-023 files remain public temporary exceptions and are not runtime assets.",
    groups: [
      {
        id: "pokemon-d023-temporary-sprites",
        status: "doubtful",
        count: staticAssets.length,
        binaryLocation: "content/packs/pokemon-canonical/creatures",
        runtimeEnabled: false,
        action: "replace with original or demonstrably licensed media",
      },
      {
        id: "pokemon-cry-references",
        status: "doubtful",
        count: audioCandidates.assets.length,
        binaryLocation: null,
        runtimeEnabled: false,
        action: "keep as metadata only; design original cries",
      },
      {
        id: "kenney-audio-clipping-rejections",
        status: "rejected",
        count: approved.rejectedAssets.length,
        binaryLocation: null,
        runtimeEnabled: false,
        action:
          "do not publish; choose another source file or normalize only after explicit derivative approval",
      },
    ],
  };

  const categoryCounts = countBy(
    approved.assets.map((asset) => asset.category),
  );
  const sourceRows = sources.sources
    .filter((source) => source.sourceId.startsWith("kenney-"))
    .map(
      (source) =>
        `| ${source.sourceId} | ${source.version} | ${source.license} | ${source.archiveSha256} | [página](${source.url}) |`,
    )
    .join("\n");
  const compatibilityRows = approvedVisual
    .map(
      (asset) =>
        `| ${asset.assetId} | ${asset.compatibilityScore} | ${asset.compatibilityClass} | ${asset.notes} |`,
    )
    .join("\n");

  const inventoryDocument = `# Inventário final de assets

## Escopo

Inventário consolidado em 2026-07-24. Os arquivos Kenney foram copiados byte a byte
de oito arquivos oficiais CC0 e permanecem desabilitados no runtime até revisão do
proprietário. Os 4.100 PNGs Pokémon anteriores continuam como exceção temporária
D-023, com direitos \`doubtful\`.

## Totais

| Item | Quantidade |
| --- | ---: |
| Imagens Pokémon temporárias | ${staticAssets.length} |
| Imagens CC0 aprovadas | ${approvedVisual.length} |
| Sons e jingles CC0 aprovados | ${approvedAudio.length} |
| Atlases JSON | ${approved.supportingFiles.length} |
| Perfis procedurais | ${animations.proceduralProfiles.length} |
| Áudios rejeitados por clipping | ${approved.rejectedAssets.length} |
| Bytes de mídia CC0 | ${manifest.totalBytes} |
| Assets habilitados no runtime | 0 |

## Biblioteca CC0 por categoria

| Categoria | Arquivos |
| --- | ---: |
${markdownCounts(categoryCounts)}

O inventário por arquivo, incluindo nome, caminho, hash, dimensões, duração, origem,
revisão, licença e status, está em \`final-sprites.csv\`, \`final-audio.csv\`,
\`final-characters.csv\` e \`final-animations.csv\`.
`;

  const coverageDocument = `# Relatório de cobertura de assets

## Pokémon

- espécies com pasta e quatro sprites temporários: ${coverage.pokemon.species};
- formas catalogadas: ${coverage.pokemon.formsCataloged};
- frente normal, costas normal, frente shiny e costas shiny: ${coverage.pokemon.variants["front-normal"]} por slot;
- sprites Pokémon com licença aprovada: 0;
- animações de quadros Pokémon aprovadas: 0;
- cries Pokémon aprovados: 0;
- runtime Pokémon: 0.

## Biblioteca aprovada

- ${approvedVisual.length} imagens reais CC0;
- ${approvedAudio.length} sons/jingles reais CC0;
- 2 tilesets de 132 frames;
- 1 sheet de interface com 161 frames;
- ${characterRows.length} frames candidatos a personagens, ainda sem ciclo direcional;
- ${approvedVisual.filter((asset) => asset.assetType === "visual-effect").length} partículas/VFX estáticos;
- ${animations.proceduralProfiles.length} perfis procedurais;
- ${approved.rejectedAssets.length} áudios rejeitados por clipping.

As lacunas estruturadas estão em \`content/assets/asset-gaps.json\`.
`;

  const characterDocument = `# Pesquisa de sprites de personagens

## Entrega aprovada

O sheet Tiny Dungeon 1.0 fornece ${characterRows.length} frames estáticos candidatos
a protagonista, NPCs, treinadores e criaturas, em grade 16 × 16. A classificação foi
feita por inspeção visual do sheet original e registrada no atlas; nomes, funções e
identidades ainda não foram atribuídos.

Não existe nesta entrega um ciclo comprovado de caminhada em quatro direções, corrida,
interação, retrato ou pose de batalha. Portanto, nenhum personagem está pronto para
runtime. O pack serve para prototipagem visual e definição de escala.

## Fontes de referência

- Kenney Tiny Dungeon: CC0, importado;
- Kenney Roguelike Characters: candidato futuro, ainda não importado;
- OpenGameArt e itch.io: avaliação por item, sem aprovação de plataforma;
- Pokémon Essentials, Showdown, PokeMMO e jogos comerciais: referência de cobertura,
  nunca fonte automática de arquivos.
`;

  const worldDocument = `# Pesquisa de assets de mundo

## Assets entregues

- Tiny Town 1.1: 132 frames de terreno, vegetação, edifícios, interiores e objetos;
- Tiny Dungeon 1.0: 132 frames de dungeon, portas, mobiliário, cercas, personagens,
  criaturas e props;
- UI Pack - Pixel Adventure 1.0: 161 frames para controles e painéis.

Todos são CC0, 16 × 16, byte-idênticos à origem e têm atlas determinístico. Eles são
coerentes entre si na escala Tiny, mas exigem mapeamento semântico e composição de
mapas antes do runtime. Praia, neve, deserto, fazenda, laboratório, centro de cura e
arena ainda são lacunas.
`;

  const audioDocument = `# Relatório de fontes de áudio

## Resultado

- 39 OGGs CC0 aprovados e publicados;
- 9 OGGs rejeitados após decode por pico absoluto acima de 1,0;
- 2.000 cries Pokémon mantidos apenas como referência;
- 0 cries Pokémon aprovados;
- 6 jingles curtos aprovados, mas nenhuma música completa em loop.

Cada OGG aprovado foi decodificado com python-soundfile 0.13.1/libsndfile e também
validado estruturalmente pelo auditor Node. O CSV registra duração, canais, sample
rate, RMS em dBFS, pico, hash e clipping.

## Fontes exatas

| Fonte | Versão | Licença | SHA-256 do ZIP | Evidência |
| --- | --- | --- | --- | --- |
${sourceRows}

Para cries próprios, a estratégia recomendada é síntese original por camadas,
gravações próprias e processamento documentado, ou contratação com licença explícita.
`;

  const animationDocument = `# Relatório de fontes de animação

- perfis procedurais existentes: ${animations.proceduralProfiles.length};
- animações de quadros aprovadas: ${animations.frameAnimations.length};
- VFX PNG CC0 aprovados: ${approvedVisual.filter((asset) => asset.assetType === "visual-effect").length};
- candidatos animados Pokémon bloqueados: ${animations.blockedCandidateCount}.

Os VFX são imagens de alta resolução e antialiasing. Podem ser usados em efeitos
isolados com partículas, máscaras e tint, mas não devem ser misturados como sprites
de mundo 16 × 16. Nenhum GIF remoto ou frame derivado de franquia foi importado.
`;

  const compatibilityDocument = `# Relatório de compatibilidade visual

## Critérios

Notas consideram resolução, densidade, escala, perspectiva, contorno, paleta,
transparência e coerência com o protótipo Phaser.

| Asset | Nota | Classe | Observação |
| --- | ---: | --- | --- |
${compatibilityRows}

Os sheets Tiny formam uma família coerente. Os VFX Kenney Particle são seguros e
úteis, mas pertencem a um estilo antialiasado distinto e devem permanecer em contexto
isolado. Nenhum deles substitui os sprites de batalha Pokémon 96 × 96.
`;

  const replacementDocument = `# Plano de substituição de assets

1. Manter os IDs lógicos e nunca referenciar caminho físico em save ou regra.
2. Substituir primeiro uma família evolutiva Pokémon por arte original contratada.
3. Exigir frente, costas, shiny, formas, gênero, hash, autoria e licença por slot.
4. Validar o piloto sem ativar D-023 nem os cries.
5. Criar ciclos direcionais originais para personagens na escala escolhida.
6. Mapear semanticamente os frames Tiny antes de qualquer loader.
7. Criar cries e loops musicais originais com sessões e stems arquivados.
8. Remover os binários D-023 somente após cobertura licenciada equivalente.

O lote Kenney pode permanecer como fallback licenciado. A identidade final do jogo
deve priorizar assets próprios e consistentes.
`;

  const quarantineDocument = `# Relatório de quarentena e rejeição

Nenhum binário restrito novo foi publicado nesta tarefa.

- 4.100 PNGs Pokémon D-023: \`doubtful\`, fora do runtime, substituição obrigatória;
- 2.000 cries: apenas metadados, nenhum binário local;
- 9 OGGs Kenney: licença aprovada, mas rejeitados tecnicamente por clipping;
- arquivos privados de download e análise permanecem sob \`.private/\`, ignorados pelo Git.

O JSON \`content/assets/quarantine-report.json\` contém os grupos e ações.
`;

  const notices = `# Third-party notices

## Kenney CC0 asset batch

The files under \`content/packs/production-assets\` were created and distributed by
Kenney (https://kenney.nl) under Creative Commons CC0 1.0. Attribution is not
required, but the project recommends crediting Kenney. Exact pack pages, versions,
archive hashes and original license texts are recorded in the pack.

Packs: Tiny Dungeon 1.0, Tiny Town 1.1, UI Pack - Pixel Adventure 1.0, Particle
Pack 1.0, Interface Sounds 1.0, Impact Sounds 1.0, RPG Audio 1.0 and Music Jingles
1.0.

## Temporary Pokémon reference assets

The \`pokemon-canonical\` pack remains a temporary owner-authorized reference under
D-023. Its files are marked \`doubtful\`, disabled at runtime and scheduled for
replacement. Their inclusion is not represented as a license from the franchise
rights holders.
`;

  const packReadme = `# Production assets

Curated CC0 media imported from eight exact Kenney packs.

- media files: ${approved.assets.length};
- PNG files: ${approvedVisual.length};
- OGG files: ${approvedAudio.length};
- rejected source files: ${approved.rejectedAssets.length};
- media bytes: ${manifest.totalBytes};
- runtime: disabled pending owner review.

Run \`pnpm assets:validate\` to verify signatures, decode metadata, hashes,
provenance, duplicate IDs, registered paths and quarantine boundaries.

The private source archives and decode workspace are intentionally ignored by Git.
Reimport requires \`pnpm assets:import\` with the exact archives under
\`.private/production-assets/source-archives\`.
`;

  await Promise.all([
    writeText(
      "docs/assets/final-sprites.csv",
      csv(Object.keys(spriteRows[0]), spriteRows),
    ),
    writeText(
      "docs/assets/final-characters.csv",
      csv(Object.keys(characterRows[0]), characterRows),
    ),
    writeText(
      "docs/assets/final-audio.csv",
      csv(Object.keys(audioRows[0]), audioRows),
    ),
    writeText(
      "docs/assets/final-animations.csv",
      csv(Object.keys(animationRows[0]), animationRows),
    ),
    writeText(
      "content/assets/asset-gaps.json",
      `${JSON.stringify(gaps, null, 2)}\n`,
    ),
    writeText(
      "content/assets/quarantine-report.json",
      `${JSON.stringify(quarantine, null, 2)}\n`,
    ),
    writeText("docs/assets/final-asset-inventory.md", inventoryDocument),
    writeText("docs/assets/asset-coverage-report.md", coverageDocument),
    writeText("docs/assets/character-sprite-research.md", characterDocument),
    writeText("docs/assets/world-asset-research.md", worldDocument),
    writeText("docs/assets/audio-source-report.md", audioDocument),
    writeText("docs/assets/animation-source-report.md", animationDocument),
    writeText(
      "docs/assets/visual-compatibility-report.md",
      compatibilityDocument,
    ),
    writeText("docs/assets/asset-replacement-plan.md", replacementDocument),
    writeText("docs/assets/asset-quarantine-report.md", quarantineDocument),
    writeText("THIRD_PARTY_NOTICES.md", notices),
    writeText("content/packs/production-assets/README.md", packReadme),
  ]);

  process.stdout.write(
    `${JSON.stringify(
      {
        spriteRows: spriteRows.length,
        characterRows: characterRows.length,
        audioRows: audioRows.length,
        animationRows: animationRows.length,
        reports: 9,
        approvedAssets: approved.assets.length,
      },
      null,
      2,
    )}\n`,
  );
}

await main();
