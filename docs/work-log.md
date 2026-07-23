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
