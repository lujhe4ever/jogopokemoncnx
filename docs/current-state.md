# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-24 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Branch principal | `main` |
| Branch desta entrega | `codex/production-asset-library` |
| Base desta entrega | `codex/pokemon-assets-integration` em `e0f65704` |
| Fase | Roadmap 0B–17 concluído; biblioteca CC0 de produção em revisão |
| Status | **publicada no PR draft #25, sem merge, deploy ou ativação** |

## 1. Resumo

As Fases 0B a 17 foram integradas à `main`. A Fase 17 passou na CI #54 e foi
integrada pelo PR #19 no commit `375dca531e1abda09aa50a469a645a861a6485b6`,
sem deploy ou participantes externos.

Esta branch adiciona à infraestrutura do PR #23 uma biblioteca curada de 54 arquivos
Kenney CC0: 15 PNGs e 39 OGGs. O lote é reproduzível por oito arquivos-fonte fixos,
mantém licenças e hashes, rejeita clipping e permanece integralmente desativado no
runtime. Os 4.100 sprites compactos da D-023 e os 2.000 cries candidatos continuam
bloqueados e não foram alterados.

O projeto possui workspace TypeScript, servidor Fastify, cliente Vite/Phaser,
PostgreSQL, Prisma, WebSocket versionado, autenticação e a primeira fatia jogável da
casa, clareira original, transições autoritativas e o primeiro ciclo de interação.

## 2. Entrega atual

- cadastro com e-mail normalizado, nome público e senha Argon2id;
- login com resposta genérica para credenciais inválidas;
- sessão opaca armazenada somente por hash, com expiração e revogação;
- cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção;
- perfil mínimo persistido;
- ticket WebSocket com validade de 30 segundos e uso único;
- rate limiting para cadastro e login;
- auditoria de sucesso/falha sem registrar credenciais;
- testes de sessão, falha de login, Argon2id e ticket descartável.
- contrato declarativo para zonas, colisões, spawns e portais;
- checkpoint persistente com `zoneId`;
- transição validada por proximidade e ID no servidor;
- snapshots restritos à área de interesse da zona atual;
- manifests versionados e seleção do pack autorizado por snapshot.
- NPC declarativo com capacidade de diálogo;
- pickup e baú originais com validação de proximidade;
- inventário de 20 slots, stacks de 99 e recompensa transacional idempotente;
- feedback visual e `aria-live`, com ação por teclado ou toque.
- domínio puro separando definição e instância de criatura;
- catálogo original versionado com evolução declarativa;
- coleção e equipe de até seis criaturas com ownership;
- experiência/evolução idempotentes em transação serializável;
- saves com IDs e versões estáveis de definição e catálogo.
- máquina pura de batalha por turno com RNG por seed;
- comandos sequenciados, política NPC e replay determinístico;
- timeout, abandono e desconexão com resultado explícito;
- resultado persistente aplicado uma única vez;
- UI acessível de batalha carregada sob demanda e retorno ao mundo.
- encontro selvagem original gerado por interação e proximidade;
- autorização efêmera descartável para iniciar o encontro;
- captura pós-vitória com RNG por seed e chance controlável;
- consumo do Orbe e criação da criatura na mesma transação;
- retry idempotente e retorno seguro em todos os encerramentos.
- domínio puro de missões com definições, estados e versões explícitas;
- progresso por eventos públicos de zona, interação, batalha e captura;
- recibos persistentes que deduplicam eventos por conta e ID;
- recompensa aplicada uma vez na mesma transação serializável do progresso;
- diário de missões acessível e carregado sob demanda;
- política explícita que rejeita version drift sem migração declarada.
- arena social separada da exploração por endpoint e ciclo de conexão próprios;
- registro em memória com múltiplas salas isoladas e limite de 20 presenças cada;
- movimento autoritativo a 20 Hz, snapshots de entrada e deltas de posição;
- reconexão por 30 segundos, substituição de sessão e remoção explícita de presença;
- backpressure limita sockets lentos e métricas agregam tick, salas e descartes;
- IDs públicos efêmeros impedem exposição de IDs internos de conta;
- UI social acessível com palco visual, lista de presenças e controles por teclado/toque.
- catálogo canônico separado com 1.025 espécies, 937 golpes e 373 habilidades;
- learnsets por versão, método, nível e máquina, ligados a catálogos normalizados;
- 60.065 candidatos visuais mapeados para 1.351 entidades, sendo 48.210 estáticos e
  11.855 animados, com revisão de origem fixa;
- 2.000 candidatos de áudio inventariados, sem download ou ativação;
- 1.579 registros de forma auditados; 326 formas alternativas ainda não possuem
  definição independente no pack;
- 4.100 sprites de batalha verificados e publicados, quatro por espécie;
- cache privado isolado pela revisão exata de `PokeAPI/sprites`;
- auditoria offline decodifica os 4.100 PNGs e verifica todos os hashes;
- gate permanente impede referências ao pack temporário em `apps/` e `packages/`;
- 1.025 definições com status `approved` por validação automatizada;
- nenhum sprite carregado pela engine.
- 12 artefatos de auditoria registram fontes, lacunas, compatibilidade, áudio,
  animações, dados canônicos e um schema substituível;
- validação PNG também verifica explicitamente o fluxo zlib dos chunks IDAT;
- broadcasts de um mesmo passo ou transição compartilham o mesmo `serverTime`.
- chat efêmero com autoria, timestamp e ID gerados pelo servidor;
- mensagens normalizadas, limitadas a 160 caracteres, sem URL/controle e com rate limit;
- requisições deduplicadas e histórico apenas em memória/DOM limitado a 50 itens;
- emotes `wave`, `cheer` e `surprised` validados por catálogo;
- mute local remove fala do painel e do balão sem expor ação ao remetente;
- convites direcionados expiram em 30 segundos, são únicos e revalidam presenças;
- aceite confirma o desafio social para os dois participantes e autoriza o início PvP.
- desafio social aceito inicia uma instância PvP somente para os dois participantes;
- ownership das criaturas é validado no servidor antes da criação da batalha;
- escolhas `strike` e `guard` permanecem privadas até ambos enviarem o turno;
- comandos usam sequência, batalha e identidade autenticada para impedir controle do
  oponente;
- timeout de 30 segundos, abandono e desconexão produzem derrota explícita;
- resultado e vencedor são persistidos uma única vez por atualização condicional;
- projeção do duelo omite escolhas e IDs internos, e a UI retorna com segurança à arena.
- `@lt/broadcast-domain` constrói a projeção de telão por allowlist explícita;
- cada sala mantém revisão, histórico limitado a 64 deltas e até 20 batalhas visíveis;
- lacuna recuperável recebe replay; lacuna antiga ou reconexão recebe snapshot atual;
- início, turno resolvido e fim confirmado são distribuídos aos presentes na arena;
- vencedor só é publicado depois da persistência idempotente do resultado PvP;
- comandos de batalha enviados por espectador recebem `spectator_read_only`;
- backpressure isola socket lento e métricas contam atualizações e entregas do fan-out;
- telões acessíveis exibem competidores, criaturas, vida, turno e vencedor sem ações.
- aplicação `apps/admin` é construída separadamente e não possui link no cliente do jogo;
- rotas administrativas não são registradas sem `ADMIN_STEP_UP_SECRET` de 32 caracteres;
- sessão normal e segredo de elevação em memória são exigidos em cada requisição;
- RBAC separa suporte, edição de conteúdo e proprietário, sempre validado no servidor;
- consultas de suporte omitem e-mail/ID interno e retornam referência assinada;
- revogação de sessões é recuperável por novo login e exige frase mais motivo;
- manifesto original/CC0 valida namespace, versão, checksum, paths, duplicatas e quantidade;
- publicação é versionada, idempotente para mesmo checksum e rejeita conflito;
- sucesso, negação e bootstrap de papel são auditados sem segredo ou PII direta.
- headers defensivos, limite HTTP de 64 KiB e allowlist de origem protegem HTTP e
  WebSocket;
- configuração aceita segredos por arquivo e métricas exigem bearer token não
  publicado na borda;
- budgets verificam bundles, assets e a baseline de 20 presenças da arena;
- scans automatizados cobrem credenciais, procedência de conteúdo e vulnerabilidades
  conhecidas;
- imagens separadas, proxy TLS e redes internas preparam operação sem expor o banco;
- backup com checksum, restauração isolada e rollback exigem confirmação explícita;
- dashboard, alertas, modelo de ameaças e runbook registram a operação prevista;
- workflow manual valida um candidato e constrói imagens sem publicar ou implantar.
- telemetria do alpha fica desabilitada por padrão, exige sessão/consentimento e
  agrega somente eventos allowlist em memória;
- readiness executável liga seis checkpoints da jornada às evidências automatizadas;
- roteiro de teste, matriz de severidade e inventário de conteúdo fecham o gate;
- ALPHA-001 removeu e bloqueou a regressão de credenciais de demonstração preenchidas.

Verificação e recuperação de e-mail permanecem fora do escopo até que seus fluxos
completos sejam definidos.

## 3. Estrutura relevante

- `apps/web`: cliente placeholder Vite;
- `apps/server`: servidor, configuração, autenticação e adaptadores Prisma;
- `apps/server/prisma`: schema e migrações;
- `packages/engine-core`: núcleo puro ainda mínimo;
- `content/packs/pokemon-canonical`: definições e inventários Pokémon desacoplados;
- `content/packs/production-assets`: 54 assets Kenney CC0 aprovados e desativados;
- `content/assets`: registros, catálogos, cobertura, lacunas e quarentena;
- `scripts/generate-pokemon-canonical.mjs`: gerador reproduzível do catálogo;
- `scripts/import-production-assets.mjs`: importação exata a partir do cache privado;
- `tests`: testes arquiteturais, de runtime e autenticação;
- `docker-compose.yml`: PostgreSQL local;
- `.github/workflows/ci.yml`: instalação, migração e qualidade.
- `.github/workflows/release-candidate.yml`: candidato manual sem push ou deploy;
- `ops`: imagens, proxy, budgets, observabilidade e scripts operacionais;
- `docs/runbooks/operations.md`: preparação, backup, restauração e rollback.
- `ops/alpha/readiness.json`: checkpoints, defeitos e autorizações negativas;
- `docs/alpha-test-plan.md`: jornada, privacidade, triagem e gate de saída;
- `docs/content-inventory.md`: procedência do conteúdo permitido.

## 4. Estado por área

| Área | Estado |
| --- | --- |
| Fundação TypeScript e CI | concluída |
| Runtime HTTP/WebSocket | concluído |
| PostgreSQL/Prisma | concluído para a fundação |
| Autenticação, perfil e sessão | concluído na branch |
| Recuperação/verificação de e-mail | não iniciado |
| Casa, movimento e colisão | concluído na branch |
| Mapas e transições | concluído na branch |
| NPCs, diálogos, itens e baús | concluído na branch |
| Missões | concluídas na branch |
| Fundação de criaturas e progressão | concluída na branch |
| Batalha contra NPCs | concluída na branch |
| Encontros e captura | concluídos na branch |
| Batalhas PvP | concluídas |
| Telões e espectadores | concluídos |
| Administração | concluída |
| Hardening e operação | concluído e integrado |
| Alpha privado e estabilização | concluído e integrado |
| Arena e presença | concluídas na branch |
| Catálogo Pokémon e inventário de sprites | pipeline estrutural no PR draft #23; mídia Pokémon bloqueada |
| Biblioteca genérica de produção | 54 assets CC0 no PR draft #25; runtime bloqueado |
| Chat, emotes e convites | concluídos na branch |
| Empacotamento de produção | concluído, não implantado |

## 5. Comandos

```text
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm --filter @lt/server prisma:generate
pnpm --filter @lt/server db:migrate
pnpm dev
pnpm content:pokemon -- --with-private-sprites
pnpm content:pokemon:audit
pnpm content:pokemon:assets-audit
pnpm content:assets:generate
pnpm content:assets:audit
pnpm content:audio:audit
pnpm content:animations:audit
pnpm assets:import
pnpm assets:inventory
pnpm assets:validate
pnpm security:runtime-content
pnpm --filter @lt/admin dev
pnpm check
pnpm audit --prod --audit-level high
pnpm alpha:readiness
```

## 6. Verificações atuais

- formatação, lint e TypeScript estrito;
- 34 arquivos de teste e 133 testes automatizados;
- build do servidor e cliente;
- builds independentes do jogo e da administração;
- budgets: web 1.257.341/1.400.000 bytes, admin 9.335/100.000 bytes e maior asset
  1.540.587/2.000.000 bytes;
- auditoria de dependências sem vulnerabilidades conhecidas;
- scans de segredo e licenças aprovados;
- validação do schema Prisma;
- migrações aplicadas em PostgreSQL vazio pela CI;
- nenhum segredo incluído;
- 4.100 sprites de terceiros incluídos por instrução explícita do proprietário,
  todos temporários, desconectados do runtime e marcados com direitos `doubtful`;
- 4.100 hashes e 4.100 decodificações PNG verificados offline; CRC, estrutura,
  dimensões, transparência, unicidade e variantes cobertos;
- cache privado separado por SHA da revisão e autorização D-023 fixada em
  `2026-07-23`, sem dependência de `retrievedAt` ou relógio do sistema;
- 54 assets Kenney CC0 auditados: 15 imagens, 39 áudios e 1.141.825 bytes;
- nove candidatos de áudio rejeitados por clipping e ausentes do pack publicado;
- regeneração determinística de 81 arquivos e auditoria unificada sem violações;
- CI do hardening aprovada no run `30058365529` para o SHA `98566b21`;
- imagens, Compose e restauração serão exercitados pela CI Linux porque Docker não
  está disponível neste computador.

## 7. Limitações e riscos

- Docker não está disponível no computador atual; a integração com PostgreSQL é
  validada na CI;
- parâmetros Argon2id precisam ser reavaliados em hardware de produção;
- não existe envio de e-mail, recuperação de senha ou MFA;
- o repositório permanece público;
- 4.100 sprites de batalha foram publicados no pack e preservados também em
  `.private/`;
- nenhuma coleção de sprites Pokémon está aprovada para redistribuição;
- os 54 assets genéricos D-025 estão aprovados para redistribuição, mas desativados;
- aliases semânticos, caminhada direcional e medição no runtime permanecem pendentes;
- nenhum deploy foi realizado.

## 8. Decisões vigentes

D-001 a D-008 e D-011 a D-025 estão aceitas. As demais decisões técnicas
continuam com o status registrado em `docs/decisions.md`.

## 9. Próxima tarefa recomendada

Mapear semanticamente um único tileset Tiny em uma zona piloto, medir carregamento e
FPS e submeter sua ativação separada à revisão do proprietário.

## 10. Instruções para reproduzir

Sincronizar a branch, copiar `.env.example` para `.env`, iniciar PostgreSQL, aplicar
as migrações e executar `pnpm dev`. Para revisão sem Docker, executar `pnpm check`;
a CI cobre PostgreSQL e migrações.

## 11. Atualizacao 2026-07-23 - Pokemon canonical pilot

Estado verificado no GitHub antes desta entrega e novamente durante o rebase:

- `main` estava em `d9989374ee667cf2bbaf0f042fdefe56a7492828`;
- PR #9 estava mergeado;
- PR #10 estava mergeado;
- esta entrega foi preparada na branch `codex/pokemon-canonical-pilot`.

Escopo implementado nesta branch:

- pacote piloto `content/packs/pokemon-canonical`;
- estrutura por Pokemon para Bulbasaur, Ivysaur e Venusaur;
- manifestos por Pokemon com status `pending`;
- definicoes de Pokemon, habilidades e golpes em JSON;
- inventarios vazios ou referenciais para sprites, animacoes e sons;
- schema JSON documentando o contrato inicial do pacote;
- teste automatizado para impedir importacao acidental de midia neste piloto.

Verificacao executada nesta branch:

- `pnpm check`: aprovado;
- 12 arquivos de teste e 35 testes aprovados;
- aviso nao bloqueante: Node local `v24.16.0`, enquanto o repo pede `24.14.0`;
- aviso nao bloqueante: chunk `game` do Vite acima de 500 kB.

Nenhum sprite, animacao, som, logo ou outro arquivo de midia foi baixado,
convertido, otimizado, renomeado ou publicado nesta etapa. As referencias visuais
permanecem pendentes ate revisao explicita de licenca/autorizacao pelo proprietario.

## 12. Atualização 2026-07-23 - Catálogo Pokémon completo

Estado do GitHub verificado antes da conclusão:

- `main` em `87ced88cc2a72505d9eea563214be0cbc059a891`, com o PR #13 integrado;
- PR #14 aberto em rascunho para batalhas entre jogadores;
- branch desta entrega: `codex/pokemon-canonical-full`;
- branch atualizada por merge de `origin/main`, sem force-push.

Escopo concluído:

- 1.025 pastas, de `0001-bulbasaur` a `1025-pecharunt`;
- definições de espécie, atributos, tipos, habilidades e evoluções;
- 937 golpes com tipo, categoria, poder, precisão, PP, prioridade e efeitos;
- learnsets com grupo de versão, geração, método, nível, ordem, maestria e TM/HM/TR;
- 43.383 candidatos estáticos e 10.421 animados inventariados;
- 1.025 sprites reais frontais verificados em quarentena local;
- 1.025 sprites reais frontais publicados nas respectivas pastas `sprites/`;
- schema v2, gerador reproduzível, catálogos normalizados e teste integral;
- análise de fontes em `docs/pokemon-content-sources.md`.

Limites:

- a mídia publicada permanece com direitos `doubtful` e desacoplada do runtime;
- sons não foram pesquisados ou preenchidos;
- formas alternativas são inventariadas como assets, mas não possuem pasta de
  criatura própria nesta versão;
- todos os estados de definição e licença continuam pendentes de decisão do
  proprietário.

## 13. Atualização 2026-07-23 - Publicação dos sprites frontais

Estado do GitHub verificado antes da alteração:

- `main` em `88420a4481ac1ea04fa3562c0d729c84ba583f34`, com a Fase 14 integrada;
- PR #16 aberto em rascunho na branch `agent/fase-15-painel-administrativo`;
- sobreposição com o trabalho paralelo limitada a `docs/current-state.md` e
  `docs/work-log.md`;
- nenhum conflito em código, schemas, conteúdo Pokémon ou testes.

## 13. Atualização 2026-07-23 - Pipeline seguro de assets

Estado Git/GitHub:

- branch `codex/pokemon-assets-integration`;
- base `codex/pokemon-assets-audit` no SHA `a3b4dc13`;
- reserva de escrita na issue #22;
- PR draft #23 aberto contra a branch da auditoria;
- nenhum merge e nenhum deploy.

Dados:

- 1.025 espécies preservadas;
- 1.579 formas catalogadas explicitamente;
- 937 movimentos e 373 habilidades verificados;
- 64 nomes de movimentos e 15 nomes de habilidades corrigidos a partir dos CSVs
  ingleses da revisão PokéAPI fixa;
- 32 version groups preservados sem escolher uma geração de gameplay silenciosamente.

Assets:

- registro central com 14 fontes;
- 4.100 sprites D-023 catalogados em três shards, todos bloqueados;
- 2.000 cries catalogados sem download, hash local ou runtime;
- 20 perfis procedurais e 937 mapeamentos de apresentação;
- zero frame animation, zero efeito sonoro novo e zero mídia Pokémon aprovada;
- nenhum arquivo de imagem ou áudio adicionado, removido ou modificado.

Runtime:

- flags separadas e seguras por padrão;
- política exige aprovação do asset e da fonte, redistribuição, revisão, hash,
  decisão e flag específica;
- Phaser configurado para pixel art e laboratório de desenvolvimento sem mídia
  Pokémon;
- gerenciador de áudio central com fallback e controles, mas categorias bloqueadas.

Medições locais:

- 33 arquivos e 130 testes aprovados;
- bundle web 1.257.242/1.400.000 bytes;
- admin 9.335/100.000 bytes;
- maior asset 1.540.587/2.000.000 bytes;
- auditorias: 4.100 sprites, 2.000 cries, 20 perfis, 937 apresentações e zero
  violação.

Escopo concluído:

- 1.025 PNGs frontais publicados, um em cada pasta `sprites/`;
- 1.067.409 bytes de mídia, aproximadamente 1,02 MiB;
- todos os arquivos comparados com a quarentena e com o SHA-256 do inventário;
- zero divergências, ausências ou arquivos corrompidos;
- gerador atualizado com `--publish-front-sprites` e revisões de fonte explícitas;
- manifests, inventários, schema, documentação de fontes e decisão D-020
  atualizados;
- animações, sons, shiny, costas e variações por jogo continuam fora da publicação.

Verificação executada:

- `pnpm check`: aprovado;
- 21 arquivos de teste e 62 testes aprovados;
- lint, TypeScript e builds do servidor/cliente aprovados;
- aviso não bloqueante: chunk `game` do Vite acima de 500 kB.

Risco aceito:

- os sprites permanecem com estado `doubtful`;
- a autorização do proprietário do repositório não é apresentada como licença da
  Nintendo, Game Freak ou The Pokémon Company;
- os arquivos não foram ligados ao runtime nesta etapa.

## 14. Atualização 2026-07-23 - Coleção compacta e status das definições

Escopo concluído:

- coleção uniforme ampliada de 1 para 4 sprites por espécie;
- frente normal, frente shiny, costas normal e costas shiny para todos os 1.025
  Pokémon;
- 4.100 PNGs publicados, totalizando 4.010.860 bytes;
- 4.100 arquivos comparados com a quarentena e seus SHA-256, com zero erros;
- `definitions/status.json` criado para cada espécie;
- 1.025 definições marcadas como `approved` após validação automatizada de schema,
  cobertura e referências;
- manifesto do pack registra `approvedDefinitionCount: 1025`;
- gerador reproduzível atualizado para `--publish-battle-sprites`.

Limites:

- `approved` não significa revisão manual de toda regra de cada jogo;
- dados de balanceamento do projeto continuam separados dos dados canônicos;
- sprites permanecem `doubtful` e desacoplados do runtime;
- animações, sons e variantes específicas de jogos continuam somente inventariados.

Verificações:

- 4.100 sprites, quatro variantes por espécie, zero ausências ou divergências;
- 1.025 arquivos de status coerentes com os manifests;
- teste específico do catálogo: 4 testes aprovados;
- `pnpm check`: 21 arquivos de teste e 62 testes aprovados;
- formatação, lint, TypeScript e builds aprovados.

## 15. Atualização 2026-07-24 - Biblioteca CC0 de produção

Estado Git/GitHub:

- branch exclusiva `codex/production-asset-library`;
- base `codex/pokemon-assets-integration` no SHA `e0f65704`;
- reserva de escrita na issue #24;
- implementação no commit `5bce3672`;
- PR draft #25 aberto contra a branch de integração;
- nenhum merge, deploy ou ativação de runtime.

Entrega:

- oito packs Kenney CC0 fixados por versão, URL, tamanho e SHA-256;
- 15 PNGs, 39 OGGs, três atlases JSON e oito licenças originais publicados;
- 54 assets e 1.141.825 bytes de mídia aprovados para redistribuição;
- nove OGGs rejeitados por clipping, sem bytes publicados;
- importador por cache privado, inventário, cobertura, lacunas e quarentena;
- decisão D-025 e `THIRD_PARTY_NOTICES.md`;
- zero arquivo alterado em `content/packs/pokemon-canonical`;
- zero asset novo habilitado no runtime.

Verificações locais:

- regeneração determinística de 81 arquivos;
- `pnpm check`: 34 arquivos e 133 testes aprovados;
- build, budgets, segredos, licenças e limite de runtime aprovados;
- auditoria unificada: 22 fontes, 4.115 imagens, 2.039 áudios e zero violação;
- `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida;
- CI run `30065522318`: aprovada para o SHA `142fc20f`.

Riscos:

- os 4.100 PNGs Pokémon D-023 permanecem públicos, `doubtful` e bloqueados;
- não há sprites, animações ou cries Pokémon licenciados neste lote;
- os atlases precisam de aliases semânticos antes de uso;
- nenhum ciclo completo de caminhada em quatro direções foi aprovado;
- os assets genéricos ainda precisam de medição real no runtime e direção de arte.
