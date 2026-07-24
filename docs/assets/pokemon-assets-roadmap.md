# Roadmap de assets de Pokémon

## Princípio

Cada fase abaixo é um gate independente. Uma aprovação autoriza somente a fase
descrita, e toda mídia entra primeiro em quarentena. Nenhum item avança para runtime
enquanto origem, licença, integridade, compatibilidade e decisão não estiverem
registradas.

## Fase A — corrigir o catálogo canônico

**Escopo:** substituir nomes derivados de slug pelos nomes ingleses da fonte, definir
um baseline de jogo/geração e modelar formas como entidades separadas de espécies.

**Entradas:** `canonical-data-findings.json`, PokéAPI data `091f3a05` e decisão do
proprietário sobre baseline.

**Critérios de aceite:**

- 64 divergências de nomes de golpes e 15 de habilidades resolvidas;
- regra explícita para 32 version groups;
- contrato distingue espécie, Pokémon default, forma cosmética e forma de batalha;
- testes de regressão preservam os 1.025 registros existentes.

**Fora do escopo:** carregar sprites, áudio ou alterar balanceamento.

## Fase B — piloto visual original

**Escopo:** criar ou contratar um conjunto original pequeno, sugerido para três
criaturas originais do projeto, não para personagens da franquia.

**Slots mínimos por criatura:**

- batalha frente e costas;
- overworld parado e caminhada em quatro direções;
- retrato e ícone;
- paleta alternativa do projeto;
- metadados de pivô, escala e área útil.

**Critérios de aceite:**

- arquivos PNG ou WebP com transparência;
- licença `ORIGINAL` ou CC0 comprovada;
- SHA-256 e autoria por arquivo;
- visual testado com nearest-neighbor em desktop e mobile;
- substituição do asset set sem mudar IDs da criatura.

## Fase C — contrato e loader visual

**Dependência:** fases A e B aprovadas.

**Escopo:** aceitar o schema proposto, implementar adaptador de conteúdo e loader
Phaser orientado por IDs lógicos.

**Critérios de aceite:**

- fallback explícito quando um slot estiver ausente;
- nenhum caminho de mídia no domínio;
- budget por pack e carregamento sob demanda;
- feature flag desativada por padrão;
- assets `pending`, `doubtful` ou `quarantined` rejeitados pelo build.

## Fase D — animação 2D

**Dependência:** estilo visual e loader estático aprovados.

**Direção recomendada:** spritesheets PNG/WebP com atlas JSON e frame timing
explícito. GIF pode servir como referência de movimento, não como formato de runtime.

**Critérios de aceite:**

- estados `idle`, `walk`, `attack`, `hit` e `faint` quando aplicáveis;
- pivô e caixa visual estáveis entre quadros;
- duração independente do FPS de renderização;
- atlas sem bleed, com nearest-neighbor;
- limites de memória medidos em mobile.

## Fase E — áudio original

**Dependência:** interação inicial e configuração de preferências de áudio definidas.

**Escopo:** cries e efeitos originais ou CC0/CC-BY verificáveis.

**Critérios de aceite:**

- OGG como formato principal e MP3 como fallback;
- loudness, pico, duração, canais e sample rate normalizados;
- mute, volume e desbloqueio por gesto do usuário;
- nenhuma dependência de hotlink;
- créditos gerados do manifesto.

## Fase F — substituição dos temporários D-023

**Dependência:** cobertura visual original suficiente.

**Escopo:** mapear os mesmos IDs lógicos para o novo asset set e remover os 4.100
PNGs duvidosos.

**Critérios de aceite:**

- zero referência a `--pokeapi-default--`;
- `replacementRequired: false`;
- licença do pack `ORIGINAL` ou CC0;
- runtime usa somente assets aprovados;
- auditoria confirma remoção dos binários temporários e preservação de saves.

## Fase G — expansão gradual

Expandir em lotes pequenos, com uma única pessoa ou IA escrevendo por branch:

1. espécies/formas priorizadas pelo game design;
2. overworld e batalha;
3. animações;
4. cries e efeitos;
5. retratos, ícones e variações;
6. otimização e empacotamento.

Cada lote deve atualizar matriz de lacunas, créditos, work log, hashes e evidência de
licença. Não existe avanço automático entre lotes.

## Próxima autorização recomendada

Autorizar somente a Fase A: corrigir os nomes canônicos e propor o contrato de formas
e o baseline de version group, sem mídia e sem runtime.
