# AGENTS.md

## Finalidade e escopo

Este arquivo define como pessoas e IAs devem trabalhar neste repositório. Ele se
aplica a toda a árvore, salvo quando um `AGENTS.md` mais próximo de um arquivo
estabelecer uma regra local compatível.

O GitHub é a fonte oficial e compartilhada da verdade. Nenhuma IA pode depender de
memória de conversa, arquivos locais não publicados ou contexto exclusivo de uma
sessão.

Em caso de conflito, observar esta ordem:

1. instrução explícita mais recente do usuário para a tarefa atual;
2. requisitos confirmados em `architecture.md`;
3. ADRs aceitos;
4. este `AGENTS.md`;
5. documentação operacional em `docs/`;
6. código e configurações vigentes.

Se código e documentação divergirem, não escolher silenciosamente um deles. Registrar
a divergência, explicar o impacto e pedir decisão quando ela mudar requisitos ou
arquitetura.

## Objetivo do projeto

Construir, para estudo e uso privado, um RPG 2D online para navegador com exploração,
captura e treinamento de criaturas, NPCs, itens, missões, batalhas por turno e uma
arena social para até 20 jogadores inicialmente.

A engine e as regras devem ser genéricas e desacopladas de marcas, personagens,
sprites, áudio, mapas e outras propriedades intelectuais externas. Conteúdo deve ser
substituível sem reescrever a engine.

## Regra fundamental de trabalho

O projeto opera por gates de autorização:

1. explicar a proposta;
2. declarar escopo, exclusões, riscos e critérios de aceite;
3. aguardar autorização explícita;
4. implementar somente o escopo autorizado;
5. verificar e documentar resultados reais;
6. apresentar o resultado e parar para revisão.

Uma autorização para uma tarefa não autoriza a fase seguinte. Não criar scaffold,
instalar dependências, migrar banco, publicar deploy, fazer merge ou iniciar outra
funcionalidade por iniciativa própria.

## Estado da stack

As escolhas abaixo são a baseline **proposta** em `architecture.md`. Elas não devem ser
tratadas como instaladas ou aceitas enquanto a documentação e a fase correspondente
não forem aprovadas.

| Área | Direção proposta |
| --- | --- |
| Linguagem | TypeScript estrito |
| Monorepo | `pnpm` workspaces; Turborepo sob revisão |
| Frontend | Phaser 3 + Vite; HTML/CSS para interface quando apropriado |
| Backend | Node.js + Fastify |
| Tempo real | WebSocket com contrato validado e versionado |
| Dados | PostgreSQL + Prisma restrito à infraestrutura |
| Infraestrutura | Docker Compose e VPS Linux inicialmente |
| Qualidade | ESLint, Prettier, testes, Husky e GitHub Actions |

Versões concretas serão fixadas somente na Fase 1, após verificação do ambiente e
aprovação.

## Requisitos arquiteturais confirmados

- `architecture.md` é a referência normativa viva.
- `docs/architecture.md` descreve a visão operacional corrente e não substitui a
  baseline raiz.
- Engine, gameplay, batalha, mundo, rede, banco e administração permanecem módulos
  separados, com responsabilidades explícitas.
- Engine e regras não dependem de personagens, marcas, nomes ou caminhos de assets
  específicos.
- Conteúdo é substituível e orientado a dados, com IDs neutros e estáveis.
- O servidor valida e decide ações multiplayer relevantes; o cliente não concede a si
  próprio movimento final, resultado de batalha, captura, inventário, recompensa ou
  progresso.

## Guardrails associados a decisões ainda propostas

Os itens abaixo traduzem D-001 a D-010 em critérios de avaliação. Eles orientam
propostas e revisões, mas **não autorizam scaffold nem se tornam obrigatórios para a
implementação enquanto a decisão correspondente não for aceita explicitamente**:

- domínio e simulação em TypeScript puro, sem Phaser, DOM, Fastify, WebSocket, Prisma
  ou APIs específicas de Node (D-003 e D-004);
- dependências apontando para dentro, com adaptadores dependendo de portas e domínio
  (D-002, D-004 e D-005);
- passo fixo, previsão, interpolação e reconciliação como estratégia inicial para a
  autoridade do servidor (D-003);
- modelos de domínio, protocolo e persistência distintos e mapeados nas bordas
  (D-005 e D-006);
- contratos HTTP, WebSocket, conteúdo e saves explícitos, validados em runtime e
  versionados (D-006 e D-007);
- eventos com owner e escopo, sem event bus global não justificado (D-002);
- monólito modular antes de microserviços enquanto nenhum gatilho de escala justificar
  a divisão (D-002 e D-009);
- abstrações, pacotes, serviços e otimizações introduzidos somente com consumidor ou
  medição (D-002, D-004 e D-009);
- separação explícita entre estado transitório de salas e progresso durável (D-003 e
  D-005).

Uma tarefa dependente deve citar os IDs relevantes, obter decisão do proprietário e
atualizar `docs/decisions.md` antes de implementar a escolha.

## Estrutura de pastas proposta

Esta árvore é um destino arquitetural, não autorização para criar diretórios vazios:

```text
/
├─ apps/
│  ├─ web/
│  ├─ server/
│  └─ admin/
├─ packages/
│  ├─ engine-core/
│  ├─ engine-phaser/
│  ├─ game-simulation/
│  ├─ battle-domain/
│  ├─ protocol/
│  ├─ content-contracts/
│  ├─ config/
│  └─ testing/
├─ content/
│  └─ packs/
├─ infra/
├─ docs/
│  └─ adr/
├─ AGENTS.md
└─ architecture.md
```

Cada pasta ou pacote nasce junto de um caso de uso real e de sua validação.

## Convenções de código

Estas convenções passam a valer quando houver código:

- identificadores, arquivos de código e APIs em inglês;
- documentação e comunicação do projeto em português do Brasil;
- TypeScript em modo estrito;
- evitar `any`; exceções precisam ser localizadas e justificadas;
- usar exports nomeados por padrão;
- dependências entram por construtor/factory/porta, sem singletons ocultos;
- acesso a ambiente fica centralizado no módulo de configuração;
- tipos gerados pelo Prisma não escapam dos adaptadores de persistência;
- cenas Phaser orquestram adaptadores; não concentram regra de negócio;
- testes unitários ficam próximos do código ou seguem a convenção definida na Fase 1;
- não criar barrel files que escondam ciclos ou atravessem limites de módulo;
- comentários explicam decisões e restrições, não repetem o código;
- TODOs precisam indicar contexto e condição de remoção.

Ferramentas de formatação e lint serão a autoridade quando configuradas. Não fazer
reformatação ampla junto de uma funcionalidade não relacionada.

## Segurança e propriedade intelectual

- Nunca incluir senha, token, chave, cookie, certificado ou segredo no repositório.
- Segredos ficam em variáveis de ambiente ou mecanismo externo aprovado.
- `.env.example`, quando existir, conterá apenas nomes e valores seguros de exemplo.
- Não registrar senha, token, segredo ou PII em logs.
- Validar tamanho, formato, autorização e frequência de todo input externo.
- Não confiar no cliente para inventário, batalha, recompensa, captura ou progresso.
- Administração exige RBAC, auditoria e proteção adicional antes de exposição externa.
- Não copiar código proprietário.
- Não adicionar nomes, logotipos, sprites, músicas, mapas, textos ou dados de franquias
  sem licença ou autorização verificável.
- Uso privado ou educacional não elimina automaticamente risco de propriedade
  intelectual.
- Assets sem origem comprovada ficam fora do repositório.
- Toda dependência ou asset de terceiros deverá ter origem e licença registradas.

## Comandos do projeto

Não existe aplicação ou toolchain na Fase 0B. Não inventar comandos nem declarar
verificações inexistentes.

| Finalidade | Comando atual |
| --- | --- |
| Instalação | `pnpm install --frozen-lockfile` |
| Desenvolvimento | `docker compose up -d postgres`, `pnpm --filter @lt/server db:migrate`, `pnpm dev` |
| Formatação | `pnpm format` / `pnpm format:check` |
| Lint | `pnpm lint` |
| Verificação de tipos | `pnpm typecheck` |
| Testes unitários e de integração | `pnpm test` |
| Gate da jornada alpha | `pnpm alpha:readiness` |
| Auditoria integral dos sprites Pokémon | `pnpm content:pokemon:audit` |
| Gate de isolamento de conteúdo temporário | `pnpm security:runtime-content` |
| Testes E2E no navegador | roteiro assistido em `docs/alpha-test-plan.md` |
| Build de servidor, jogo e admin | `pnpm build` |
| Docker | `docker compose up -d postgres` / `docker compose down` |
| Migrações | `pnpm --filter @lt/server db:migrate` |
| Candidato operacional | workflow manual `Build release candidate (no deploy)` |

Quando a Fase 1 definir comandos, atualizar esta tabela no mesmo PR que os introduzir.

## Procedimento obrigatório antes de iniciar uma tarefa

1. Sincronizar a branch principal e confirmar a base mais recente.
2. Inspecionar branch, worktree, diff, histórico recente, branches e PRs relacionados.
3. Ler integralmente, nesta ordem:
   - o `AGENTS.md` aplicável;
   - `architecture.md`;
   - todos os arquivos existentes em `docs/`;
   - ADRs relacionados, quando existirem.
4. Inventariar todos os arquivos versionados e ler integralmente o restante do
   repositório antes de alterar código, incluindo código-fonte, configuração,
   contratos, schemas, migrações e testes. Se o volume tornar essa leitura inviável
   dentro da sessão, parar e pedir autorização para um recorte explícito; não presumir
   que documentação substitui inspeção.
5. Conferir `docs/current-state.md`, a entrada mais recente de `docs/work-log.md` e o
   status relevante de `docs/roadmap.md`.
6. Identificar mudanças recentes da outra pessoa ou IA e entender sua finalidade.
7. Confirmar que apenas uma IA será escritora da branch.
8. Executar a baseline de verificações disponível antes da mudança, quando existir.
9. Apresentar:
   - objetivo;
   - escopo autorizado e itens fora do escopo;
   - arquivos ou módulos afetados;
   - alternativas e decisões relevantes;
   - riscos;
   - critérios de aceite;
   - validações previstas.
10. Aguardar aprovação, exceto quando a mensagem atual já autorizar inequivocamente esse
    mesmo escopo previamente explicado.

Parar e relatar se houver alteração inesperada, conflito, possível segredo, conteúdo
sem licença, ação destrutiva ou decisão que mude o escopo.

## Procedimento durante a tarefa

- Manter uma única IA como escritora da branch.
- Limitar alterações ao escopo aprovado.
- Não sobrescrever trabalho alheio.
- Não misturar refatoração ampla com funcionalidade nova.
- Não executar I/O de banco ou rede dentro do tick da simulação.
- Não mudar arquitetura aceita sem consultar `docs/decisions.md` e o ADR relacionado.
- Decisão difícil de reverter exige atualização de decisão ou novo ADR.
- Se o código contradisser a documentação, interromper antes de ampliar a divergência.
- Não executar merge, deploy, migração de produção, force-push ou alteração de
  proteção do repositório sem autorização específica.

## Procedimento obrigatório ao finalizar uma tarefa ou sessão

Este procedimento também se aplica quando a sessão terminar bloqueada, incompleta,
somente com revisão ou sem código. O registro deve distinguir trabalho concluído,
trabalho apenas preparado e trabalho não iniciado.

1. Revisar o diff completo e remover alterações acidentais.
2. Executar todas as verificações reais aplicáveis e registrar resultados.
3. Não declarar lint, teste ou build aprovado quando o comando não existir.
4. Atualizar:
   - `docs/current-state.md`;
   - `docs/work-log.md` com uma nova entrada append-only;
   - `docs/roadmap.md` quando o status mudar;
   - `architecture.md`, `docs/architecture.md` ou `docs/decisions.md` quando aplicável.
5. Confirmar que documentação, código, migrações e contratos permanecem coerentes.
6. Fazer commits pequenos e descritivos, se a publicação fizer parte da autorização.
7. Informar branch, base, commits, push, PR e mudanças locais ainda não publicadas.
8. Apresentar o relatório de continuidade abaixo.
9. Parar. A próxima tarefa é proposta, nunca iniciada automaticamente.

## Git e GitHub entre duas IAs

### Papéis

- **IA implementadora:** única escritora da branch; executa o escopo autorizado e
  prepara a continuidade.
- **IA revisora:** trabalha inicialmente em modo somente leitura sobre branch, commit
  ou PR identificados e registra achados acionáveis.
- **Usuário:** define escopo, aceita riscos, autoriza correções, merge e deploy.

As duas IAs não editam simultaneamente a mesma branch ou worktree. Branches de
implementação são serializadas por padrão para evitar dois snapshots concorrentes de
`current-state.md`.

### Reserva visível da tarefa

Antes de alterar código, a escritora registra uma reserva visível no GitHub por issue
ou draft PR, contendo:

- objetivo e escopo;
- branch e SHA-base;
- pessoa/IA escritora;
- estado `reservada`, `em execução`, `em revisão`, `bloqueada` ou `concluída`;
- links para tarefa ou decisão relacionada.

Para uma tarefa exclusivamente documental já autorizada, a própria branch publicada
e identificada em `docs/current-state.md` pode cumprir a reserva. Se não houver como
publicar a reserva, parar antes de código e pedir coordenação.

### Fluxo

1. Atualizar `main` com fast-forward e verificar o histórico.
2. Criar uma branch exclusiva e coesa.
3. Implementar e validar sem incorporar mudanças não relacionadas.
4. Atualizar a documentação de continuidade.
5. Criar commits pequenos com mensagens descritivas.
6. Publicar a branch e abrir PR somente quando isso estiver autorizado.
7. A IA revisora analisa a revisão exata, sempre por SHA imutável ou PR fixado nesse
   SHA.
8. Correções fora do escopo original aguardam aprovação.
9. Antes do merge, atualizar a branch com `main`, preservar todas as entradas
   append-only de `docs/work-log.md` e regenerar `docs/current-state.md` a partir do
   estado combinado.
10. Merge e deploy são decisões do usuário.

### Branches e commits

Prefixos:

- `docs/estrutura-inicial`;
- `feat/movimentacao-jogador`;
- `feat/sistema-batalha`;
- `fix/correcao-colisao`;
- `refactor/network-events`;
- `infra/<descricao>`.

Commits seguem intenção clara, por exemplo:

- `docs: establish collaboration handoff`;
- `feat(world): add authoritative movement`;
- `fix(battle): reject duplicated command`.

Não usar mensagens como `update`, `changes` ou `fix stuff`. Não fazer force-push,
reset destrutivo ou reescrita de histórico sem autorização.

## Política de documentação

| Arquivo | Responsabilidade |
| --- | --- |
| `architecture.md` | Baseline normativa, limites e decisões sistêmicas |
| `docs/architecture.md` | Topologia e fluxos operacionais correntes |
| `docs/roadmap.md` | Fases, status, gates, critérios e riscos |
| `docs/game-design.md` | Visão funcional e regras de produto |
| `docs/decisions.md` | Registro cronológico de decisões e propostas |
| `docs/current-state.md` | Fotografia factual substituível do estado presente |
| `docs/work-log.md` | Histórico append-only de sessões |
| `docs/adr/` | Decisões difíceis de reverter, quando existirem |

Entradas antigas de `docs/work-log.md` não são reescritas; uma correção vira nova
entrada de errata. Não registrar raciocínio interno da IA, apenas contexto, decisões,
ações, verificações e resultados úteis.

## Definição de pronto

Uma tarefa só está pronta quando:

- o escopo autorizado foi atendido sem mudanças laterais;
- critérios de aceite possuem evidência;
- verificações aplicáveis passaram ou falhas estão documentadas;
- segurança e licenças foram consideradas;
- documentação de continuidade foi atualizada;
- estado de commit, push e PR está explícito;
- o próximo passo permanece não iniciado.

## Relatório de continuidade obrigatório

Toda tarefa termina exatamente com estas seções:

```text
Relatório de continuidade

Objetivo da sessão:
[descrever]

Estado anterior:
[descrever]

Alterações realizadas:
[descrever]

Arquivos alterados:
[listar]

Testes e verificações:
[listar comandos e resultados]

Decisões tomadas:
[listar]

Pendências ou riscos:
[listar]

Próxima tarefa recomendada:
[descrever uma única tarefa clara]

Instrução para a próxima IA:
[explicar exatamente onde continuar e quais arquivos ler primeiro]
```

Informação desconhecida deve ser marcada como **não confirmada**, nunca inferida.
