# Inventário de conteúdo

| Pack | Versão | Autoria | Licença/procedência |
| --- | ---: | --- | --- |
| `original:map:starter-house` | 1 | Projeto LT | conteúdo original do projeto |
| `original-meadow` | 1 | Projeto LT | conteúdo original do projeto |
| `original-items` | 1 | Projeto LT | conteúdo original do projeto |
| `original-creatures` | 1 | Projeto LT | conteúdo original do projeto |
| `original-quests` | 1 | Projeto LT | conteúdo original do projeto |
| `pokemon-canonical` | 2 | PokéAPI / titulares declarados na fonte | exceção temporária D-023; direitos `doubtful`; runtime bloqueado |

Os manifests são a fonte verificável e `pnpm security:licenses` rejeita autoria,
licença ou procedência ausente, caminhos perigosos e licenças fora da allowlist.
O pack `pokemon-canonical` é a única exceção: contém 4.100 sprites de referência
publicados após autorização explícita do proprietário. Ele declara
`runtimeEnabled: false`, `replacementRequired: true`, origem, revisão, créditos,
hashes e direitos `doubtful`. A exceção não representa licença dos titulares.

Qualquer novo asset deve registrar origem e licença antes de entrar no repositório.
Fora da exceção nominal D-023, material sem comprovação fica em quarentena fora do
pack e não pode ser publicado.

A auditoria ampla em `docs/assets/` registra 60.065 candidatos visuais e 2.000
candidatos de áudio apenas como disponibilidade. Nenhum desses candidatos adicionais
foi importado ou aprovado para o runtime. Os 4.100 PNGs temporários já publicados
continuam sendo a única mídia Pokémon presente no pack.

O pipeline central em `content/assets/` espelha os 4.100 arquivos temporários em um
catálogo lógico dividido em três shards e cataloga os 2.000 cries sem baixar seus
bytes. Todos possuem `runtimeEnabled: false`; cries não declaram hash local que não
foi medido. O registro possui 14 fontes de pesquisa, mas fonte registrada não equivale
a asset aprovado. No estado atual há zero mídia Pokémon aprovada para runtime, zero
frame animation e zero efeito sonoro adicional.
