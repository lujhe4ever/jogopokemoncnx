# Registro de decisões

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-23 |
| Implementação existente | Nenhuma |
| Referência de IDs técnicos | [`../architecture.md`](../architecture.md) |

## 1. Regras

Uma recomendação não é uma decisão aceita. Somente aprovação explícita do proprietário
altera uma decisão técnica de **Proposta** para **Aceita**.

A autorização para criar a documentação da Fase 0B não aceita automaticamente D-001 a
D-010 e não autoriza implementação.

Quando uma decisão precisar de prova técnica que só existe em fase posterior, o
proprietário pode autorizar um experimento limitado sem aceitar a decisão. O resultado
do experimento volta para este registro antes de qualquer adoção mais ampla.

Status permitidos:

- **Proposta**;
- **Aceita**;
- **Rejeitada**;
- **Substituída**;
- **Obsoleta**.

Ao aceitar ou mudar uma decisão:

1. registrar a evidência/data da aprovação;
2. atualizar este arquivo;
3. atualizar `architecture.md` quando a baseline for afetada;
4. criar ADR para escolhas difíceis de reverter;
5. atualizar roadmap e estado atual;
6. implementar somente após autorização da fase dependente.

## 2. Índice

| ID | Tema canônico | Status |
| --- | --- | --- |
| COL-001 | GitHub como fonte compartilhada da verdade | Aceita |
| COL-002 | Trabalho por gates de autorização e handoff | Aceita |
| D-001 | Monorepo TypeScript com `pnpm` workspaces | Aceita |
| D-002 | Monólito modular Fastify em uma VPS | Aceita |
| D-003 | Servidor autoritativo e simulação de passo fixo | Aceita |
| D-004 | Phaser restrito ao adaptador cliente | Aceita |
| D-005 | Prisma restrito à infraestrutura | Aceita |
| D-006 | Protocolo runtime validado e versionado | Aceita |
| D-007 | Packs de conteúdo e catálogo de assets substituíveis | Proposta |
| D-008 | Sessão opaca e ticket WebSocket efêmero | Aceita |
| D-009 | Redis, broker e microserviços adiados até haver gatilho | Proposta |
| D-010 | Conteúdo somente original ou comprovadamente licenciado | Proposta |

## 3. Registro cronológico

### COL-001 — GitHub como fonte compartilhada da verdade

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** duas pessoas e duas instâncias de IA trabalharão alternadamente em
  máquinas diferentes. Memória de conversa ou arquivo local não é contexto
  compartilhável.
- **Alternativas consideradas:**
  - depender do histórico das conversas;
  - manter notas locais por participante;
  - manter estado, decisões e handoff no repositório GitHub.
- **Decisão tomada:** GitHub e os documentos versionados são a fonte oficial. Cada IA
  relê a branch principal, `AGENTS.md`, `architecture.md` e `docs/` antes de trabalhar.
- **Justificativa:** torna o trabalho reproduzível, auditável e independente de
  sessão/máquina.
- **Consequências:** documentação de continuidade é parte da definição de pronto;
  contexto não publicado não pode orientar outra tarefa.
- **Impacto técnico:** toda entrega relevante atualiza `current-state.md` e
  `work-log.md`; branches e commits precisam de escopo claro.
- **Possibilidade de revisão futura:** o repositório pode mudar de provedor, mas deve
  continuar existindo uma fonte versionada única e acessível às duas partes.
- **Evidência de aprovação:** prompt mestre fornecido pelo proprietário em
  2026-07-23.

### COL-002 — Trabalho por gates de autorização e handoff

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** o projeto durará meses e mudanças apressadas ou implícitas podem gerar
  escopo, dívida e conflitos entre as duas IAs.
- **Alternativas consideradas:**
  - execução contínua até concluir várias fases;
  - autorização ampla por área;
  - explicar, autorizar, implementar, verificar e pausar por tarefa.
- **Decisão tomada:** cada tarefa usa gates explícitos; merge e próxima fase não são
  automáticos.
- **Justificativa:** preserva revisão humana e limita divergência.
- **Consequências:** o ritmo privilegia mudanças pequenas e verificáveis; próxima
  tarefa é sempre recomendada, nunca iniciada.
- **Impacto técnico:** `AGENTS.md` define procedimento obrigatório e relatório de
  continuidade.
- **Possibilidade de revisão futura:** o usuário pode estabelecer uma política mais
  ampla para ações rotineiras, desde que documentada.
- **Evidência de aprovação:** instruções iniciais e prompt mestre de 2026-07-23.

### D-001 — Monorepo TypeScript com `pnpm` workspaces

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** cliente, servidor, contratos e engine compartilham linguagem, mas
  precisam de limites claros.
- **Alternativas consideradas:**
  - repositórios separados;
  - monorepo com npm/yarn;
  - monorepo com `pnpm`;
  - `pnpm` com ou sem Turborepo.
- **Decisão proposta:** usar `pnpm` workspaces; avaliar Turborepo no scaffold mínimo.
- **Justificativa:** lockfile único, instalação eficiente e testes integrados sem
  perder fronteiras de pacote.
- **Consequências:** CI e releases dependem do grafo do monorepo; regras de importação
  são obrigatórias.
- **Impacto técnico:** estrutura em `apps/` e `packages/`, comandos centralizados e
  versões fixadas.
- **Possibilidade de revisão futura:** revisar se deploy, ownership ou escala exigirem
  ciclos de release independentes.
- **Validação documental para autorizar experimento:** confirmar monorepo, `pnpm` e
  limites mínimos do workspace; Turborepo pode permanecer fora do primeiro scaffold.
- **Validação técnica planejada:** durante a Fase 1, instalar, testar e fazer build
  limpo em Windows, Linux/CI e contêiner; o resultado subsidia aceitação ou revisão.
- **Evidência de aprovação:** nenhuma.

### D-002 — Monólito modular Fastify em uma VPS

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** a primeira meta é uma arena de 20 jogadores e operação privada com
  baixa complexidade.
- **Alternativas consideradas:**
  - NestJS;
  - Fastify com módulos/portas;
  - microserviços desde o início.
- **Decisão proposta:** Node + Fastify em um monólito modular, um processo e uma VPS
  inicialmente.
- **Justificativa:** reduz custo operacional e acoplamento a decorators/framework,
  preservando desempenho e composição explícita.
- **Consequências:** disciplina modular precisa ser garantida por testes; a VPS é ponto
  único de falha aceito inicialmente.
- **Impacto técnico:** um composition root, módulos internos e adaptadores; nenhuma
  comunicação distribuída na primeira topologia.
- **Possibilidade de revisão futura:** reavaliar se complexidade de composição,
  isolamento de falha ou escala demonstrar necessidade.
- **Validação documental para autorizar experimento:** escolher Fastify ou Nest e
  aceitar conscientemente a topologia inicial de uma VPS para o escopo do spike.
- **Validação técnica planejada:** durante a Fase 2, executar spike mínimo de HTTP/WS,
  verificar a organização dos módulos e medir custo operacional; o resultado subsidia
  aceitação ou revisão.
- **Evidência de aprovação:** nenhuma.

### D-003 — Servidor autoritativo e simulação de passo fixo

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** movimento e ações multiplayer não podem confiar no cliente.
- **Alternativas consideradas:**
  - cliente autoritativo;
  - servidor validar apenas resultados;
  - servidor processar intenções em passo fixo.
- **Decisão proposta:** cliente envia intenções; servidor valida e decide posição,
  batalha, captura, inventário e progresso.
- **Justificativa:** protege integridade e permite reconciliação/replay.
- **Consequências:** exige previsão do avatar local, interpolação remota, sequência e
  idempotência.
- **Impacto técnico:** kernel puro compartilhável, tick configurável e ausência de I/O
  dentro do tick.
- **Possibilidade de revisão futura:** frequências e técnicas de previsão mudam por
  benchmark; autoridade sobre estado crítico permanece.
- **Validação antes de aceitar:** testes contra cliente adulterado, replay e cenário de
  latência/reconexão.
- **Evidência de aprovação:** nenhuma.

### D-004 — Phaser restrito ao adaptador cliente

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** Phaser oferece runtime 2D, mas o servidor e regras não executam DOM ou
  renderer.
- **Alternativas consideradas:**
  - regras dentro de cenas Phaser;
  - engine inteira própria incluindo renderer;
  - engine/domínio próprios com Phaser como adaptador.
- **Decisão proposta:** `engine-core` define loop, eventos e portas; Phaser implementa
  render, input, áudio e carregamento.
- **Justificativa:** mantém regras testáveis/headless sem reinventar renderização.
- **Consequências:** cena é orquestradora; física visual não decide posição válida.
- **Impacto técnico:** dependência unidirecional `engine-phaser` → `engine-core`.
- **Possibilidade de revisão futura:** outro renderer pode substituir Phaser por novo
  adaptador.
- **Validação antes de aceitar:** domínio executa em Node sem Phaser/DOM e a casa
  renderiza pelo adaptador.
- **Evidência de aprovação:** nenhuma.

### D-005 — Prisma restrito à infraestrutura

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** Prisma facilita banco/migrações, mas seus tipos podem acoplar todo o
  sistema ao schema.
- **Alternativas consideradas:**
  - Prisma usado diretamente pelos módulos;
  - SQL/query builder;
  - interfaces internas com adaptadores Prisma.
- **Decisão proposta:** interfaces de repositório pertencem à camada interna; Prisma
  implementa essas portas no servidor.
- **Justificativa:** permite testar domínio sem banco e evoluir persistência nas bordas.
- **Consequências:** requer mapeadores explícitos e ownership lógico das tabelas.
- **Impacto técnico:** nenhum tipo Prisma em domínio, protocolo ou cliente.
- **Possibilidade de revisão futura:** ORM pode mudar sem mudar casos de uso, desde que
  portas permaneçam adequadas.
- **Validação antes de aceitar:** testes de importação e integração com PostgreSQL real.
- **Evidência de aprovação:** nenhuma.

### D-006 — Protocolo runtime validado e versionado

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** tipos TypeScript desaparecem em runtime e clientes/servidores podem
  operar versões diferentes.
- **Alternativas consideradas:**
  - interfaces apenas;
  - mensagens ad hoc;
  - schemas runtime, envelope e política de compatibilidade.
- **Decisão proposta:** HTTP e WebSocket usam schemas compartilhados, envelope
  versionado, erros estáveis e sequência.
- **Justificativa:** rejeita payload inválido e permite evolução controlada.
- **Consequências:** breaking changes exigem versão/migração; compatibilidade tem custo
  explícito.
- **Impacto técnico:** pacote `protocol`, validação nas bordas, testes de contrato e
  reconexão.
- **Possibilidade de revisão futura:** biblioteca/formato podem mudar; validação e
  versionamento permanecem.
- **Validação antes de aceitar:** matriz de versão, deduplicação, backpressure e
  retomada testados.
- **Evidência de aprovação:** nenhuma.

### D-007 — Packs de conteúdo e catálogo de assets substituíveis

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** engine não pode depender de criaturas, mapas ou assets específicos.
- **Alternativas consideradas:**
  - conteúdo embutido no código;
  - paths diretos de arquivos;
  - packs declarativos versionados e catálogo semântico.
- **Decisão proposta:** `ContentPack`/`AssetCatalog` com IDs namespaced, schema, versão,
  checksum, dependências e licença.
- **Justificativa:** separa produto/arte de engine e protege evolução de saves.
- **Consequências:** alterar ID persistido exige migração; pack inválido não carrega.
- **Impacto técnico:** cliente e servidor confirmam versão/hash; nenhum JavaScript
  arbitrário no conteúdo.
- **Possibilidade de revisão futura:** formato do pack e pipeline de autoria podem
  evoluir com compatibilidade.
- **Validação antes de aceitar:** substituir integralmente o pack placeholder sem mudar
  engine/domínio.
- **Evidência de aprovação:** Fase 5 implementa manifests originais versionados por
  zona; snapshots informam somente o `packId` autorizado e nenhum asset de zona
  futura entra no boot inicial.

### D-008 — Sessão opaca e ticket WebSocket efêmero

- **Data:** 2026-07-23
- **Status:** Aceita
- **Contexto:** login e WebSocket precisam compartilhar identidade sem expor
  credencial duradoura.
- **Alternativas consideradas:**
  - token longo em `localStorage`/query string;
  - JWT sem revogação;
  - sessão opaca em cookie e ticket descartável para WebSocket.
- **Decisão proposta:** sessão revogável por cookie seguro; upgrade usa ticket curto e
  de uso único obtido via HTTPS.
- **Justificativa:** reduz exposição e permite revogação/rotação.
- **Consequências:** servidor mantém sessões/tickets e valida origem.
- **Impacto técnico:** endpoints de sessão/ticket, hashes no banco, rate limit e
  auditoria.
- **Possibilidade de revisão futura:** mecanismo pode mudar após threat model sem
  transmitir token duradouro por URL.
- **Validação antes de aceitar:** reuso, expiração, origem inválida e revogação são
  testados.
- **Evidência de aprovação:** nenhuma.

### D-009 — Redis, broker e microserviços adiados até haver gatilho

- **Data:** 2026-07-23
- **Status:** Proposta
- **Contexto:** componentes distribuídos elevam operação antes de existir carga real.
- **Alternativas consideradas:**
  - Redis/broker/microserviços imediatos;
  - monólito sem portas de evolução;
  - monólito modular com gatilhos mensuráveis.
- **Decisão proposta:** manter salas em memória e PostgreSQL durável; introduzir
  distribuição somente com necessidade comprovada.
- **Justificativa:** otimiza simplicidade e feedback inicial.
- **Consequências:** queda do processo encerra estado transitório; checkpoints críticos
  precisam ser seguros.
- **Impacto técnico:** `RoomRegistry` e pub/sub são portas; nenhuma dependência de Redis
  no domínio.
- **Possibilidade de revisão futura:** múltiplos processos, fan-out, jobs duráveis,
  saturação ou isolamento de falha acionam ADR.
- **Validação antes de aceitar:** benchmark e métricas definem limites da VPS/processo.
- **Evidência de aprovação:** nenhuma.

### D-010 — Conteúdo somente original ou comprovadamente licenciado

- **Data:** 2026-07-23
- **Status:** Proposta
- **Contexto:** inspiração em gênero conhecido cria risco de copyright, marca e
  identidade visual; uso privado não elimina automaticamente esse risco.
- **Alternativas consideradas:**
  - usar conteúdo conhecido temporariamente;
  - manter conteúdo sem origem em repositório privado;
  - usar apenas original, CC0 ou licenciado.
- **Decisão proposta:** publicar somente conteúdo com origem e licença verificáveis;
  material incerto fica em quarentena fora do repositório.
- **Justificativa:** protege a arquitetura e facilita futura substituição/distribuição.
- **Consequências:** placeholders também precisam de licença; inventário e avisos de
  terceiros são obrigatórios quando aplicáveis.
- **Impacto técnico:** metadados de licença em packs e gate de CI futuro.
- **Possibilidade de revisão futura:** política pode ficar mais restritiva; exceção
  requer autorização verificável e análise própria.
- **Validação antes de aceitar:** auditoria de todos os assets/dependências e teste de
  substituição.
- **Evidência de aprovação:** nenhuma.

### D-011 — Inventário limitado e recompensas idempotentes

- **Data:** 2026-07-23
- **Status:** Aceita para o primeiro ciclo jogável
- **Contexto:** pickups e baús não podem duplicar recompensa em retry ou exceder
  invariantes persistentes.
- **Alternativas consideradas:** inventário ilimitado; controle apenas no cliente;
  slots e stacks validados na mesma transação da coleta.
- **Decisão:** usar 20 slots distintos e stacks de até 99 unidades nesta etapa;
  `InteractionClaim` e `InventoryStack` são gravados atomicamente em isolamento
  serializável, com unicidade por conta/interação.
- **Justificativa:** fornece limites verificáveis e impede duplicação concorrente sem
  acoplar conteúdo à engine.
- **Consequências:** descarte e expansão de capacidade permanecem para decisão futura;
  mudança de limites exige migração e revisão de design.
- **Evidência de aprovação:** testes da Fase 6 cobrem distância, retry, capacidade de
  slots e limite de stack; a migração adiciona restrições únicas e `CHECK`.

## 4. Próximas decisões a revisar

A Fase 1 depende primeiro de D-001 e D-002. A revisão deve:

1. confirmar `pnpm`;
2. decidir se Turborepo entra imediatamente;
3. confirmar Fastify em vez de Nest;
4. fixar versão LTS do Node após verificar suporte;
5. definir comandos e gates mínimos.

As demais decisões devem ser aceitas somente na fase que realmente as consome.
