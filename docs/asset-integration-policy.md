# Política de integração de assets

## Estado

Esta política implementa a D-024 sobre os resultados da auditoria do PR #21 e a
D-025 para o primeiro lote exato CC0.
Disponibilidade não significa aprovação. No estado atual:

- 4.100 PNGs temporários D-023 estão no repositório, com direitos `doubtful`;
- 2.000 cries estão apenas catalogados, sem download ou hash local;
- 20 perfis procedurais e 937 mapeamentos de apresentação são metadados;
- zero mídia Pokémon está habilitada no runtime;
- 54 arquivos Kenney CC0 foram aprovados para redistribuição, mas não para runtime;
- 15 PNGs e 39 OGGs estão no pack `production-assets`;
- nove candidatos de áudio foram rejeitados por clipping;
- zero frame animation Pokémon foi importada.

## Contratos

`content/assets/schemas/unified-asset.schema.json` define identidade, variante,
origem, revisão, caminho, formato, dimensões, frames, áudio, hash, licença, aprovação
e estado de runtime. `source-registry.schema.json` define a origem e sua evidência.

Uma fonte aprovada não aprova automaticamente um arquivo. Para runtime, o asset exige:

1. `licenseStatus: approved`;
2. fonte `approved` e `redistributionAllowed: true`;
3. revisão imutável;
4. SHA-256 e arquivo local;
5. decisão, responsável e data de aprovação próprios;
6. `replacementRequired: false`;
7. `runtimeEnabled: true`;
8. feature flag específica ativa.

`retrievedAt` nunca substitui `approvedAt`.

## Catálogos

- `source-registry.json`: 22 fontes auditadas, incluindo oito fontes exatas CC0;
- `approved-library.json`: índice dos 54 assets redistribuíveis da D-025;
- `static-sprites.json`: índice de três shards para 4.100 slots temporários;
- `audio.json`: 2.000 cries candidatos e lista vazia de efeitos originais;
- `animations.json`: 20 perfis procedurais e lista vazia de frames;
- `move-presentations.json`: apresentação para 937 movimentos, sem regra mecânica;
- `coverage.json`, `asset-gaps.json` e `quarantine-report.json`: cobertura, lacunas
  e rejeições geradas;
- `performance-baseline.json`: medições reais e itens ainda não mensuráveis.

Os IDs lógicos são estáveis. Substituir bytes licenciados não exige alterar a engine,
save ou regra de batalha.

## Feature flags

Os defaults seguros ficam em `@lt/content-contracts`:

| Flag | Default |
| --- | --- |
| `pokemonStaticSprites` | `false` |
| `pokemonProceduralAnimations` | `false` |
| `pokemonFrameAnimations` | `false` |
| `pokemonCries` | `false` |
| `battleSfx` | `false` |
| `worldSfx` | `false` |
| `uiSfx` | `false` |
| `originalCreatureAssets` | `true` |

Uma flag não supera licença, revisão, hash ou decisão. Não existe liberação global da
quarentena.

## Importação reproduzível

O lote D-025 é descrito por
`content/packs/production-assets/import-plan.json`. `pnpm assets:import` exige os
oito ZIPs exatos no cache privado ignorado pelo Git, valida tamanho, SHA-256 e texto
CC0 e então copia somente a seleção aprovada. Os bytes publicados não são convertidos,
recortados ou reamostrados.

`pnpm assets:inventory` regenera catálogos, cobertura e relatórios. O comando não
baixa arquivos. Arquivos de origem continuam fora do Git para evitar publicar
material não selecionado.

## Importação futura

1. Selecionar um arquivo exato e registrar a evidência.
2. Fixar repositório/versão/commit antes do download.
3. Manter cache por revisão.
4. Validar assinatura, decode, formato e limites.
5. Medir metadados e calcular SHA-256.
6. Registrar transformação e ferramenta quando houver conversão.
7. Exigir permissão de modificação para derivados.
8. Adicionar teste negativo e positivo.
9. Aprovar o asset individualmente.
10. Ativar somente a flag específica após revisão.

GIF remoto não é formato de runtime. Conversão não muda titularidade. Sprites
Pokémon não recebem frames gerados por IA.

## Animação e batalha

Os perfis usam posição, escala inteira, rotação discreta, alfa, tint, partículas e
câmera sem regravar PNGs. O Phaser usa nearest-neighbor e `roundPixels`. O evento de
dano é um marcador de apresentação; o servidor continua sendo a única autoridade
sobre dano, efeitos e progresso.

O laboratório `?asset-lab=1` existe apenas em desenvolvimento. Enquanto não houver
mídia aprovada, ele usa uma forma geométrica e não oferece seleção de espécie, forma,
shiny, perspectiva ou áudio.

## Áudio

`@lt/audio-domain` centraliza categorias, volumes, mute, persistência, preload
explícito, descarregamento, limite de vozes, prioridade, cooldown, crossfade, fallback
e desbloqueio de autoplay. Nenhuma cena recebe permissão para ignorar o gate.

Metadados de duração, sample rate, canais, clipping, silêncio e loudness dos cries
continuam desconhecidos porque os arquivos não foram baixados. Eles não podem ser
promovidos antes dessas medições e da aprovação jurídica.

## Comandos

```text
pnpm assets:import
pnpm assets:inventory
pnpm assets:validate
pnpm assets:coverage
pnpm assets:audit
pnpm content:assets:generate
pnpm content:assets:audit
pnpm content:audio:audit
pnpm content:animations:audit
pnpm security:runtime-content
pnpm check
```

## Riscos residuais

- a D-023 autoriza publicação temporária, não concede licença dos titulares;
- dados canônicos da PokéAPI continuam `pending` quanto a marcas e textos;
- os 54 assets D-025 possuem aprovação exata, mas continuam desativados no runtime;
- os atlases Tiny Dungeon e UI ainda precisam de aliases semânticos revisados;
- não há ciclo aprovado de caminhada em quatro direções neste lote;
- memória, decode, FPS mobile e preload de mídia Pokémon não podem ser medidos sem
  carregar conteúdo que hoje está bloqueado;
- o PR #23 não autoriza merge nem deploy.
