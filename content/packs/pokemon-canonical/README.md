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
shiny. As cópias originais continuam em
`.private/pokemon-canonical/sprite-revisions/<sprites-sha>/`, ignorada pelo Git. Uma
revisão nunca reutiliza silenciosamente o cache de outra. Cada inventário registra os
dois caminhos, variante, SHA-256, tamanho, dimensões e transparência real decodificada.

A publicação não altera o estado jurídico para `approved`. A licença do repositório
de origem declara simultaneamente CC0 e copyright da The Pokémon Company, portanto
não demonstra autoridade clara para relicenciar a arte. Os arquivos permanecem
marcados como `doubtful`, com créditos e limitações centralizados em
`asset-rights.json`, e não são carregados automaticamente pelo runtime.

O manifesto global reforça essa condição com
`publicationPolicy: temporary-owner-authorized-reference`,
`runtimeEnabled: false` e `replacementRequired: true`. O gate de licença reconhece
somente essa exceção nominal; ela não torna outros packs sem procedência publicáveis.
A autorização do proprietário é vinculada à decisão D-023 e à data fixa
`2026-07-23`; `retrievedAt` registra coleta e não altera a data da decisão.

## Verificação de integridade

```text
pnpm content:pokemon:audit
pnpm security:runtime-content
```

A auditoria é offline e percorre todas as 1.025 espécies e todos os 4.100 arquivos
publicados. Ela confirma existência, caminho seguro e único, bytes, SHA-256,
dimensões, variantes, manifesto, inventários e metadados jurídicos. Cada PNG é
estruturalmente analisado, tem CRC verificado, é realmente decodificado e é rejeitado
se estiver truncado, corrompido, animado, sem dimensões válidas ou acima dos limites
de 2.048 pixels por eixo e 4.194.304 pixels totais.

O gate de runtime examina código e entradas carregáveis em `apps/` e `packages/`.
Qualquer import, `require`, URL, loader, caminho físico ou referência ao pack é erro
enquanto a política continuar temporária, os direitos forem `doubtful` ou
`runtimeEnabled` permanecer falso. Os dois comandos fazem parte de `pnpm check`.

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
deve sempre receber as revisões auditadas. `--refresh` atualiza somente o cache da
revisão selecionada e deve ser usado apenas em uma tarefa autorizada de atualização
de fonte.

## Estado de aprovação

- definições: `approved` por validação automatizada, com limitações em `status.json`;
- sprites de batalha publicados: `doubtful`;
- demais sprites/animações: `pending`, `doubtful` ou `quarantined`;
- sons: pendentes e reservados para tarefa futura;
- mídia importada no pack público: 4.100 PNGs.

Estados diferentes de `approved` não autorizam a engine a carregar o conteúdo.
