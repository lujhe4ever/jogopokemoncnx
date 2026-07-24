# Auditoria de assets de Pokémon

## Identificação

- Data da auditoria: 2026-07-23
- Branch de trabalho: `codex/pokemon-assets-audit`
- Base auditada: `9192f727194247e49f3561a34e6996f26e23d07d`
- Natureza: pesquisa, inventário e planejamento; nenhuma mídia nova foi importada
- Escopo canônico: 1.025 espécies, 1.351 registros de Pokémon e 1.579 registros de forma
- Fontes fixadas: PokéAPI data `091f3a05`, sprites `bf4c47ac` e cries `7ba07038`

## Conclusão executiva

O pack `pokemon-canonical` tem definições estruturais para todas as 1.025 espécies
da National Pokédex e quatro PNGs temporários por espécie. Ele não tem cobertura
completa de formas: existem 326 registros alternativos de Pokémon e 1.579 registros
em `pokemon_forms.csv`, mas nenhuma pasta autônoma de forma. Os 4.100 PNGs
publicados estão íntegros, isolados do runtime e continuam com direitos `doubtful`.

A árvore fixada da PokéAPI contém 48.210 candidatos estáticos e 11.855 candidatos
animados mapeáveis aos 1.351 registros de Pokémon. Esses números são disponibilidade,
não autorização. Há seis formas sem qualquer candidato visual e 75 registros sem
animação. O repositório de cries tem 1.351 arquivos `latest` e 649 `legacy`, mas
nenhum áudio foi importado porque a licença não demonstra poder para relicenciar o
conteúdo oficial.

## Estado real do repositório

- O frontend usa Phaser 3.90.0 com `pixelArt: true`, canvas de 640 × 400 e formas
  geométricas; não há loader de sprites de Pokémon.
- Não existe subsistema de áudio no código do jogo.
- O domínio de batalha usa as ações originais `strike` e `guard`; elas não são
  apresentadas como golpes canônicos.
- `apps/` e `packages/` não referenciam `pokemon-canonical`.
- `manifest.json` mantém `runtimeEnabled: false`, `replacementRequired: true` e
  `licenseStatus: doubtful`.
- A baseline anterior à auditoria passou: 29 arquivos de teste, 106 testes, lint,
  typecheck, build, budgets, segurança e validação de todos os 4.100 PNGs.

## Inventários produzidos

| Artefato | Cobertura |
| --- | --- |
| `sprite-availability.csv` | 1.351 registros, espécie e forma, com slots visuais |
| `audio-availability.csv` | 1.351 registros, sets latest/legacy, tamanho e blob SHA |
| `canonical-data-findings.json` | integridade, lacunas, nomes e limites da validação |
| `asset-gap-matrix.json` | slots faltantes e cobertura por registro |
| `source-register.json` | fonte, revisão, licença, créditos, riscos e decisão |
| `proposed-asset-schema.json` | contrato substituível proposto para mídia futura |

## Cobertura visual

| Métrica | Resultado |
| --- | ---: |
| Registros de Pokémon auditados | 1.351 |
| Registros com candidato estático | 1.345 |
| Registros com candidato animado | 1.276 |
| Candidatos estáticos mapeados | 48.210 |
| Candidatos animados mapeados | 11.855 |
| PNGs temporários versionados | 4.100 |
| Assets visuais aprovados para runtime | 0 |

As seis formas sem candidato visual na revisão fixada são
`koraidon-sprinting-build`, `koraidon-swimming-build`,
`koraidon-gliding-build`, `miraidon-drive-mode`, `miraidon-aquatic-mode` e
`miraidon-glide-mode`.

## Cobertura de definições

| Métrica | Resultado |
| --- | ---: |
| Pastas de espécie | 1.025 |
| Status estruturais `approved` | 1.025 |
| Referências de golpes | 79.120 |
| Tuplas de aprendizagem | 580.682 |
| Associações de habilidade | 2.411 |
| Referências inválidas detectadas | 0 |
| Formas alternativas autônomas | 0 de 326 |
| Revisões manuais independentes por espécie | 0 |

`approved` nas definições significa somente que o arquivo passou por schema,
cobertura e integridade referencial contra a mesma revisão fixada da PokéAPI. Não
significa confirmação manual de cada regra de jogo.

## Direitos e proveniência

### PokéAPI data

O repositório de dados usa BSD-3-Clause, mas declara que nomes de Pokémon são marcas
da Nintendo. O pack preserva o aviso e mantém os dados como `pending`, pois a licença
do software não resolve todos os direitos sobre nomes, personagens e prosa da
franquia.

### PokéAPI sprites

O arquivo `LICENCE.txt` diz simultaneamente que as imagens pertencem à The Pokémon
Company e que o repositório é distribuído sob CC0. CC0 só pode afastar direitos que
o declarante efetivamente possua. Assim, os candidatos oficiais permanecem
`doubtful`; coleções comunitárias permanecem `pending` até prova por obra e artista.

### PokéAPI cries

O mesmo conflito aparece no áudio: o repositório declara copyright da The Pokémon
Company e aplica CC0. Os arquivos vieram de Pokémon Showdown e Veekun, sem cadeia de
autorização suficiente para este projeto. O resultado é inventário sem download.

### Fontes abertas para substituição

Kenney é um candidato forte para efeitos e áudio genéricos CC0. OpenGameArt e
Freesound exigem verificação individual de autor, origem e licença. Nenhuma dessas
fontes fornece automaticamente sprites reconhecíveis de Pokémon com direitos
seguros; a estratégia durável continua sendo conteúdo original ou uma encomenda
com cessão/licença explícita.

## Decisões de segurança

1. Não ativar `pokemon-canonical` no runtime.
2. Não importar cries, GIFs ou novos sprites oficiais.
3. Não tratar disponibilidade, fan art ou “uso não comercial” como licença.
4. Manter IDs lógicos de assets separados de caminhos físicos.
5. Exigir SHA-256, origem, autor, licença, crédito e decisão para cada arquivo.
6. Permitir substituição por asset set sem alterar engine, espécie ou save.

## Respostas às lacunas

1. **Espécies:** 1.025.
2. **Formas:** 1.351 registros de Pokémon e 1.579 registros de forma; 326 Pokémon
   alternativos não têm definição autônoma.
3. **Definições corretas:** 1.025 estruturalmente válidas; zero foram confirmadas
   integralmente por revisão manual independente.
4. **Divergências:** 64 nomes de golpes, 15 nomes de habilidades, 111 golpes e 62
   habilidades sem prosa inglesa; move flags também não são modeladas.
5. **Movimentos inventados:** zero no catálogo canônico. `strike` e `guard` são
   conteúdo original separado.
6. **Learnsets impossíveis:** nenhum foi provado pelo teste referencial; 13.064
   métodos `machine` sem item associado exigem amostragem manual.
7. **Atributos incorretos:** nenhum foi demonstrado; a verificação ainda depende da
   mesma fonte geradora.
8. **Sprites atuais:** quatro PNGs 96 × 96 por espécie, total 4.100.
9. **Variantes ausentes nos candidatos:** 6 sem frente normal, 10 sem frente shiny,
   226 sem costas normal e 228 sem costas shiny.
10. **Sprites animados:** 11.855 candidatos para 1.276 registros.
11. **Cobertura por família:** registrada em `asset-gap-matrix.json`.
12. **Família animada completa e compatível:** não identificada.
13. **Animação procedural:** tecnicamente possível sem alterar pixels, mas não resolve
    licença nem diferenças de enquadramento.
14. **Gritos:** 1.351 latest e 649 legacy.
15. **Risco dos gritos:** todos `doubtful`.
16. **Sons originais necessários:** batalha, interface, mundo e música listados no
    inventário de áudio.
17. **Fontes aprováveis:** autoria própria, encomenda contratada, Kenney CC0 e itens
    individuais CC0/CC-BY após revisão.
18. **Quarentena:** sprites/cries oficiais, Showdown e toda fonte sem cadeia de
    titularidade.
19. **Decisões pendentes:** baseline de version group, modelo de formas, estilo,
    licenças aceitas, política de créditos e orçamento.
20. **Ordem:** corrigir dados; piloto original; schema/loader; animação; áudio;
    substituição D-023; expansão.

## Alternativas

| Opção | Esforço/custo | Risco jurídico | Impacto e cobertura | Manutenção/dependência |
| --- | --- | --- | --- | --- |
| Conservadora | baixo | alto enquanto os PNGs temporários permanecerem publicados; baixo para áudio original | preserva o visual atual; procedural cobre entrada, idle, ataque e reação sem novos quadros | simples, mas depende visualmente dos temporários |
| Intermediária | médio | médio, porque referências privadas continuam exigindo governança | mantém PNGs isolados, adiciona pipeline e libera somente pequenos lotes aprovados | boa substituição por asset set; dependência externa controlada |
| Ampla | alto | menor no longo prazo | identidade própria, cobertura planejada de batalha, overworld, animação e som | maior custo inicial, menor dependência de terceiros e melhor previsibilidade |

**Recomendação escolhida:** opção ampla como destino, executada em lotes da opção
intermediária. A opção conservadora serve apenas como contenção temporária e nunca
como autorização dos assets D-023.

## Evidência

- [PokéAPI data fixada](https://github.com/PokeAPI/pokeapi/tree/091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f/data/v2/csv)
- [Licença da PokéAPI](https://github.com/PokeAPI/pokeapi/blob/091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f/LICENSE.md)
- [PokéAPI sprites fixada](https://github.com/PokeAPI/sprites/tree/bf4c47ac82c33b330e33d98b8882d1cedb2f53e7)
- [Licença dos sprites](https://github.com/PokeAPI/sprites/blob/bf4c47ac82c33b330e33d98b8882d1cedb2f53e7/LICENCE.txt)
- [PokéAPI cries fixada](https://github.com/PokeAPI/cries/tree/7ba07038103b3482973fa781e25c09debbaaedd8)
- [Licença dos cries](https://github.com/PokeAPI/cries/blob/7ba07038103b3482973fa781e25c09debbaaedd8/LICENSE)
- [Áudio no Phaser](https://docs.phaser.io/phaser/concepts/audio)

Esta auditoria não é parecer jurídico. Ela aplica a política conservadora do
repositório e registra a evidência disponível.
