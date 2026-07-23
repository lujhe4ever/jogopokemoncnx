# Fontes do catálogo Pokémon

## Escopo verificado

Esta análise cobre dados das 1.025 espécies canônicas da National Pokédex e
candidatos de sprites dos próprios Pokémon. Sprites de treinadores, NPCs e
overworlds continuam apenas como pesquisa anterior; nenhum desses materiais foi
baixado ou incorporado nesta entrega.

Data da coleta: 2026-07-23.

## Definições

| Fonte | Conteúdo usado | Autor/crédito | Condição encontrada | Estado |
| --- | --- | --- | --- | --- |
| [PokéAPI](https://pokeapi.co/) | espécies, tipos, atributos, habilidades, evoluções, golpes e learnsets | PokéAPI contributors | código/dados sob BSD-3-Clause; nomes de Pokémon são marcas da Nintendo segundo a própria licença | `pending` |
| [Revisão CSV da PokéAPI](https://github.com/PokeAPI/pokeapi/tree/091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f/data/v2/csv) | snapshot estruturado e reproduzível | PokéAPI contributors | revisão fixa usada pelo gerador | `pending` |
| [Licença da PokéAPI](https://github.com/PokeAPI/pokeapi/blob/091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f/LICENSE.md) | termos da fonte estruturada | Paul Hallett e PokéAPI contributors | BSD-3-Clause com aviso de marcas | `pending` |

Os dados canônicos permanecem separados de futuras regras de balanceamento do
projeto. Textos funcionais de golpes e habilidades são mantidos em inglês para
preservar a redação auditável da fonte. Traduções deverão ser adicionadas como
camada derivada e revisada.

## Sprites dos Pokémon

| Fonte | Tipo | Autor/ripper | Condição encontrada | Limitação | Estado |
| --- | --- | --- | --- | --- | --- |
| [PokeAPI/sprites](https://github.com/PokeAPI/sprites/tree/bf4c47ac82c33b330e33d98b8882d1cedb2f53e7) | frente, costas, shiny, gêneros, jogos, HOME, arte oficial, Showdown e animações | The Pokémon Company, Smogon e artistas citados pela coleção | o arquivo aplica CC0, mas declara que as imagens pertencem à The Pokémon Company | a fonte não demonstra autoridade clara para relicenciar toda a arte | `doubtful` |
| [Licença PokeAPI/sprites](https://github.com/PokeAPI/sprites/blob/bf4c47ac82c33b330e33d98b8882d1cedb2f53e7/LICENCE.txt) | declaração de direitos | PokeAPI | CC0 com exclusão de direitos de terceiros e sem garantia de titularidade | não autoriza publicação automática neste repositório | `doubtful` |
| [Smogon X/Y Sprite Project](https://www.smogon.com/forums/threads/x-y-sprite-project.3486712/) | sprites de batalha feitos por fãs | comunidade Smogon e artistas individuais | uso não comercial com créditos; o projeto declara que os sprites não são open source | redistribuição e créditos precisam ser verificados por coleção | `pending` |
| [Pokémon Database](https://pokemondb.net/sprites) | referência visual por jogo e variação | Nintendo/Game Freak segundo o rodapé do site | não foi encontrada autorização própria para redistribuir os sprites; hotlink é desencorajado | referência apenas | `pending` |
| [The Spriters Resource](https://www.spriters-resource.com/) | sprites extraídos de jogos | rippers identificados por página | crédito ao ripper não equivale a licença da arte original | não publicar sem autorização dos titulares | `doubtful` |
| [DeviantArt](https://www.deviantart.com/) | fan art e sprites por artista | varia por publicação | termos dependem da descrição e do artista | autorização individual obrigatória | `pending` |
| [Eevee Expo](https://eeveeexpo.com/) | recursos e jogos de fãs | varia por coleção | sem licença única para todos os materiais | verificar item por item | `pending` |
| [Pokengine](https://pokengine.org/search?query=trainers+category:character) | personagens e treinadores | varia por registro | sem licença geral confirmada | fora do escopo de Pokémon desta entrega | `pending` |
| [PokéCommunity](https://www.pokecommunity.com/) | recursos de fãs | varia por tópico | permissões e créditos variam | verificar tópico original | `pending` |
| [The Cutting Room Floor](https://tcrf.net/) | material extraído e documentação histórica | contribuidores e titulares originais | finalidade documental não cria licença de redistribuição para jogos | referência apenas | `doubtful` |
| [Ultimate Trainer Sprite Collection](https://docs.google.com/spreadsheets/d/1hHkm8mbWbH-TAsDW9L0xZ3uVqPl2kz3unohhtQtqRI0/edit?gid=0#gid=0) | índice de treinadores, NPCs, batalhas, faces e overworlds | artistas/rippers por entrada | uso não comercial e créditos variáveis não formam licença geral | fora do escopo atual; revisar cada URL original | `pending` |

## Resultado do inventário

- 60.113 arquivos de imagem encontrados na árvore de origem;
- 43.383 candidatos estáticos associados às espécies canônicas;
- 10.421 candidatos animados associados às espécies canônicas;
- 1.025 sprites frontais reais baixados, inspecionados e mantidos em quarentena
  local ignorada pelo Git;
- 1.025 hashes SHA-256, tamanhos e dimensões registrados nos inventários públicos;
- zero PNG, GIF, SVG, áudio ou vídeo adicionado ao repositório.

Os candidatos incluem materiais oficiais extraídos e materiais feitos por fãs. Essa
classificação é registrada em `catalogs/asset-rights.json`; nenhum candidato possui
estado `approved`.

## Convenção de nomes

Pastas:

```text
creatures/0001-bulbasaur/
creatures/0383-groudon/
creatures/1025-pecharunt/
```

Sprites propostos:

```text
0001-bulbasaur--pokeapi-default--front--normal--27b73d36.png
0001-bulbasaur--generation-v-black-white--back--shiny--<hash>.png
```

O sufixo curto de hash evita colisões entre jogos e variantes que produziriam o
mesmo nome semântico. O SHA completo continua registrado na entrada.

## Decisão necessária

Antes de mover qualquer binário para o pack público, o proprietário deve escolher
uma coleção, confirmar a base legal de uso e redistribuição, aprovar o texto de
créditos e aceitar o risco residual. A recomendação técnica é iniciar pelos sprites
comunitários de uma única coleção que possua autorização direta e lista completa de
artistas, não pelos sprites extraídos dos jogos.
