# Auditoria dos dados canônicos

## Fonte e método

Os dados foram comparados com os CSVs da PokéAPI no commit
`091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f`. A auditoria releu todas as 1.025
pastas, os catálogos globais e os 580.682 registros de método de aprendizagem.
Também consultou `pokemon.csv`, `pokemon_forms.csv`, `move_names.csv` e
`ability_names.csv`, que não participavam integralmente do gerador anterior.

## O que está confirmado automaticamente

- 1.025 definições presentes e com seis estatísticas base;
- 1.025 revisões de fonte coerentes com o SHA fixado;
- 2.411 associações de habilidades, das quais 856 ocultas;
- 79.120 referências únicas de golpes por espécie;
- 580.682 tuplas de aprendizagem em 32 version groups;
- 327.255 associações de máquina;
- zero referência inválida de golpe, habilidade, método ou version group;
- zero tipo ou categoria desconhecida;
- zero espécie default sem learnset.

## O que “approved” significa

Os 1.025 `definitions/status.json` têm `status: approved`, mas também declaram
`validationLevel: automated-schema-coverage-and-referential-integrity`. Portanto:

- **confirmado:** estrutura, cobertura e referências internas;
- **fiel à fonte, sem confirmação independente:** efeitos, learnsets, máquinas,
  evoluções e campos biológicos copiados da PokéAPI;
- **não confirmado manualmente:** comportamento exato por jogo, exceções históricas
  e completude de cada descrição;
- **fora do pack:** balanceamento e regras originais do projeto.

## Espécies, Pokémon e formas

| Conceito na fonte | Quantidade | Cobertura autônoma no pack |
| --- | ---: | ---: |
| Espécies | 1.025 | 1.025 |
| Registros default de Pokémon | 1.025 | 1.025 |
| Registros alternativos de Pokémon | 326 | 0 |
| Registros de `pokemon_forms` | 1.579 | 0 |
| Formas marcadas como apenas de batalha | 162 | 0 |

Uma pasta por espécie não representa todas as formas. Formas podem alterar tipo,
stats, habilidade, aparência, disponibilidade e regras de transformação; não devem
ser reduzidas a uma string opcional sem semântica.

## Nomes canônicos

O gerador usa `titleFromSlug` para golpes e habilidades. A comparação com as tabelas
inglesas da própria fonte encontrou:

- 64 nomes de golpes diferentes;
- 15 nomes de habilidades diferentes.

As diferenças incluem pontuação, capitalização estilizada, símbolos e nomes cujo
slug não permite reconstrução exata. A lista completa está em
`canonical-data-findings.json`. O campo não deve ser chamado de canônico até usar
`move_names.csv` e `ability_names.csv`.

## Descrições e valores nulos

| Condição | Quantidade |
| --- | ---: |
| Golpes sem prosa inglesa de efeito | 111 |
| Habilidades sem prosa inglesa de efeito | 62 |
| Golpes com poder nulo | 338 |
| Golpes com precisão nula | 288 |
| Golpes com PP nulo | 18 |

Poder ou precisão nulos podem ser corretos para golpes de status, dano variável ou
efeitos especiais; não são erro por si só. Já o placeholder “No English effect text
available” é uma lacuna explícita e não uma descrição funcional.

## Learnsets e máquinas

Frequência dos métodos:

| Método | ID | Tuplas |
| --- | ---: | ---: |
| level-up | 1 | 148.372 |
| egg | 2 | 33.305 |
| tutor | 3 | 45.601 |
| machine | 4 | 340.319 |
| stadium-surfing-pikachu | 5 | 4 |
| light-ball-egg | 6 | 10 |
| xd-purification | 9 | 332 |
| form-change | 10 | 9 |
| zygarde-cube | 11 | 10 |
| train | 12 | 12.720 |

Há 13.064 tuplas com método `machine` sem registro de máquina associado no snapshot.
Isso não foi classificado automaticamente como erro, porque a fonte pode registrar o
método sem uma linha de item/máquina em determinados jogos. Antes de runtime, esses
casos precisam de política e amostragem manual.

O catálogo também não modela flags como contato, som, soco, mordida e interação com
Protect. Portanto, mesmo um golpe com tipo, poder e efeito preenchidos ainda não é
suficiente para uma simulação canônica completa.

## Baseline de jogo

O pack agrega todos os 32 version groups disponíveis. Isso é adequado para pesquisa,
mas inadequado para uma regra de jogo sem seleção explícita. O projeto precisa
decidir:

1. version group primário;
2. fallback quando um dado não existir nesse grupo;
3. tratamento de DLC, remakes, Legends e Champions;
4. legalidade de TM/HM/TR por geração;
5. regras para formas temporárias e apenas de batalha.

## Golpes inventados

Não foi encontrado golpe inventado dentro do catálogo canônico: seus 937 IDs vêm da
fonte e todas as referências resolvem. `strike` e `guard` são ações originais do
domínio genérico de batalha e estão corretamente separadas; não devem ser mapeadas
silenciosamente para golpes da franquia.

Nenhum learnset impossível ou atributo incorreto foi demonstrado pelos testes. Essa
ausência de achado não equivale a confirmação: a geração e a auditoria usam o mesmo
snapshot, e a revisão manual independente está em zero.

## Recomendação

Corrigir nomes a partir das tabelas de idioma, introduzir um modelo explícito de
forma e escolher um baseline de version group antes de qualquer loader ou
balanceamento. Depois, validar manualmente um piloto pequeno contra uma segunda
referência, registrando diferenças em vez de sobrescrever a fonte.
