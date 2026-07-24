# Catálogo Pokémon canônico

Este pack organiza as 1.025 espécies da National Pokédex, de Bulbasaur a
Pecharunt, sem acoplar a engine a nomes ou caminhos de assets.

## Estrutura

```text
pokemon-canonical/
├── catalogs/
│   ├── abilities.json
│   ├── asset-rights.json
│   ├── move-methods.json
│   ├── moves.json
│   └── version-groups.json
├── creatures/
│   └── 0001-bulbasaur/
│       ├── definitions/
│       │   ├── abilities.json
│       │   ├── moves.json
│       │   ├── pokemon.json
│       │   └── status.json
│       ├── sprites/
│       │   ├── 0001-bulbasaur--pokeapi-default--back--normal.png
│       │   ├── 0001-bulbasaur--pokeapi-default--back--shiny.png
│       │   ├── 0001-bulbasaur--pokeapi-default--front--normal.png
│       │   ├── 0001-bulbasaur--pokeapi-default--front--shiny.png
│       │   └── inventory.json
│       ├── animations/inventory.json
│       ├── sounds/inventory.json
│       ├── manifest.json
│       └── README.md
├── reports/generation-report.json
├── schemas/pokemon-content.schema.json
└── manifest.json
```

Cada `moves.json` é normalizado. O primeiro valor de cada tupla é um `moveId`
resolvido em `catalogs/moves.json`; os métodos referenciam
`catalogs/move-methods.json` e os jogos/gerações referenciam
`catalogs/version-groups.json`. O próprio arquivo declara a ordem dos campos em
`format`, evitando duplicar a definição completa de um golpe milhares de vezes.

As habilidades possíveis e seus efeitos em inglês permanecem expandidos em cada
Pokémon. O inglês é preservado como texto auditável da fonte; traduções futuras
devem ser dados derivados do projeto e não substituir o conteúdo coletado.

Cada pasta `definitions/` possui um `status.json`. O estado `approved` confirma
validação automatizada de schema, cobertura e integridade referencial. Ele não
declara revisão manual de cada regra específica de cada jogo nem aprovação de
balanceamento para o runtime.

## Sprites reais

O inventário foi criado a partir da revisão exata do repositório
`PokeAPI/sprites` registrada no manifesto. Foram catalogados sprites estáticos,
costas, shiny, gêneros, jogos, arte oficial, HOME, Showdown e animações quando
existentes.

Quatro sprites compactos de batalha de cada uma das 1.025 espécies foram baixados,
inspecionados e publicados: frente normal, frente shiny, costas normal e costas
shiny. As cópias originais continuam em `.private/pokemon-canonical/`, ignorada pelo
Git, e cada inventário registra os dois caminhos, variante, SHA-256, tamanho e
dimensões.

A publicação não altera o estado jurídico para `approved`. A licença do repositório
de origem declara simultaneamente CC0 e copyright da The Pokémon Company, portanto
não demonstra autoridade clara para relicenciar a arte. Os arquivos permanecem
marcados como `doubtful`, com créditos e limitações centralizados em
`asset-rights.json`, e não são carregados automaticamente pelo runtime.

O manifesto global reforça essa condição com
`publicationPolicy: temporary-owner-authorized-reference`,
`runtimeEnabled: false` e `replacementRequired: true`. O gate de licença reconhece
somente essa exceção nominal; ela não torna outros packs sem procedência publicáveis.

## Substituição futura

Cada arquivo ocupa um slot semântico registrado em `sprites/inventory.json`:
`front-normal`, `front-shiny`, `back-normal` ou `back-shiny`. Para trocar a coleção,
preservar o `pokemonId` e o `variantId`, substituir o caminho indicado por
`repositoryAsset` e regenerar SHA-256, dimensões, fonte, créditos e licença. A engine
deve resolver esses slots por catálogo, nunca pelo nome físico do PNG.

Quando todos os arquivos tiverem licença verificável, remover a exceção temporária,
alterar `replacementRequired` para `false` e somente então avaliar
`runtimeEnabled: true` em tarefa separada.

## Regeneração

```text
pnpm content:pokemon
pnpm content:pokemon -- --with-private-sprites
pnpm content:pokemon -- --with-private-sprites --publish-battle-sprites \
  --pokeapi-revision=<sha> --sprites-revision=<sha>
```

O primeiro comando regenera definições e inventários usando cache local. O segundo
também mantém a quarentena privada. A terceira forma publica os sprites de batalha e
deve sempre receber as revisões auditadas. `--refresh` atualiza caches e deve ser
usado somente em uma tarefa autorizada de atualização de fonte.

## Estado de aprovação

- definições: `approved` por validação automatizada, com limitações em `status.json`;
- sprites de batalha publicados: `doubtful`;
- demais sprites/animações: `pending`, `doubtful` ou `quarantined`;
- sons: pendentes e reservados para tarefa futura;
- mídia importada no pack público: 4.100 PNGs.

Estados diferentes de `approved` não autorizam a engine a carregar o conteúdo.
