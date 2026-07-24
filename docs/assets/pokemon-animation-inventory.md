# Inventário de animações

## Resultado

A revisão `bf4c47ac82c33b330e33d98b8882d1cedb2f53e7` contém 11.855 candidatos
classificados como animação para os 1.351 registros de Pokémon:

| Formato | Quantidade |
| --- | ---: |
| GIF | 11.133 |
| PNG em coleção `animated` | 722 |

Há algum candidato animado para 1.276 registros; 75 não possuem nenhum. Nenhuma
animação foi baixada ou publicada nesta tarefa.

## Principais coleções

| Coleção | Candidatos |
| --- | ---: |
| Showdown frente normal | 1.470 |
| Showdown frente shiny | 1.470 |
| Showdown costas normal | 1.462 |
| Showdown costas shiny | 1.462 |
| Black/White frente shiny | 1.004 |
| Black/White frente normal | 993 |
| Black/White costas shiny | 966 |
| Black/White costas normal | 948 |
| Ícones animados da geração V | 722 |
| Crystal frente normal | 276 |
| Crystal frente shiny | 276 |

Também existem variações femininas em menor volume. Os detalhes por espécie e forma
estão em `sprite-availability.csv`; a matriz de lacunas lista os slots ausentes.

## Proveniência

- Showdown: arte comunitária, com créditos e permissões dependentes do projeto e do
  artista; estado `pending`.
- Black/White: mistura sprites oficiais e continuações comunitárias, especialmente
  depois da geração V; origem deve ser resolvida por arquivo.
- Crystal e demais jogos: sprites extraídos de jogos; estado `doubtful`.
- Ícones `animated` em PNG: a pasta indica animação, mas o arquivo pode ser uma
  spritesheet ou layout específico e precisa de inspeção antes de definir frames.

Nenhuma dessas classes está aprovada para runtime.

## Estratégia A — animação procedural

Os quatro PNGs estáticos podem receber animação sem alterar pixels:

| Estado | Propriedades Phaser sugeridas |
| --- | --- |
| entrada/saída | posição, alfa e easing |
| idle/respiração | deslocamento vertical e escala discretos |
| antecipação/ataque físico | recuo curto, avanço e retorno |
| ataque especial | tint, máscara, partículas e câmera |
| hit/crítico | flash, tremor e pequeno recuo |
| cura/status | tint temporário, partículas e alfa |
| captura | escala, rotação discreta, máscara e easing |
| desmaio | queda vertical, alfa e escala |
| evolução/shiny | máscara, flash, partículas e câmera |

Essa estratégia é tecnicamente suficiente para uma apresentação coerente com PNGs
estáticos e reduz a necessidade de quadros. Ela não corrige a variação de área útil
entre imagens nem os direitos D-023. Timing e eventos devem ficar em manifests
originais, e a regra de batalha não pode depender da conclusão de tween.

## Estratégia B — quadro a quadro

Não existe uma família animada que, na revisão auditada, cubra todas as 1.351
entidades com frente, costas, normal, shiny, gênero e formas em um estilo homogêneo.
Showdown tem a maior cobertura, mas combina autoria comunitária, dimensões variáveis
e permissões por coleção. Black/White é visualmente mais próximo do baseline, porém
mistura material oficial e continuações de fãs.

Assim, a recomendação é usar procedural em um futuro piloto original, limitar quadro
a quadro a um subconjunto explicitamente licenciado e encomendar a identidade visual
de longo prazo.

## GIF versus spritesheet

GIF é conveniente para referência, mas inadequado como contrato principal:

- controle de quadros e eventos é limitado;
- composição de atlas e batching é pior;
- transparência e paleta têm limitações;
- timing pode variar por decoder;
- não há pivô ou hit frame sem metadados externos.

A direção recomendada é converter somente assets aprovados e preservados em
quarentena para spritesheet PNG/WebP mais atlas JSON. Conversão não resolve licença;
o derivado herda as obrigações e riscos da obra de origem.

## Contrato proposto

Cada animação deve registrar:

- ID lógico e estado (`idle`, `walk`, `attack`, `hit`, `faint`);
- forma, gênero, perspectiva e paleta;
- arquivo, SHA-256, dimensões e frame count;
- retângulos de frame, pivô e baseline;
- duração por frame, repetição e eventos;
- fonte, revisão, artista, licença e crédito;
- status de aprovação e autorização de runtime.

## Compatibilidade Phaser

Phaser deve carregar atlas/spritesheet por cena, criar animações por chave lógica e
usar nearest-neighbor. As animações não podem alterar o tamanho do layout nem
dirigir a regra de batalha; eventos visuais acompanham eventos autoritativos já
decididos pelo servidor.

## Próxima etapa de animação

Somente após um piloto estático original, desenhar `idle` e `attack` para três
criaturas originais, medir memória e frame timing em desktop/mobile e validar o
schema. Os GIFs inventariados permanecem referência bloqueada.
