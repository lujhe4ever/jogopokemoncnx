# Inventário de áudio

## Resultado

A árvore do repositório PokéAPI/cries foi consultada por metadados no commit
`7ba07038103b3482973fa781e25c09debbaaedd8`. Nenhum OGG foi baixado.

| Set | Arquivos | Cobertura dos 1.351 Pokémon | Bytes na fonte |
| --- | ---: | ---: | ---: |
| latest | 1.351 | 1.351 | 23.281.680 |
| legacy | 649 | 649 | 4.973.942 |
| Total | 2.000 | — | 28.255.622 |

`audio-availability.csv` registra por espécie/forma o caminho lógico, tamanho e Git
blob SHA da fonte. Blob SHA identifica o objeto Git, não substitui SHA-256 do arquivo
que seria exigido após uma futura aquisição autorizada.

## Proveniência e licença

O README informa que os cries foram obtidos do simulador Pokémon Showdown e do site
Veekun. O arquivo `LICENSE` afirma que todo o áudio é Copyright The Pokémon Company e
também distribui o repositório sob CC0. Essa combinação não prova que quem aplicou
CC0 tinha poder para licenciar os fonogramas.

Classificação:

- disponibilidade: confirmada;
- licença declarada pelo repositório: CC0;
- poder sobre os direitos subjacentes: não confirmado;
- estado do projeto: `doubtful`;
- arquivos importados: 0;
- assets aprovados para runtime: 0.

## Compatibilidade com Phaser e navegador

Phaser 3 seleciona o primeiro formato de áudio compatível, usa Web Audio quando
disponível e cai para HTML5 Audio. O áudio normalmente permanece bloqueado até um
gesto explícito do usuário.

O contrato futuro deve prever:

- OGG como principal e MP3 como fallback;
- desbloqueio no primeiro clique/toque;
- mute e volume persistentes;
- erro silencioso e fallback quando não houver codec;
- preload apenas do áudio da cena;
- limite de instâncias simultâneas;
- normalização de loudness e picos;
- duração, canais, sample rate, codec, bytes e SHA-256 no manifest.

## Estratégia segura

1. Não importar cries oficiais.
2. Criar identidade sonora original para as criaturas originais do projeto.
3. Usar síntese própria, gravações próprias, encomendas com contrato ou arquivos
   CC0/CC-BY de origem verificável.
4. Preferir CC0; aceitar CC-BY somente com pipeline de créditos.
5. Rejeitar CC-BY-NC para preservar uso comercial futuro.
6. Auditar cada som individualmente, mesmo quando vem de Freesound ou OpenGameArt.

## Efeitos originais necessários

### Batalha

| Grupo | Eventos |
| --- | --- |
| impactos | físico, cortante, soco, chute, mordida, crítico |
| elementos | água, fogo, eletricidade, gelo, pedra, terra, vento |
| tipos | psíquico, fantasma, venenoso, metálico, planta, inseto, dragão, fada |
| estado | cura, buff, debuff, status, evasão, falha |
| eficácia | super efetivo, pouco efetivo, imune/falha |
| fluxo | entrada, saída, desmaio, fuga, level up, evolução |
| captura | lançamento, impacto, balanços, sucesso e falha |

Os sons devem ser reutilizáveis por arquétipo. Um golpe combina camadas aprovadas em
vez de exigir um arquivo exclusivo para cada um dos 937 golpes.

### Interface

Confirmar, cancelar, cursor, menu, diálogo, inventário, recompensa, missão, erro,
notificação, convite, PvP e arena.

### Mundo

Passos por superfície, portas, portais, interação, coleta, baú, água, vento, chuva,
ambiente interno, floresta, cidade, caverna e arena.

### Música futura

Título, casa, cidade, rota, batalha selvagem, treinador, arena, vitória, evolução e
evento. Trilhas oficiais não são candidatas.

## Metadados ainda desconhecidos

Como nenhum dos 2.000 OGGs foi baixado, duração, canais, sample rate, loudness,
clipping, silêncio inicial/final e SHA-256 permanecem `unknown` no CSV. Obtê-los
exigiria aquisição dos binários, fora do escopo autorizado. Tamanho e Git blob SHA
foram auditados sem download.

## Próximo piloto de áudio

Depois da autorização específica, selecionar três criaturas originais e produzir um
cry curto por criatura, um efeito de ataque e um efeito de dano. O piloto deve testar
OGG/MP3, desbloqueio, volume e atribuição, sem qualquer áudio de Pokémon.
