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
