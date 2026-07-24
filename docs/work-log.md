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

## 2026-07-23 - Piloto de catalogo Pokemon canonico

### Contexto

O repositorio foi sincronizado com o GitHub antes da alteracao. Durante a entrega,
`main` avancou para `d9989374ee667cf2bbaf0f042fdefe56a7492828` com o merge do PR
#10; a branch do piloto foi rebaseada sobre essa revisao.

### Resultado

- criada a branch `codex/pokemon-canonical-pilot`;
- criado o pacote `content/packs/pokemon-canonical`;
- criado o recorte piloto Bulbasaur/Ivysaur/Venusaur;
- criada a estrutura `sprites`, `animations`, `sounds` e `definitions` por Pokemon;
- preenchidos `pokemon.json`, `abilities.json` e `moves.json` com dados estruturados;
- registrados inventarios de midia sem baixar ou publicar assets;
- adicionado schema JSON inicial para manifests, definicoes e inventarios;
- adicionado teste automatizado para garantir que as pastas de midia tenham apenas
  `inventory.json` durante o piloto.

### Testes e verificacoes

- `pnpm check`: aprovado;
- 12 arquivos de teste e 35 testes aprovados;
- aviso nao bloqueante: Node local `v24.16.0`, enquanto o repo pede `24.14.0`;
- aviso nao bloqueante: chunk `game` do Vite acima de 500 kB.

### Riscos e limites

- licenca e autorizacao seguem como `pending`;
- PokeAPI foi usada como fonte estruturada de metadados, nao como autorizacao sobre
  marcas, personagens ou conteudo visual;
- PokemonDB foi registrado somente como referencia visual pendente;
- sprites, animacoes e sons seguem fora do escopo de importacao.

### Proximo passo

Revisar o piloto e aprovar ou ajustar o schema antes de expandir para a primeira
geracao inteira ou iniciar a triagem de uma colecao privada de sprites.

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

## 2026-07-23 — Catálogo Pokémon canônico completo

### Objetivo da sessão

Expandir o piloto para todas as espécies canônicas, preencher definições auditáveis
e preparar sprites reais para uso futuro sem publicar mídia de licença incerta.

### Estado anterior

O pack continha apenas Bulbasaur, Ivysaur e Venusaur. A branch foi sincronizada com
o `main` após a integração das Fases 10 e 11.

### Alterações realizadas

- 1.025 pastas canônicas, numeradas e nomeadas por slug;
- catálogos globais de 937 golpes, 373 habilidades, métodos e grupos de versões;
- definições por espécie com atributos, tipos, habilidades, evolução e learnsets;
- métodos por nível, máquina, tutor, ovo e equivalentes preservados por jogo/geração;
- inventário de 43.383 sprites estáticos e 10.421 animações;
- 1.025 sprites frontais reais em `.private/`, com SHA-256 e dimensões públicas;
- gerador pinado às revisões das fontes, schema v2 e documentação de direitos;
- nenhum binário de mídia versionado.

### Arquivos alterados

- `content/packs/pokemon-canonical/`;
- `scripts/generate-pokemon-canonical.mjs`;
- `tests/pokemon-canonical-content.test.ts`;
- `.gitignore`, `.prettierignore` e `package.json`;
- `docs/current-state.md`, `docs/work-log.md` e
  `docs/pokemon-content-sources.md`.

### Testes e verificações

- `pnpm install --frozen-lockfile`: aprovado;
- `pnpm --filter @lt/server prisma:generate`: aprovado;
- `pnpm check`: aprovado após a sincronização final;
- 16 arquivos de teste e 47 testes aprovados;
- build do servidor e cliente aprovado;
- aviso não bloqueante: chunk `game` do Vite acima de 500 kB;
- verificação explícita de zero mídia rastreada.

### Decisões tomadas

- dados repetidos de golpes foram normalizados para impedir divergência e reduzir o
  pack de 354 MB para cerca de 52 MB;
- imagens com direitos incertos ficam em quarentena privada;
- a engine não recebe nomes ou caminhos de Pokémon nesta entrega;
- textos funcionais da fonte permanecem em inglês e traduções serão derivadas.

### Pendências ou riscos

- nenhuma coleção de sprites está juridicamente aprovada;
- arquivos privados não são recuperados pelo GitHub em outro computador;
- sons e importação de animações permanecem fora do escopo;
- formas alternativas ainda não possuem diretórios próprios;
- Node local `24.16.0` difere do `24.14.0` fixado pelo projeto.

### Próxima tarefa recomendada

Revisar e aprovar uma única política de sprites, preferencialmente uma coleção
comunitária com autorização e créditos verificáveis, antes de integrar qualquer
imagem ao runtime.

### Instrução para a próxima IA

Ler primeiro `AGENTS.md`, `architecture.md`, `docs/current-state.md`,
`docs/pokemon-content-sources.md`, o fim de `docs/work-log.md` e
`content/packs/pokemon-canonical/README.md`; sincronizar `main` e não publicar a
pasta `.private/`.

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

## 2026-07-23 — Integração da Fase 12 e reserva da Fase 13

### Contexto

O PR #13 passou na CI e foi integrado à `main` no commit
`87ced88cc2a72505d9eea563214be0cbc059a891`.

### Escopo reservado

- converter desafio social aceito em batalha PvP autorizada;
- validar ownership dos dois participantes e impedir comandos do oponente;
- coletar escolhas privadas e resolver cada turno de modo determinístico;
- timeout, abandono e desconexão com resultado explícito;
- resultado persistido uma única vez;
- retorno seguro à arena.

### Fora do escopo

Espectadores, telões, ranking, matchmaking, administração e deploy público.

### Próximo passo

Publicar o PR rascunho da Fase 13 antes de iniciar a implementação.

## 2026-07-23 — Batalhas PvP da Fase 13

### Resultado

- novo pacote puro `@lt/pvp-domain` reutiliza combatentes e ações do núcleo de batalha;
- desafio social consumido inicia PvP apenas para os dois participantes validados;
- servidor consulta uma criatura pertencente a cada conta antes de criar a instância;
- escolhas privadas são confirmadas somente ao remetente e resolvidas após ambas;
- sequência por jogador e mapeamento autenticado impedem replay e comando do oponente;
- timeout de 30 s, abandono e desconexão produzem encerramento explícito;
- `PvpBattleRecord` persiste seed, participantes e resultado uma única vez;
- projeção pública omite escolhas e IDs internos;
- painel acessível apresenta status, vida, atacar, defender, abandonar e retorno à arena.

### Testes e verificações

- `pnpm typecheck`, `pnpm lint` e `pnpm test`: 19 arquivos e 55 testes automatizados;
- schema Prisma validado e migração versionada para registros PvP;
- domínio cobre resolução determinística, sequência, empate e projeção sem escolhas;
- serviço cobre ownership, privacidade da primeira escolha e encerramento idempotente;
- QA no navegador confirmou região nomeada, `aria-live`, barras de vida rotuladas,
  ações acessíveis e ausência de overflow horizontal em 1280 × 720.

### Próximo passo

Revisar e integrar o PR #14 após a CI aprovada e reservar a Fase 14 sem executar
deploy público.

## 2026-07-23 — Sincronização final do catálogo Pokémon

### Contexto

Durante a conclusão do catálogo, o PR #13 foi integrado à `main` no commit
`87ced88cc2a72505d9eea563214be0cbc059a891` e o PR #14 foi aberto em rascunho.

### Resultado

- branch `codex/pokemon-canonical-full` atualizada por merge, sem force-push;
- histórico completo das Fases 11 e 12 preservado;
- documentação do catálogo atualizada para o novo estado compartilhado;
- validação integral do catálogo repetida sobre a base combinada.

### Testes e verificações

- `pnpm check`: aprovado;
- 18 arquivos de teste e 53 testes aprovados;
- lint, TypeScript e builds do servidor/cliente aprovados;
- aviso não bloqueante: chunk `game` do Vite acima de 500 kB.

### Próximo passo

Revisar o catálogo e decidir uma única política de sprites antes de publicar ou
ligar qualquer mídia ao runtime.

## 2026-07-23 — Publicação dos 1.025 sprites frontais

### Objetivo da sessão

Publicar no GitHub todos os sprites reais disponíveis na quarentena local, mantendo
a origem, os hashes, a incerteza de direitos e o isolamento do trabalho paralelo.

### Estado anterior

A branch `codex/pokemon-canonical-full` continha definições e inventários completos,
mas nenhum binário de mídia. A `main` avançou para
`5ca0c3a1149884988d10f24e43cf59da700e7f48` com a integração da Fase 13, e a Fase 14
foi reservada no PR #15.

### Alterações realizadas

- `main` incorporada por merge sem force-push;
- conflitos exclusivamente documentais resolvidos preservando os dois históricos;
- 1.025 PNGs frontais copiados para as respectivas pastas `sprites/`;
- inventários atualizados com caminho público, SHA-256, dimensões, tamanho, data da
  autorização e estado `doubtful`;
- manifests por espécie e manifesto do pack atualizados;
- gerador preparado para reprodução com revisões de fonte explícitas;
- schema, teste de integridade, fontes, decisão D-020 e documentação atualizados;
- runtime mantido sem dependência desses assets.

### Arquivos alterados

- `content/packs/pokemon-canonical/`;
- `scripts/generate-pokemon-canonical.mjs`;
- `tests/pokemon-canonical-content.test.ts`;
- `docs/current-state.md`;
- `docs/work-log.md`;
- `docs/decisions.md`;
- `docs/pokemon-content-sources.md`.

### Testes e verificações

- baseline anterior à integração: 18 arquivos e 53 testes aprovados;
- `pnpm install --frozen-lockfile`: aprovado;
- `pnpm --filter @lt/server prisma:generate`: aprovado;
- teste específico do catálogo: 1 arquivo e 4 testes aprovados;
- auditoria de todos os arquivos: 1.025 conferidos, zero erros, 1.067.409 bytes;
- `pnpm check`: 20 arquivos e 59 testes aprovados, com lint, TypeScript e builds;
- aviso não bloqueante: chunk `game` do Vite acima de 500 kB.

### Decisões tomadas

- publicar exatamente um sprite frontal padrão por espécie;
- preservar a revisão `bf4c47ac82c33b330e33d98b8882d1cedb2f53e7` de
  `PokeAPI/sprites`;
- manter direitos e assets como `doubtful`, sem declarar licença inexistente;
- não publicar animações, sons, shiny, costas ou variantes por jogo nesta etapa;
- não ligar os sprites ao runtime.

### Pendências ou riscos

- a fonte não demonstra autoridade inequívoca para relicenciar a arte oficial;
- o repositório é público;
- qualquer solicitação dos titulares pode exigir remoção dos binários;
- a Fase 14 continua em branch separada e deve preservar as duas entradas
  documentais ao integrar.

### Próxima tarefa recomendada

Revisar visualmente uma amostra por geração e, em tarefa separada, definir o contrato
neutro pelo qual o runtime selecionará sprites sem depender de nomes Pokémon.

### Instrução para a próxima IA

Ler `AGENTS.md`, `architecture.md`, a D-020 em `docs/decisions.md`, esta entrada,
`docs/pokemon-content-sources.md` e o README do pack; sincronizar `main`, preservar a
branch da Fase 14 e não alterar o estado jurídico `doubtful` sem nova evidência.

## 2026-07-23 — Integração da Fase 13 e reserva da Fase 14

### Contexto

O PR #14 passou na CI e foi integrado à `main` no commit
`5ca0c3a1149884988d10f24e43cf59da700e7f48`.

### Escopo reservado

- projeção pública de batalha por allowlist, sem escolhas ou comandos;
- canal de espectador somente leitura dentro da área de interesse da arena;
- sequência, snapshot e retomada após perda de mensagem;
- identificação pública dos competidores, estado revelado e vencedor confirmado;
- fan-out com backpressure e métricas sem bloquear o tick da arena;
- teste de privacidade, retomada e orçamento para até 20 presenças.

### Fora do escopo

Interação de espectador com a batalha, replay histórico, streaming externo, ranking,
administração e deploy público.

### Próximo passo

Publicar o PR rascunho da Fase 14 antes de iniciar a implementação.

## 2026-07-23 — Telões e transmissão da Fase 14

### Resultado

- novo pacote puro `@lt/broadcast-domain` cria a projeção pública por allowlist;
- canais isolados por arena mantêm revisão, 64 deltas e 20 batalhas visíveis;
- entrada/reconexão recebe snapshot e lacunas recebem replay ou novo snapshot;
- PvP publica início, turno resolvido e encerramento confirmado;
- escolha, comando e identificador interno não fazem parte da projeção;
- ação de não participante é rejeitada como `spectator_read_only`;
- fan-out reutiliza backpressure e adiciona métricas de atualizações e entregas;
- telões acessíveis mostram competidores, criaturas, vida, turno e vencedor.

### Testes e verificações

- `pnpm typecheck` e `pnpm lint` aprovados;
- 20 arquivos e 58 testes automatizados após a nova cobertura;
- allowlist testada contra campos extras de conta e escolha;
- replay contíguo e fallback para snapshot cobertos;
- 100 atualizações para 20 sockets ficaram abaixo de 250 ms no teste local;
- socket lento foi isolado sem bloquear as outras 19 entregas;
- QA no navegador confirmou região, status, lista, barras rotuladas, ausência de
  controles de batalha e de overflow horizontal em 1280 × 720.

### Próximo passo

Revisar e integrar o PR #15 após a CI aprovada e reservar a Fase 15 sem executar
deploy público.

## 2026-07-23 — Sincronização final dos sprites com a Fase 14

### Contexto

Durante a publicação dos sprites, o PR #15 foi integrado à `main` no commit
`88420a4481ac1ea04fa3562c0d729c84ba583f34` e o PR #16 foi aberto em rascunho para
a Fase 15.

### Resultado

- branch `codex/pokemon-canonical-full` atualizada por merge, sem force-push;
- decisões renumeradas para preservar a D-019 dos telões e registrar sprites na D-020;
- históricos da Fase 14 e do catálogo preservados integralmente;
- nenhuma alteração da Fase 15 incorporada ou sobrescrita.

### Testes e verificações

- `pnpm check`: 21 arquivos de teste e 62 testes aprovados;
- formatação, lint, TypeScript e builds do servidor/cliente aprovados;
- comparação com o PR #16: dois caminhos em comum, exclusivamente
  `docs/current-state.md` e `docs/work-log.md`;
- nenhum caminho de código, pack Pokémon, schema ou teste em comum com a Fase 15.

### Próximo passo

Revisar o commit dos sprites e o PR desta branch sem fazer merge automático.

## 2026-07-23 — Coleção compacta de batalha e status das definições

### Objetivo da sessão

Ampliar a mídia para mais de um sprite por Pokémon e tornar explícito o estado de
validação das definições de cada espécie.

### Estado anterior

O PR #17 continha um sprite frontal normal por espécie e manifests com
`definitionStatus: pending`.

### Alterações realizadas

- coleção ampliada para frente normal, frente shiny, costas normal e costas shiny;
- 4.100 PNGs publicados, quatro por cada uma das 1.025 espécies;
- gerador atualizado com `--publish-battle-sprites` e alias retrocompatível;
- `definitions/status.json` criado para todas as espécies;
- `definitionStatus` alterado para `approved` após validação automatizada;
- schema, manifesto global, manifests por espécie, relatório e testes atualizados;
- D-020 e documentação de fontes atualizadas.

### Arquivos alterados

- `content/packs/pokemon-canonical/`;
- `scripts/generate-pokemon-canonical.mjs`;
- `tests/pokemon-canonical-content.test.ts`;
- `docs/current-state.md`;
- `docs/work-log.md`;
- `docs/decisions.md`;
- `docs/pokemon-content-sources.md`.

### Testes e verificações

- revisão de origem: quatro variantes disponíveis para todas as 1.025 espécies;
- auditoria integral: 4.100 sprites, 4.010.860 bytes e zero erros de hash;
- 1.025 definições com status e IDs coerentes;
- teste específico do catálogo: 1 arquivo e 4 testes aprovados;
- `pnpm check`: 21 arquivos e 62 testes aprovados;
- formatação, lint, TypeScript e builds aprovados.

### Decisões tomadas

- limitar a coleção a quatro variantes uniformes e úteis para batalha;
- não incluir sprites por jogo, arte oficial, HOME ou animações neste recorte;
- usar `approved` somente para validação automatizada das definições;
- manter sprites e licença visual como `doubtful`;
- manter a engine desacoplada dos caminhos Pokémon.

### Pendências ou riscos

- definições ainda não receberam revisão manual regra a regra;
- direitos de redistribuição dos sprites permanecem incertos;
- o PR #16 continua em trabalho paralelo com sobreposição apenas documental.

### Próxima tarefa recomendada

Definir o contrato neutro de seleção de sprite no runtime, incluindo fallback por
perspectiva e variação, sem codificar nomes Pokémon na engine.

### Instrução para a próxima IA

Ler a D-023, este registro, o README do pack e uma amostra de `status.json`; preservar
as quatro variantes, o significado restrito de `approved` e o estado visual
`doubtful`.

## 2026-07-23 — Integração da Fase 14 e reserva da Fase 15

### Contexto

O PR #15 passou na CI e foi integrado à `main` no commit
`88420a4481ac1ea04fa3562c0d729c84ba583f34`.

### Escopo reservado

- autenticação administrativa como elevação da sessão existente;
- segundo fator obrigatório e módulo desabilitado sem configuração segura;
- RBAC para suporte, conteúdo e proprietário;
- auditoria de sucesso e negação sem segredo ou PII desnecessária;
- consulta minimizada de perfil/progresso por caso de uso;
- revogação recuperável de sessões com confirmação e motivo;
- validação/publicação de manifesto declarativo original ou CC0;
- cliente administrativo separado do jogo.

### Fora do escopo

Exposição pública, gestão de infraestrutura, acesso SQL pela UI, alteração arbitrária
de inventário/progresso, deleção definitiva de conta e deploy público.

### Próximo passo

Publicar o PR rascunho da Fase 15 antes de iniciar a implementação.

## 2026-07-23 — Painel administrativo da Fase 15

### Resultado

- novo `@lt/admin-domain` define três papéis, permissões e validação de manifesto;
- `apps/admin` é cliente Vite separado e não é exposto pelo jogo;
- módulo permanece 404 sem segredo de elevação seguro configurado;
- sessão e segundo fator são conferidos em cada caso de uso;
- consulta de suporte retorna somente progresso agregado e referência HMAC;
- revogação recuperável exige motivo e `REVOKE_SESSIONS`;
- publicação exige `PUBLISH_CONTENT`, licença original/CC0 e versão sem conflito;
- auditoria persiste sucesso, negação, request ID e alvo pseudonimizado;
- comando local `admin:grant` concede o primeiro papel e registra o bootstrap.

### Testes e verificações

- 22 arquivos e 64 testes automatizados;
- matriz RBAC separa suporte, conteúdo e proprietário;
- segredo inválido é auditado e nunca aparece no registro;
- resposta de suporte não contém e-mail nem ID interno;
- referência adulterada e confirmação ausente são rejeitadas;
- manifesto com traversal, script ou ID duplicado não valida;
- versão publicada é idempotente para mesmo checksum e conflitante para outro;
- sem configuração administrativa, `/api/admin/me` retorna 404;
- QA confirmou cliente separado, área oculta, segundo fator protegido, confirmações,
  regiões acessíveis e ausência de overflow horizontal em 1280 × 720.

### Operação local inicial

Definir temporariamente `ADMIN_GRANT_ACCOUNT_ID` e `ADMIN_GRANT_ROLE`, manter
`ADMIN_STEP_UP_SECRET` fora do repositório e executar
`pnpm --filter @lt/server admin:grant`. Remover as variáveis de concessão após o uso.

### Próximo passo

Revisar e integrar o PR #16 após a CI aprovada e reservar a Fase 16 sem executar
deploy público.

## 2026-07-23 — Integração da Fase 15 e reserva da Fase 16

### Contexto

O PR #16 passou na CI e foi integrado à `main` no commit
`2b56ac734dc4ab133b3664e196e7a7c0a346fb98`.

### Escopo reservado

- headers, origem, limites, scan de segredo/dependência e revisão de ameaças;
- budgets reproduzíveis para bundles, assets e ticks já medidos;
- métricas protegidas, dashboard e alertas mínimos;
- imagens de produção e proxy TLS sem banco exposto;
- secrets por arquivo e migração controlada;
- backup, restauração isolada e procedimento de rollback;
- runbooks e workflow manual de candidato, sem deploy automático;
- consolidação da suíte e evidências operacionais.

### Baseline operacional adotada

Enquanto não existe VPS/hardware autorizado, a prova usa CI Linux e Docker local. O
alvo inicial fica em 20 presenças por arena, RPO de 24 horas, RTO de 4 horas e retenção
de sete backups diários. Esses valores devem ser revalidados antes de operação real.

### Fora do escopo

Compra/configuração de VPS, DNS real, certificados reais, segredo real, tráfego externo
e qualquer deploy público ou privado.

### Próximo passo

Publicar o PR rascunho da Fase 16 antes de iniciar a implementação.

## 2026-07-23 — Implementação e validação local da Fase 16

### Contexto

O PR rascunho #18 reservou a branch `agent/fase-16-hardening-operacional` a partir de
`2b56ac734dc4ab133b3664e196e7a7c0a346fb98`. O escopo foi executado sem VPS,
credenciais reais ou deploy.

### Alterações

- limite HTTP de 64 KiB, headers defensivos e validação de origem WebSocket;
- secrets por arquivo e métricas Prometheus protegidas por token;
- budgets de bundles/assets e scans de segredos, licenças e dependências;
- correção transitiva de `effect` para `3.20.0`, removendo o alerta de segurança;
- imagens separadas, Compose de produção e proxy TLS sem porta pública do banco;
- backup com checksum, restauração isolada, retenção e rollback confirmado;
- dashboard, alertas, runbook, modelo de ameaças e documentação de observabilidade;
- workflow manual de candidato que valida e constrói sem publicar ou implantar.

### Verificações

- `pnpm check`: aprovado, 23 arquivos e 67 testes;
- builds web/admin: aprovados;
- budgets: 1.247.996/1.400.000 bytes no jogo, 9.335/100.000 bytes no admin e
  1.022/2.000.000 bytes no maior asset;
- `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida;
- schema Prisma, JSON operacional, scans de segredos e licenças: aprovados;
- Docker e Bash indisponíveis neste computador; a CI Linux executará migração,
  restauração e builds de imagem.
- a CI #50 confirmou todos os checks e falhou somente porque o runner oferecia
  `pg_dump` 16 para PostgreSQL 17; a prova foi isolada na imagem 17.5 para eliminar
  incompatibilidade entre cliente e servidor.

### Riscos residuais

Admin sem MFA individual, VPS única, hardware-alvo não medido e infraestrutura real
não selecionada impedem exposição externa. Nenhum deploy foi realizado.

### Próximo passo

Revisar e integrar o PR #18 após a CI aprovada; depois reservar a Fase 17.

## 2026-07-23 — Integração da Fase 16 e reserva da Fase 17

### Contexto

A CI #51 aprovou qualidade, auditoria e restauração isolada. O PR #18 foi integrado à
`main` no commit `1cef026c3c6635a604fc6470e87ef94abde24b61`.

### Escopo reservado

- jornada interna integrada do cadastro ao ciclo jogável e arena;
- roteiro reproduzível de alpha privado, sem convidados nesta execução;
- telemetria mínima com privacidade e consentimento explícitos;
- matriz de severidade, triagem e verificação de defeitos;
- inventário final de licenças/procedência;
- critérios objetivos para encerrar o alpha e decidir a próxima etapa.

### Fora do escopo

Deploy, VPS, DNS, certificados, segredos reais, convite de usuários, coleta real de
telemetria e expansão de conteúdo.

### Próximo passo

Publicar o PR rascunho da Fase 17 e iniciar o ensaio integrado.

## 2026-07-23 — Implementação e ensaio interno da Fase 17

### Alterações

- telemetria agregada em memória, desabilitada por padrão, autenticada e condicionada
  a consentimento explícito;
- dez eventos allowlist sem IDs, e-mail, IP, texto livre, chat ou perfil;
- seis checkpoints da jornada ligados a testes existentes por gate executável;
- roteiro privado, matriz P0–P3, critérios de saída e inventário de conteúdo;
- ALPHA-001 removeu valores padrão de e-mail/senha da tela e ganhou gate de regressão.

### Verificações

- `pnpm check`: aprovado, 24 arquivos e 69 testes;
- `pnpm alpha:readiness`: seis checkpoints, zero P0/P1 aberto e deploy desautorizado;
- budgets, scans e builds permaneceram aprovados;
- QA visual local em 1280 × 720 confirmou título, labels, campos de credencial vazios,
  botões acessíveis e ausência de overflow horizontal.

### Privacidade e operação

Nenhum participante externo, dado real, telemetria real, servidor público ou deploy
foi usado. Os riscos residuais da Fase 16 continuam bloqueando exposição.

### Próximo passo

Revisar e integrar o PR #19 após a CI aprovada. Qualquer etapa posterior exige nova
decisão explícita.

## 2026-07-23 — Integração da Fase 17 e encerramento do roadmap

### Resultado

A CI #54 aprovou a Fase 17. O PR #19 foi integrado à `main` no commit
`375dca531e1abda09aa50a469a645a861a6485b6`. Com isso, todas as fases 0B–17 estão
concluídas e integradas.

### Estado operacional

O projeto está validado para desenvolvimento e ensaio local. Nenhum deploy, ambiente
privado real, convidado externo ou coleta real de telemetria foi executado. MFA
individual, hardware-alvo e infraestrutura externa continuam gates obrigatórios para
exposição.

### Próximo passo

Não há fase seguinte autorizada. Definir um novo ciclo e seus critérios antes de
alterar produto ou infraestrutura.

## 2026-07-23 — Reconciliação e publicação do catálogo Pokémon completo

### Objetivo da sessão

Revisar todas as atualizações remotas, preservar o trabalho das Fases 15–17 e
publicar o catálogo, as definições e a coleção temporária de sprites no PR #17.

### Estado anterior

A branch local continha 1.025 espécies, 4.100 sprites e status automatizados das
definições, mas estava baseada na Fase 14 e ainda não havia publicado o último commit.
A `main` já havia concluído as Fases 15–17 e o encerramento documental do roadmap.

### Alterações realizadas

- `main` em `6f8929fb` incorporada por merge normal, sem force-push;
- conflitos em `current-state.md`, `decisions.md` e `work-log.md` resolvidos
  preservando os dois históricos;
- decisão dos sprites renumerada para D-023, mantendo D-020 a D-022 da `main`;
- pack marcado com política temporária, runtime desabilitado e substituição
  obrigatória;
- gate de licença preservado para packs normais e aberto somente para a exceção
  nominal `pokemon-canonical`;
- branch publicada e PR #17 atualizado no SHA `b26ccd6e`.

### Testes e verificações

- `pnpm install --frozen-lockfile`: aprovado;
- `pnpm --filter @lt/server prisma:generate`: aprovado;
- teste do catálogo: 1 arquivo e 4 testes aprovados;
- auditoria integral: 1.025 espécies, 1.025 status, 4.100 sprites, 4.010.860 bytes e
  zero erros de hash;
- `pnpm check`: 25 arquivos e 73 testes aprovados;
- builds web/admin, budgets, scan de segredos, gate de licença e readiness aprovados;
- busca em `apps/` e `packages/`: nenhuma referência ao pack ou aos nomes dos PNGs.

### Decisões tomadas

- tratar os sprites como referência temporária e juridicamente `doubtful`;
- manter `runtimeEnabled: false` e `replacementRequired: true`;
- usar slots semânticos de inventário para permitir substituição sem mudar IDs ou
  regras da engine;
- manter o PR em rascunho e não executar merge na `main`.

### Pendências ou riscos

- a autorização do proprietário não substitui licença dos titulares;
- o repositório é público e uma solicitação de remoção pode exigir excluir os
  binários;
- `definitionStatus: approved` cobre validação automatizada, não revisão manual de
  todas as regras por geração;
- a CI do SHA documental final ainda precisa confirmar o estado remoto.

### Próxima tarefa recomendada

Revisar o PR #17 e decidir se a coleção temporária permanece no repositório enquanto
se pesquisa uma coleção original ou comprovadamente licenciada.

### Instrução para a próxima IA

Ler primeiro D-023, `docs/content-inventory.md`, o README e o manifesto do pack.
Confirmar o SHA e a CI do PR #17 antes de qualquer mudança; não ligar o pack ao
runtime e preservar os quatro `variantId` ao substituir os arquivos.

## 2026-07-23 — Hardening integral dos sprites temporários

### Objetivo da sessão

Corrigir os cinco pontos de revisão do PR #17 sem alterar nenhum PNG: cache privado
por revisão, auditoria integral, validação PNG real, gate permanente de runtime e data
fixa da autorização D-023.

### Estado anterior

O pack continha 1.025 espécies e 4.100 sprites publicados, mas o cache privado não
separava revisões, a verificação de hashes era amostral, a inspeção PNG lia apenas o
cabeçalho, a ausência de uso no runtime não era um gate de CI e
`ownerAuthorizedAt` derivava da data de coleta.

### Alterações realizadas

- cache movido para
  `.private/pokemon-canonical/sprite-revisions/<sprites-sha>/<espécie>/sprites/`;
- gerador impedido de reutilizar bytes de outra revisão e `--refresh` limitado à
  revisão selecionada;
- auditoria offline cobrindo manifesto, 1.025 inventários, 4.100 caminhos, hashes,
  bytes, dimensões, variantes, direitos e metadados;
- validação PNG com estrutura de chunks, CRC, decode RGBA, transparência e limites de
  dimensão/pixels;
- gate estático contra imports, URLs, loaders e caminhos do pack em `apps/` e
  `packages/`;
- autorização D-023 fixada em `2026-07-23`, separada de `retrievedAt`;
- `pngjs` incluído como dependência de desenvolvimento MIT.

### Testes e verificações

- testes focados: 4 arquivos e 33 testes aprovados;
- auditoria integral: 1.025 espécies, 4.100 hashes e 4.100 PNGs decodificados, zero
  erros;
- gate de runtime: 82 arquivos examinados e zero referência proibida;
- lint e typecheck aprovados;
- CI #30058365529 aprovada no primeiro attempt para o SHA `98566b21`;
- casos negativos cobrem cache cruzado, arquivo ausente/extra, hash, bytes, dimensão,
  variante, data D-023, assinatura, truncamento, CRC, stream comprimido, APNG e
  referência de runtime.

### Decisões tomadas

- preservar nomes e caminhos públicos dos PNGs para manter a substituição futura
  simples;
- tratar `sprites-sha` como parte obrigatória da identidade do cache;
- manter `doubtful`, `runtimeEnabled: false` e `replacementRequired: true`;
- não transformar a autorização do proprietário em licença ou aprovação jurídica.

### Pendências ou riscos

- os direitos dos 4.100 sprites continuam duvidosos e a coleção precisa ser
  substituída por material original ou comprovadamente licenciável;
- o PR #17 permanece em rascunho e aguarda revisão do proprietário;
- nenhum deploy ou merge na `main` foi autorizado.

### Próxima tarefa recomendada

Revisar o resultado do hardening no PR #17 e selecionar uma coleção piloto original
ou com licença comprovada para substituir os quatro slots de uma única espécie.

### Instrução para a próxima IA

Ler D-023, o README do pack, `scripts/lib/audit-pokemon-canonical-assets.mjs` e
`scripts/lib/runtime-content-boundary.mjs`; confirmar SHA e CI do PR #17 antes de
qualquer alteração e nunca habilitar o pack temporário no runtime.

## 2026-07-23 — Auditoria completa de assets e dados Pokémon

### Objetivo da sessão

Auditar integralmente o catálogo canônico e as fontes candidatas de sprites, áudio e
animações sem baixar nova mídia, habilitar o pack no runtime ou alterar o estado da
`main`.

### Estado anterior

A branch `codex/pokemon-canonical-full` no commit `9192f727` continha 1.025 espécies,
4.100 PNGs temporários e definições aprovadas por validação automatizada. O PR #17
permanecia em rascunho; sprites, formas alternativas, cries e animações ainda não
possuíam uma auditoria transversal por entidade e arquivo.

### Alterações realizadas

- criada a branch isolada `codex/pokemon-assets-audit` sobre o SHA `9192f727`;
- registradas revisões imutáveis das fontes de dados, sprites, cries e Showdown;
- gerados 12 artefatos em `docs/assets/`, incluindo 60.065 candidatos visuais e 2.000
  candidatos de áudio;
- auditadas 1.025 espécies, 1.351 registros Pokémon, 1.579 registros de forma, 937
  golpes e 373 habilidades;
- classificados 51.081 candidatos visuais como `doubtful` e 8.984 como `pending`;
- proposta uma matriz de compatibilidade e um schema de IDs lógicos substituíveis;
- documentadas as lacunas de formas, textos, flags de golpes e validação manual;
- adicionados seis testes automatizados para contratos, contagens, revisões e bloqueio
  de runtime;
- fortalecida a inspeção PNG com validação zlib explícita dos chunks IDAT;
- corrigido o broadcast de mundo para compartilhar `serverTime` entre snapshots do
  mesmo passo ou transição;
- reconciliados `current-state.md`, `content-inventory.md` e
  `pokemon-content-sources.md` com o novo escopo.

### Testes e verificações

- `pnpm content:pokemon:assets-audit`: 1.025 espécies, 1.351 Pokémon, 1.579 formas,
  60.065 sprites e 2.000 áudios inventariados;
- teste focado da auditoria: 1 arquivo e 6 testes aprovados;
- testes focados de PNG e sala: 2 arquivos e 8 testes aprovados;
- `pnpm check`: 30 arquivos e 112 testes aprovados;
- formatação, lint, TypeScript, builds web/admin e budgets aprovados;
- scan de segredos e gate de licenças aprovados;
- gate de runtime: 82 arquivos examinados, zero referência proibida;
- auditoria do pack: 4.100 hashes e PNGs verificados, 4.010.860 bytes, zero erros;
- readiness: seis checkpoints, zero P0/P1 e nenhum deploy.

### Decisões tomadas

- inventário de disponibilidade não equivale a aprovação jurídica ou técnica;
- mídias oficiais ou comunitárias sem autorização demonstrada continuam bloqueadas;
- `definitionStatus: approved` significa somente validação automatizada;
- IDs lógicos e manifests devem permitir substituir os bytes sem acoplar a engine;
- nenhuma família atual oferece cobertura animada completa para as 1.351 entidades;
- o próximo passo deve ser um piloto único após comprovação de direitos.

### Pendências ou riscos

- 4.100 PNGs temporários continuam públicos, `doubtful` e fora do runtime;
- 326 registros alternativos não possuem definição independente;
- 111 golpes e 62 habilidades não possuem descrição inglesa na fonte fixada;
- nenhum candidato de áudio teve duração, canais, sample rate, silêncio ou SHA-256
  medidos porque os binários não foram baixados;
- nenhum candidato adicional foi aprovado, importado ou habilitado;
- revisão independente de cada regra canônica e análise jurídica permanecem pendentes;
- branch publicada e PR draft #21 aberto contra
  `codex/pokemon-canonical-full`;
- CI `quality` aprovada no run `30060438795` para o commit de continuidade
  `af8165e3`.

### Próxima tarefa recomendada

Escolher uma única família visual piloto e comprovar autoria, licença, créditos e
redistribuição antes de importar qualquer arquivo.

### Instrução para a próxima IA

Ler primeiro `docs/assets/pokemon-assets-audit.md`,
`docs/assets/pokemon-assets-roadmap.md`, `docs/assets/source-register.json`, D-023 e o
README do pack. Confirmar o SHA e a CI do PR desta auditoria; não baixar nem ativar
mídia enquanto o proprietário não aprovar uma fonte específica com direitos
verificáveis.
