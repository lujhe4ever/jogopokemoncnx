# Registro de trabalho

Este arquivo é cronológico e append-only. Cada sessão recebe uma nova entrada.
Entradas anteriores não são reescritas; correções factuais são registradas como errata
posterior.

Não registrar raciocínio interno da IA. Registrar apenas contexto, decisões, ações,
verificações e resultados úteis para continuidade.

## 2026-07-23 — Baseline arquitetural

### Responsável humano

Não informado.

### Objetivo da sessão

Criar a referência arquitetural antes de qualquer código.

### Estado anterior

- repositório vazio;
- nenhuma branch com conteúdo;
- nenhum código, dependência ou documentação.

### Alterações realizadas

- criado `architecture.md`;
- registrados contexto, objetivos e não objetivos;
- proposta a direção técnica de frontend, backend, tempo real, dados e infraestrutura;
- separados engine, domínio, mundo, batalha, arena e persistência;
- documentados segurança, conteúdo substituível, performance, testes, deploy, riscos e
  roadmap;
- decisões D-001 a D-010 mantidas como **Proposta**.

### Arquivos criados ou modificados

- `architecture.md`.

### Comandos executados

- nenhum comando de produto; o repositório ainda não possuía toolchain.

### Testes e verificações

- estrutura Markdown validada;
- seções obrigatórias verificadas;
- conteúdo remoto comparado ao documento preparado;
- commit remoto confirmado contendo somente `architecture.md`.

### Resultado Git

- branch: `main`;
- commit: `b73b2b0124cbe57e96517785f84d0354426b5884`;
- mensagem: `docs: establish architecture baseline`.

### Problemas encontrados

- o projeto ainda não possuía processo de continuidade entre duas IAs;
- stack e metas técnicas ainda aguardavam revisão.

### Próximos passos registrados naquela sessão

Revisar a baseline antes de qualquer scaffold.

## 2026-07-23 — Estrutura documental colaborativa

### Responsável humano

Não informado.

### Objetivo da sessão

Criar a documentação mínima para que duas pessoas e duas IAs trabalhem alternadamente
no mesmo repositório sem depender de contexto local.

### Estado anterior

- `main` continha somente `architecture.md`;
- havia um único commit;
- não existiam issues ou pull requests;
- não existia código, dependência, ambiente, banco, container ou CI;
- não existia `AGENTS.md` nem diretório `docs/`.

### Alterações realizadas

- criada a ref remota `docs/estrutura-inicial` a partir da revisão validada de `main`;
- confirmado que a ref ainda aponta para o mesmo commit da `main`, sem os documentos
  preparados localmente;
- atualizada a baseline raiz somente para separar a Fase 0A histórica da Fase 0B e
  apontar o roadmap operacional;
- adicionado `AGENTS.md` com:
  - objetivo, stack proposta e princípios;
  - convenções, segurança e propriedade intelectual;
  - comandos atuais honestamente marcados como indisponíveis;
  - procedimento antes, durante e depois da tarefa;
  - fluxo Git/GitHub entre IA implementadora e revisora;
  - relatório obrigatório de continuidade;
- adicionada visão operacional da arquitetura sem substituir a baseline raiz;
- criado roadmap granular com dependências, critérios, riscos e status;
- documentada a visão funcional do jogo e suas questões abertas;
- criado registro cronológico de decisões;
- criado estado atual factual;
- iniciado este work log append-only;
- realizada revisão independente e corrigidas inconsistências de governança,
  sequenciamento de batalha/captura e gates de decisão;
- nenhum gameplay, scaffold, dependência ou asset foi criado.

### Arquivos criados ou modificados

- `architecture.md`;
- `AGENTS.md`;
- `docs/architecture.md`;
- `docs/roadmap.md`;
- `docs/game-design.md`;
- `docs/decisions.md`;
- `docs/current-state.md`;
- `docs/work-log.md`.

### Comandos executados

- nenhum comando de instalação, desenvolvimento, lint, teste ou build do produto:
  esses comandos ainda não existem;
- consultas de leitura ao estado, branches, histórico, issues e PRs do GitHub;
- validação documental local antes da publicação.

### Testes e verificações

- confirmação da base `main` no commit
  `b73b2b0124cbe57e96517785f84d0354426b5884`;
- confirmação de que a base possuía somente `architecture.md`;
- validação de arquivos e seções obrigatórias;
- validação de links relativos entre documentos;
- validação de blocos Markdown e Mermaid balanceados;
- busca por possíveis segredos e arquivos fora do escopo;
- revisão independente de consistência entre arquitetura, roadmap, design, decisões e
  estado atual;
- confirmação local de que o conjunto preparado contém somente documentação.

Lint, testes automatizados e build: **não disponíveis até a Fase 1**.

Publicação, comparação do diff remoto e conferência do conteúdo remoto permanecem
pendentes neste registro. O resultado será acrescentado em uma nova entrada, sem
reescrever esta.

### Decisões operacionais

- GitHub é a fonte oficial entre as duas IAs.
- Apenas uma IA escreve na branch por vez.
- A segunda IA atua como revisora sobre revisão identificada.
- Toda etapa usa explicação, autorização, implementação, verificação e pausa.
- Documentação de estado e work log faz parte da definição de pronto.
- A baseline raiz é normativa; `docs/architecture.md` é operacional.
- A entrega original foi nomeada Fase 0A e a governança colaborativa Fase 0B, sem
  alterar o status das decisões técnicas.
- D-001 a D-010 permanecem **Proposta**.
- Nenhum merge ou início da Fase 1 é presumido.

### Problemas encontrados

- o repositório está público, embora o projeto seja descrito como privado para estudo;
- não há toolchain para executar lint, testes ou build;
- existe risco de duplicação entre documentos de arquitetura, mitigado por ownership
  explícito;
- decisões de stack e game design ainda precisam de aprovação na fase correta.

### Resultado Git

- branch: `docs/estrutura-inicial`;
- base: `main` em
  `b73b2b0124cbe57e96517785f84d0354426b5884`;
- estado da ref neste registro: idêntica à `main`;
- commits desta entrega: publicação pendente neste registro;
- merge: não realizado;
- deploy: não aplicável;
- PR: não presumido por esta sessão.

### Próximos passos

Publicar e verificar a branch `docs/estrutura-inicial`. Depois, apresentar o resultado
para revisão e decisão explícita sobre merge. Não iniciar a Fase 1.

## 2026-07-23 — Publicação e verificação da Fase 0B

### Responsável humano

Não informado.

### Objetivo da sessão

Publicar os documentos preparados, comprovar que o GitHub contém o conteúdo esperado e
registrar o handoff final sem fazer merge ou iniciar a Fase 1.

### Estado anterior

- a ref remota `docs/estrutura-inicial` existia e era idêntica à `main`;
- os oito documentos estavam preparados e validados localmente;
- publicação, comparação remota e hashes ainda estavam pendentes.

### Alterações realizadas

- publicado o commit documental inicial
  `b8cbb1400d6a87eab88fb4b03ee89ddf3ed85484`;
- detectada codificação corrompida somente em `architecture.md` durante a conferência
  do conteúdo remoto;
- publicada a correção de codificação no commit
  `9dcd89861a23293e65ff189bc7aca817326c2b8e`;
- repetida a comparação por Git blob SHA para os oito arquivos;
- atualizados `docs/current-state.md`, `docs/roadmap.md` e este registro com os
  resultados reais.

### Testes e verificações

- comparação `main...docs/estrutura-inicial`: branch à frente, sem ficar atrás;
- diff após a correção: exatamente oito arquivos Markdown;
- comparação de bytes por Git blob SHA: oito correspondências, zero divergências;
- links relativos, H1, cercas Markdown/Mermaid, fases do roadmap, campos do relatório
  e padrões comuns de segredo: válidos;
- lint, testes automatizados e build: não disponíveis até a Fase 1.

### Resultado Git

- branch: `docs/estrutura-inicial`;
- base: `main` em
  `b73b2b0124cbe57e96517785f84d0354426b5884`;
- commits de conteúdo:
  - `b8cbb1400d6a87eab88fb4b03ee89ddf3ed85484`;
  - `9dcd89861a23293e65ff189bc7aca817326c2b8e`;
- o commit que contém esta entrada é identificado pelo histórico da branch;
- PR: não criado;
- merge: não realizado;
- deploy: não aplicável.

### Problemas e riscos

- o repositório permanece público;
- D-001 a D-010 continuam **Proposta**;
- não existe toolchain ou aplicação;
- revisão do proprietário permanece obrigatória antes de merge ou Fase 1.

### Próximo passo

Revisar a branch publicada e decidir explicitamente entre ajustes ou merge da Fase
0B. Não iniciar a Fase 1 na mesma tarefa.

## 2026-07-23 — Abertura do Pull Request da Fase 0B

### Responsável humano

Não informado.

### Objetivo da sessão

Publicar a documentação pelo fluxo de revisão ideal do GitHub, sem exigir ação manual
na interface e sem realizar merge.

### Estado anterior

- a branch `docs/estrutura-inicial` estava publicada e verificada;
- a branch estava três commits à frente e zero atrás da `main`;
- não existia Pull Request aberto para essa branch;
- a Fase 1 permanecia não iniciada.

### Alterações realizadas

- aberto o [PR #1](https://github.com/lujhe4ever/jogopokemoncnx/pull/1) com:
  - título `docs: estabelecer arquitetura e governança da Fase 0B`;
  - origem `docs/estrutura-inicial`;
  - destino `main`;
  - modo rascunho;
  - descrição de objetivo, mudanças, motivação, impacto e verificações;
  - riscos e checklist de revisão;
- atualizado o estado atual e o roadmap para apontar ao PR;
- nenhum merge, deploy, código, dependência ou asset foi criado.

### Testes e verificações

- confirmado que o PR possui oito arquivos alterados;
- confirmado que o PR foi aberto, não foi mesclado e permanece em rascunho;
- confirmado que a base é `main` no commit
  `b73b2b0124cbe57e96517785f84d0354426b5884`;
- validações documentais repetidas após esta atualização;
- lint, testes automatizados e build: não disponíveis até a Fase 1.

### Resultado Git

- PR: [#1](https://github.com/lujhe4ever/jogopokemoncnx/pull/1);
- branch: `docs/estrutura-inicial`;
- destino: `main`;
- o commit que contém esta entrada é identificado pelo histórico da branch;
- merge: não realizado;
- deploy: não aplicável.

### Problemas e riscos

- o repositório permanece público;
- o PR ainda não possui CI porque não existe toolchain;
- D-001 a D-010 continuam **Proposta**;
- a revisão do proprietário permanece obrigatória.

### Próximo passo

Revisar o PR #1 e decidir entre ajustes ou autorização para marcá-lo como pronto para
revisão. Não realizar merge nem iniciar a Fase 1 sem autorização separada.

## 2026-07-23 — Integração da Fase 0B e reserva da Fase 1

### Responsável humano

Luan, conforme autorização registrada na conversa da tarefa.

### Objetivo da sessão

Integrar a documentação aprovada e reservar de forma visível a fundação técnica da
Fase 1 antes de criar código.

### Estado anterior

- PR #1 aberto e marcado como pronto para revisão;
- Fase 0B ainda não integrada;
- Fase 1 não iniciada;
- D-001 e D-002 ainda com status Proposta.

### Alterações realizadas

- PR #1 integrado à `main` pelo commit
  `41c2807b1b5e240909fb08c76f0325cc68345729`;
- branch exclusiva `agent/fase-1-fundacao` criada a partir dessa revisão;
- Fase 0B marcada como concluída;
- Fase 1 marcada como em andamento para publicação da reserva;
- escopo limitado à fundação TypeScript, qualidade, testes arquiteturais e CI.

### Testes e verificações

- merge do PR #1 confirmado pelo GitHub;
- `main` sincronizada com `origin/main`;
- worktree confirmado sem alterações anteriores à reserva;
- nenhum código, asset, dependência, banco ou deploy criado neste snapshot.

### Decisões operacionais

- D-001 e D-002 serão registradas como aceitas no conjunto de mudanças da Fase 1;
- gameplay, autenticação, banco, migrações e deploy permanecem fora do escopo.

### Problemas e riscos

- o repositório permanece público;
- a toolchain ainda precisa ser validada em Windows e CI;
- o utilitário `gh` não está instalado; publicação usa `git` e o conector GitHub.

### Próximo passo

Publicar esta reserva em um PR rascunho e somente então iniciar o scaffold mínimo da
Fase 1.

## 2026-07-23 — Fundação técnica da Fase 1

### Objetivo da sessão

Criar um workspace TypeScript mínimo e reproduzível, sem gameplay.

### Alterações realizadas

- fixados Node 24.14.0, pnpm 11.9.0 e TypeScript 6.0.3;
- criados workspaces mínimos para web, servidor e engine-core;
- configurados Prettier, ESLint, Vitest, Husky, lint-staged e CI;
- criado teste que impede dependências de framework e Node no engine-core;
- D-001 e D-002 registradas como aceitas;
- Turborepo adiado por não haver benefício mensurável nesta escala.

### Testes e verificações

- `pnpm install --frozen-lockfile`: lockfile reproduzível;
- `pnpm format:check`: aprovado;
- `pnpm lint`: aprovado;
- `pnpm typecheck`: aprovado;
- `pnpm test`: 1 teste aprovado;
- `pnpm build`: aprovado;
- `pnpm peers check`: nenhuma incompatibilidade.

### Problemas e riscos

- CI remota ainda depende da execução do GitHub Actions;
- aplicações ainda são apenas composition roots de fundação;
- repositório permanece público.

### Próximo passo

Revisar o PR #2 e seus checks; não iniciar a Fase 2 antes dessa revisão.

## 2026-07-23 — Integração da Fase 1 e reserva da Fase 2

### Objetivo da sessão

Integrar a fundação aprovada e reservar o runtime local mínimo.

### Alterações realizadas

- PR #2 integrado à `main` no commit
  `30ff816587740abffc0b537686cce5b74b11f12c`;
- branch `agent/fase-2-runtime-local` criada;
- reservado o escopo de cliente placeholder, health/readiness, WebSocket versionado,
  PostgreSQL, Prisma, configuração validada e logs estruturados.

### Testes e verificações

- CI do PR #2 concluída com sucesso;
- PR sem comentários ou threads pendentes;
- `main` sincronizada por fast-forward.

### Problemas e riscos

- D-005 e D-006 ainda precisam ser registradas como aceitas;
- Docker local ainda não foi verificado;
- nenhum deploy está autorizado.

### Próximo passo

Publicar a reserva em PR rascunho antes de implementar o runtime.

## 2026-07-23 — Runtime local mínimo da Fase 2

### Objetivo da sessão

Comprovar a comunicação vazia entre navegador, servidor e PostgreSQL.

### Alterações realizadas

- servidor Fastify com health, readiness, correlação e encerramento gracioso;
- handshake WebSocket versionado;
- cliente Vite placeholder com HTTP e WebSocket;
- Prisma isolado no servidor, schema e migração inicial;
- PostgreSQL em Docker Compose;
- configuração validada por Zod e logs estruturados;
- CI com PostgreSQL e aplicação da migração;
- D-005 e D-006 registradas como aceitas.

### Testes e verificações

- `pnpm check`: aprovado;
- 2 arquivos de teste e 3 testes aprovados;
- build Vite aprovado;
- `prisma validate`: aprovado;
- diff da migração desde banco vazio gerado com sucesso;
- Docker local não executado porque o binário não está instalado.

### Problemas e riscos

- Compose e migração real dependem da CI do PR #3;
- nenhum deploy foi realizado;
- autenticação e gameplay permanecem fora do escopo.

### Próximo passo

Revisar o PR #3 e os checks remotos antes de iniciar a Fase 3.

## 2026-07-23 — Integração da Fase 2 e reserva da Fase 3

### Objetivo da sessão

Integrar o runtime validado e reservar autenticação, perfil e sessão.

### Alterações realizadas

- PR #3 integrado à `main` no commit
  `2770e5a70ce35b9758f8fe76392f1743269347a5`;
- branch `agent/fase-3-autenticacao` criada;
- reservado cadastro, login, Argon2id, sessão opaca, perfil, ticket WebSocket,
  rate limiting e testes de autorização.

### Testes e verificações

- PostgreSQL, migração e `pnpm check` aprovados na CI do PR #3;
- `main` sincronizada por fast-forward;
- nenhum deploy executado.

### Problemas e riscos

- recuperação de senha e verificação de e-mail não serão expostas sem fluxo completo;
- cookies seguros exigem configuração diferente em desenvolvimento;
- dados pessoais devem permanecer mínimos.

### Próximo passo

Publicar a reserva da Fase 3 em PR rascunho antes de implementar autenticação.

## 2026-07-23 — Autenticação, perfil e sessão da Fase 3

### Objetivo da sessão

Permitir login seguro por e-mail/senha e carregar um perfil mínimo.

### Alterações realizadas

- cadastro e login com validação de entrada;
- senha Argon2id com parâmetros explícitos;
- sessão opaca, expiração, revogação e cookie seguro;
- perfil mínimo persistido;
- ticket WebSocket efêmero e de uso único;
- rate limiting e auditoria sem credenciais;
- migração de contas, perfis, sessões, tickets e auditoria;
- D-008 registrada como aceita.

### Testes e verificações

- `pnpm check`: aprovado antes do teste Argon2id adicional;
- testes de cadastro/login, sessão, revogação, falha genérica e ticket descartável;
- schema Prisma validado;
- migração será aplicada em PostgreSQL vazio pela CI do PR #4.

### Decisões tomadas

- recuperação e verificação de e-mail foram adiadas até um fluxo completo;
- sessão duradoura nunca é enviada por URL nem armazenada em `localStorage`;
- ticket WebSocket expira em 30 segundos e é consumido atomicamente.

### Problemas e riscos

- parâmetros Argon2id precisam de novo benchmark no hardware de produção;
- Docker local indisponível;
- CI remota ainda precisa validar a nova migração.

### Próximo passo

Revisar o PR #4 e integrar somente após a CI aprovada.

## 2026-07-23 — Integração da Fase 3 e reserva da Fase 4

### Objetivo da sessão

Integrar autenticação e reservar a primeira fatia jogável da casa.

### Alterações realizadas

- PR #4 integrado à `main` no commit
  `62545d2d0fcaa59617fe6b2260508ce1c1a12b39`;
- branch `agent/fase-4-casa-movimento` criada;
- reservado engine-core, Phaser, casa original, input, simulação autoritativa,
  reconciliação e checkpoint.

### Testes e verificações

- migração de autenticação e sete testes aprovados na CI;
- `main` sincronizada por fast-forward;
- nenhum deploy executado.

### Problemas e riscos

- latência precisa ser simulada em testes;
- o servidor não pode realizar I/O no tick;
- o placeholder deve permanecer original e orientado a dados.

### Próximo passo

Publicar a reserva da Fase 4 antes de implementar gameplay.

## 2026-07-23 — Casa, movimentação e colisão da Fase 4

### Objetivo da sessão

Entregar a primeira fatia jogável autoritativa.

### Alterações realizadas

- engine-core puro com movimento, normalização e colisão;
- pacote game-simulation com mapa da casa e spawn seguro;
- pack placeholder original sem assets externos;
- cliente Phaser carregado sob demanda após login;
- teclado, setas e controles de toque;
- previsão local, snapshots, interpolação e reconciliação;
- sala autoritativa com tick de 20 Hz e limite de inputs;
- checkpoint carregado na conexão e persistido fora do tick;
- D-003 e D-004 registradas como aceitas.

### Testes e verificações

- `pnpm check`: 5 arquivos de teste e 12 testes aprovados;
- movimento adulterado limitado pelo servidor;
- colisão e limites verificados headless;
- dois clientes falsos recebem snapshot consistente;
- checkpoint inseguro volta ao spawn e não há I/O no tick;
- bundle inicial separado do chunk Phaser;
- formulário verificado visualmente em 390 x 844 sem overflow.

### Problemas e riscos

- chunk Phaser é grande, mas carregado apenas depois do login;
- Docker local indisponível; migração será validada pela CI;
- desempenho mobile do canvas requer medição em dispositivo físico futuro.

### Próximo passo

Revisar e integrar o PR #5 após a CI aprovada.

## 2026-07-23 — Integração da Fase 4 e reserva da Fase 5

### Contexto

O PR #5 passou no CI e foi integrado à `main` no commit
`861d4a68681c3c76279aad354dcc6b2112d42a8e`.

### Escopo reservado

- contrato declarativo de mapa e zonas;
- portais e transições validados pelo servidor;
- spawn e checkpoint por zona;
- carregamento e descarte de packs sob demanda;
- área de interesse sem vazamento de estado entre zonas.

### Fora do escopo

NPCs, itens, inventário, criaturas, batalha, arena e deploy público.

### Próximo passo

Publicar o PR de reserva da Fase 5 antes de iniciar a implementação.

## 2026-07-23 — Mapas, zonas e transições da Fase 5

### Resultado

- casa e clareira descritas por contrato declarativo;
- portais bidirecionais com spawn de destino;
- servidor rejeita transição fora do gatilho ou com ID incorreto;
- checkpoint passa a preservar `zoneId`;
- snapshots incluem somente jogadores da mesma zona;
- cliente troca a geometria ativa e descarta os objetos visuais anteriores;
- manifests originais identificam packs versionados sem assets externos.

### Testes e verificações

- `pnpm check`: 6 arquivos e 14 testes aprovados;
- transição inválida rejeitada;
- transição válida não duplica avatar e persiste o destino;
- jogadores em zonas diferentes não aparecem no mesmo snapshot;
- build inicial permanece separado do chunk Phaser;
- schema e migração Prisma validados localmente e pela CI do PR.

### Próximo passo

Revisar e integrar o PR #6 após a CI aprovada.

## 2026-07-23 — Integração da Fase 5 e reserva da Fase 6

### Contexto

O PR #6 passou no CI e foi integrado à `main` no commit
`db2a7377f3c97abe29351d4501a5edf3f316c58b`.

### Escopo reservado

- interação contextual validada por proximidade;
- NPC e diálogo declarativos;
- itens, pickups e baús idempotentes;
- inventário transacional com limites;
- feedback visual acessível.

### Fora do escopo

Criaturas, progressão, batalha, missões completas, arena e deploy público.

### Próximo passo

Publicar o PR de reserva da Fase 6 antes de implementar o ciclo de interação.

## 2026-07-23 — NPCs, diálogos, itens e baús da Fase 6

### Resultado

- interações são conteúdo declarativo por zona e capacidade;
- servidor valida zona, ID e distância antes de executar;
- NPC entrega diálogo sem regra de infraestrutura;
- pickup e baú concedem itens uma única vez por conta;
- claim e inventário são atualizados na mesma transação serializável;
- inventário preserva 20 slots e stacks de até 99 unidades;
- cliente oferece ação por `E` e toque com resultado em região `aria-live`.

### Testes e verificações

- `pnpm check`: 7 arquivos e 17 testes aprovados;
- distância inválida não alcança o repositório de recompensa;
- retry retorna `already_claimed`;
- limites de slot, stack e quantidade inválida verificados;
- schema Prisma válido e migração preparada para PostgreSQL vazio;
- build inicial continua separado do chunk Phaser;
- tela inicial inspecionada no navegador sem overflow horizontal.

### Riscos restantes

- desempenho do Phaser em dispositivo móvel físico ainda requer medição;
- descarte, expansão de capacidade e itens consumíveis ficam para fases futuras;
- o chunk Phaser segue acima do aviso de 500 kB, porém é carregado após o login.

### Próximo passo

Revisar e integrar o PR #7 após a CI aprovada.

## 2026-07-23 — Integração da Fase 6 e reserva da Fase 7

### Contexto

O PR #7 passou no CI e foi integrado à `main` no commit
`f84df62311404ba6fa0ca3bce7778bc4d47e267e`.

### Escopo reservado

- definição e instância de criatura separadas;
- catálogo placeholder original e versionado;
- equipe e coleção com ownership;
- experiência, treinamento e evolução idempotentes;
- persistência transacional.

### Fora do escopo

Encontros, captura, batalha, missões, arena e deploy público.

### Próximo passo

Publicar o PR de reserva da Fase 7 antes de implementar o domínio.

## 2026-07-23 — Fundação de criaturas e progressão da Fase 7

### Resultado

- novo pacote puro `@lt/creature-domain`;
- definição de conteúdo separada da instância pertencente ao jogador;
- catálogo original versionado com duas formas e evolução por nível;
- modelo persistente para coleção, equipe e eventos de progressão;
- equipe limitada a seis criaturas do mesmo proprietário;
- experiência e evolução atualizadas atomicamente com `requestId` idempotente;
- IDs e versões de catálogo/definição preservados no save.

### Testes e verificações

- `pnpm check`: 8 arquivos e 21 testes aprovados;
- atributos fora de 1–255 rejeitados;
- grants inválidos rejeitados e nível limitado a 50;
- ownership, duplicidade e tamanho da equipe verificados;
- evolução ocorre pelo catálogo e não pela infraestrutura;
- catálogo substituto funciona sem alterar engine ou domínio;
- schema Prisma válido e migração preparada para CI.

### Próximo passo

Revisar e integrar o PR #8 após a CI aprovada.

## 2026-07-23 — Integração da Fase 7 e reserva da Fase 8

### Contexto

O PR #8 passou no CI e foi integrado à `main` no commit
`356d2f56cf9fcf27d82e9900db849b1344803adb`.

### Escopo reservado

- máquina de estados pura e isolada do mundo;
- comandos/eventos e turnos validados;
- adversário por política e RNG determinístico;
- UI de seleção de ações;
- resultado idempotente, timeout, abandono e retorno ao mundo.

### Fora do escopo

Encontros aleatórios, captura, missões, PvP, arena e deploy público.

### Próximo passo

Publicar o PR de reserva da Fase 8 antes de implementar a batalha.

## 2026-07-23 — Batalha contra NPCs da Fase 8

### Resultado

- novo pacote puro `@lt/battle-domain`;
- máquina de estados com comandos/eventos, ações atacar/defender e turnos;
- RNG determinístico por seed e política NPC reproduzível;
- comandos fora de sequência ou após encerramento rejeitados;
- serviço de sessão com timeout de 30 segundos e uma batalha ativa por conta;
- abandono e desconexão produzem derrota explícita;
- resultado persistido condicionalmente uma única vez;
- UI acessível com barras rotuladas, região `aria-live` e retorno ao mundo.

### Testes e verificações

- `pnpm check`: 10 arquivos e 27 testes aprovados;
- replay com mesma seed e comandos produz estado idêntico;
- duplicidade e comando fora de turno são rejeitados;
- timeout e desconexão possuem resultados testados;
- resultado repetido não é aplicado novamente;
- teste arquitetural impede o mundo de importar internals de batalha;
- schema Prisma válido e migração preparada para CI.

### Próximo passo

Revisar e integrar o PR #9 após a CI aprovada.

## 2026-07-23 — Integração da Fase 8 e reserva da Fase 9

### Contexto

O PR #9 passou no CI e foi integrado à `main` no commit
`91bbb1b1f80c5e0cf0110f6324625e1cfe114da9`.

### Escopo reservado

- encontro gerado e validado pelo servidor;
- transição explícita entre mundo, batalha e captura;
- elegibilidade e RNG de captura controláveis;
- consumo de item e criação da criatura em operação atômica;
- resultado idempotente e retorno seguro.

### Fora do escopo

Missões, arena, PvP, chat, administração e deploy público.

### Próximo passo

Publicar o PR de reserva da Fase 9 antes de implementar o fluxo.

## 2026-07-23 — Encontros e captura da Fase 9

### Resultado

- encontro selvagem original adicionado à clareira;
- servidor valida proximidade antes de emitir autorização efêmera de 15 segundos;
- autorização é descartável e vincula o encontro à zona e à conta;
- encontro cria e referencia uma batalha explícita;
- captura exige vitória, Orbe de Captura e RNG derivado da seed persistida;
- item, resultado e eventual criatura são gravados atomicamente;
- retries retornam o resultado anterior sem novo consumo ou criatura;
- falha, timeout, abandono, desconexão e recusa retornam ao mundo com estado seguro;
- UI de encontro/captura permanece carregada sob demanda.

### Testes e verificações

- `pnpm check`: 11 arquivos e 32 testes aprovados;
- captura antes da vitória ou com item incorreto é rejeitada;
- chance aumenta com enfraquecimento e respeita teto de 85%;
- seed reproduz tentativa equivalente;
- planejamento de retry não consome item nem cria segunda criatura;
- autorização de proximidade funciona uma vez;
- schema Prisma válido e migração preparada para CI.

### Próximo passo

Revisar e integrar o PR #10 após a CI aprovada.

## 2026-07-23 — Integração da Fase 9 e reserva da Fase 10

### Contexto

O PR #10 passou no CI e foi integrado à `main` no commit
`d9989374ee667cf2bbaf0f042fdefe56a7492828`.

### Escopo reservado

- estados e condições de missão versionados;
- progresso por eventos públicos estáveis;
- recompensas idempotentes e transacionais;
- diário de missões;
- política de migração de conteúdo;
- checkpoint integrado ao progresso.

### Fora do escopo

Arena, presença, chat, PvP, telões, administração e deploy público.

### Próximo passo

Publicar o PR de reserva da Fase 10 antes de implementar o domínio.

## 2026-07-23 — Missões e persistência integrada da Fase 10

### Resultado

- novo pacote puro `@lt/quest-domain` com estado, objetivos, filtros e migração;
- primeira expedição original versionada em pack declarativo;
- progresso alimentado por eventos públicos de zona, interação, batalha e captura;
- recibos por conta/evento e recompensas por missão/versão com unicidade persistente;
- progresso, recibo, inventário e claim protegidos por transação serializável;
- IDs determinísticos permitem reparar entrega em retry ou reconexão;
- diário acessível mostra objetivos, estado e recompensa e é carregado sob demanda;
- versão incompatível é rejeitada até existir migração explícita.

### Testes e verificações

- `pnpm check`: 13 arquivos de teste e 37 testes automatizados;
- filtros e conclusão da missão verificados no domínio puro;
- retry não avança o mesmo evento duas vezes;
- novo serviço restaura o progresso persistido após reconexão;
- conclusão concede exatamente três Tônicos de Campo e retry não duplica o stack;
- schema Prisma e migração de missões validados para PostgreSQL vazio pela CI.

### Próximo passo

Revisar e integrar o PR #11 após a CI aprovada e reservar a Fase 11 sem executar
deploy público.

## 2026-07-23 — Integração da Fase 10 e reserva da Fase 11

### Contexto

O PR #11 passou na CI e foi integrado à `main` no commit
`1310bc64b678db4439cdc98ff36637ee27edb2dc`.

### Escopo reservado

- sala social separada do fluxo de exploração;
- capacidade autoritativa de até 20 presenças;
- entrada, saída, posição e reconexão;
- múltiplas salas sem vazamento;
- snapshots iniciais e deltas de presença;
- instrumentação de tick, backpressure e benchmark de 20 avatares.

### Fora do escopo

Chat, emotes, convites, PvP, telões, administração e deploy público.

### Próximo passo

Publicar o PR rascunho da Fase 11 antes de iniciar a implementação.

## 2026-07-23 — Arena multiplayer e presença da Fase 11

### Resultado

- novo pacote puro `@lt/arena-domain` com movimento e limites autoritativos;
- endpoint WebSocket de arena usa ticket efêmero separado da exploração;
- registro cria múltiplas salas isoladas com capacidade de 20 jogadores;
- snapshot inicial, eventos de entrada/saída e deltas revisionados;
- reconexão de 30 segundos restaura posição e substituição encerra socket anterior;
- backpressure descarta broadcast para socket lento sem bloquear o tick;
- métricas agregam salas, jogadores, mensagens descartadas e maior duração de tick;
- protocolo expõe somente ID público efêmero e nome público;
- UI social separa o mundo, oferece teclado/toque e lista textual acessível.

### Testes e verificações

- `pnpm check`: 15 arquivos e 43 testes automatizados;
- 21ª presença é rejeitada com código de lotação;
- salas distintas não compartilham snapshots;
- reconexão restaura posição dentro da janela;
- conta interna não aparece no payload;
- 20 avatares por 100 ticks permanecem dentro do orçamento local de 250 ms;
- socket acima de 64 KiB é isolado e contabilizado;
- QA no navegador confirmou região, status, lista alternativa e ausência de overflow.

### Próximo passo

Revisar e integrar o PR #12 após a CI aprovada e reservar a Fase 12 sem executar
deploy público.

## 2026-07-23 — Integração da Fase 11 e reserva da Fase 12

### Contexto

O PR #12 passou na CI e foi integrado à `main` no commit
`80f8b534580203eb83cae0c9d7f7cb2c01ab5f4c`.

### Escopo reservado

- chat efêmero com autoria e timestamp do servidor;
- tamanho, frequência e conteúdo básico validados;
- emotes por allowlist de catálogo;
- convites direcionados, expirados e de uso único;
- revalidação de presença e capacidade ao aceitar;
- painel textual acessível além da apresentação sobre o avatar.

### Fora do escopo

Persistência de chat, denúncia avançada, PvP, telões, administração e deploy público.

### Próximo passo

Publicar o PR rascunho da Fase 12 antes de iniciar a implementação.

## 2026-07-23 — Chat, emotes e convites da Fase 12

### Resultado

- novo pacote puro `@lt/social-domain` para validação e rate limit;
- chat efêmero com autoria, timestamp e ID definidos pelo servidor;
- normalização NFKC, limite de 160, rejeição de URL/controle e três mensagens/5 s;
- request IDs deduplicam as últimas 100 ações por conexão;
- emotes por allowlist com limite independente;
- mute local acessível remove mensagens e balões do autor;
- convites direcionados expiram em 30 s e só podem ser aceitos uma vez;
- aceite revalida os dois participantes e emite confirmação privada;
- painel acessível complementa balões sobre os avatares.

### Testes e verificações

- `pnpm check`: 17 arquivos e 49 testes automatizados;
- texto seguro normalizado e conteúdo inseguro rejeitado;
- quarta mensagem na janela recebe `rate_limited`;
- retry de request ID não duplica broadcast;
- IDs internos não aparecem na mensagem pública;
- emote fora da allowlist é rejeitado;
- convite expirado, repetido ou sem participante é rejeitado;
- QA confirmou chat, mute, emotes, convite, `aria-live` e ausência de overflow.

### Próximo passo

Revisar e integrar o PR #13 após a CI aprovada e reservar a Fase 13 sem executar
deploy público.
