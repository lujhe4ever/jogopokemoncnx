# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-23 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Branch principal | `main` |
| Branch desta entrega | `docs/estrutura-inicial` |
| Fase | Fase 0B — governança e continuidade colaborativa |
| Status | **em andamento — documentação preparada, publicação pendente** |

## 1. Resumo

O projeto contém somente documentação. Não existe código de produto, scaffold,
dependência instalada, banco configurado, container, pipeline ou aplicação executável.

A branch `main` possuía um único commit antes desta tarefa:

- `b73b2b0124cbe57e96517785f84d0354426b5884` —
  `docs: establish architecture baseline`;
- único arquivo: `architecture.md`.

A ref remota `docs/estrutura-inicial` foi criada a partir dessa revisão e, neste
snapshot, ainda aponta para o mesmo commit da `main`, sem os documentos preparados
localmente. A baseline raiz preparada para publicação foi atualizada somente para
distinguir a Fase 0A já concluída da Fase 0B e apontar o roadmap operacional; nenhuma
proposta D-001 a D-010 mudou de status.

As decisões D-001 a D-010 continuam com status **Proposta**. Esta entrega não aprova
stack nem autoriza a Fase 1.

## 2. Tarefa atual

Preparação local da estrutura documental obrigatória para a branch
`docs/estrutura-inicial`, sem código ou dependências.

Os arquivos foram preparados e validados localmente. Publicação, verificação do diff
remoto, revisão e eventual merge ainda estão pendentes neste snapshot. Por isso, a
Fase 0B permanece **em andamento** no roadmap.

## 3. Arquivos preparados para esta branch

- `architecture.md`: baseline normativa já existente;
- `AGENTS.md`: regras obrigatórias para pessoas e IAs;
- `docs/architecture.md`: visão operacional da arquitetura;
- `docs/roadmap.md`: fases, dependências, critérios, riscos e status;
- `docs/game-design.md`: visão funcional e questões de design;
- `docs/decisions.md`: decisões aceitas de colaboração e propostas técnicas;
- `docs/current-state.md`: fotografia factual do estado presente;
- `docs/work-log.md`: histórico cronológico append-only.

Não existe `docs/adr/`. O diretório deve nascer somente junto de um ADR concreto.

## 4. Estado por área

| Área | Estado |
| --- | --- |
| Arquitetura raiz | proposta documentada |
| Governança entre duas IAs | documentada na branch, aguardando revisão |
| Frontend Phaser/Vite | não iniciado |
| Backend Fastify/WebSocket | não iniciado |
| Engine e domínio | não iniciado |
| PostgreSQL/Prisma | não iniciado |
| Autenticação e perfil | não iniciado |
| Mundo e gameplay | não iniciado |
| Arena/social | não iniciado |
| Admin | não iniciado |
| Assets/packs de conteúdo | não iniciado |
| Docker/VPS | não iniciado |
| CI/CD | não iniciado |
| Observabilidade | não iniciado |
| Testes automatizados | não iniciado |

## 5. Funcionalidades funcionando

Nenhuma funcionalidade de produto existe.

O que está disponível:

- documentação versionada;
- baseline arquitetural;
- processo de início/fim de tarefas;
- roadmap e handoff entre IAs.

Isso não equivale a runtime, protótipo ou prova técnica.

## 6. Funcionalidades incompletas

Todas as funcionalidades descritas em `roadmap.md` a partir da Fase 1 estão não
iniciadas, incluindo:

- workspace e comandos;
- cliente e servidor;
- autenticação;
- banco e migrações;
- casa, movimento e colisão;
- mapas, NPCs, itens, baús e missões;
- criaturas, captura, progressão e batalha;
- arena, chat, emotes, convites e telões;
- admin, testes, segurança e deploy.

## 7. Dependências e configuração

- `package.json`: inexistente;
- lockfile: inexistente;
- runtime Node fixado: inexistente;
- dependências: inexistentes;
- `.env.example`: inexistente;
- schema/migrações Prisma: inexistentes;
- Dockerfiles/Compose: inexistentes;
- workflows GitHub Actions: inexistentes;
- assets aprovados: inexistentes.

Nenhuma versão concreta de biblioteca ou runtime foi instalada nesta fase.

## 8. Comandos do produto

| Finalidade | Estado |
| --- | --- |
| Instalação | não disponível até a Fase 1 |
| Desenvolvimento | não disponível até a Fase 1 |
| Formatação | não disponível até a Fase 1 |
| Lint | não disponível até a Fase 1 |
| Typecheck | não disponível até a Fase 1 |
| Testes | não disponível até a Fase 1 |
| Build | não disponível até a Fase 1 |
| Docker | não disponível até a Fase 1 |
| Migrações | não disponível até a Fase 1 |

## 9. Testes e verificações da última tarefa

Verificações executadas antes da publicação:

- leitura do estado e histórico remoto da `main`;
- confirmação de que a `main` continha somente `architecture.md`;
- revisão independente de consistência entre os oito documentos;
- validação de títulos/seções obrigatórias;
- validação de links relativos;
- validação do equilíbrio de blocos Markdown/Mermaid;
- confirmação local de que nenhum arquivo de código, dependência ou asset foi
  preparado.

Ainda pendentes neste snapshot:

- publicar os documentos;
- comparar a branch remota com `main`;
- conferir o conteúdo remoto dos arquivos;
- registrar os hashes e resultados finais.

Não houve lint, teste ou build de aplicação porque esses comandos não existem.

## 10. Erros e limitações conhecidas

- Não há aplicação para executar.
- A arquitetura ainda não foi validada por spike técnico.
- Metas de desempenho são hipóteses até existir benchmark.
- O processo de revisão entre duas IAs está documentado, mas ainda não foi praticado em
  uma entrega de código.
- A política de proteção de branch, reviewers e CI não está configurada.
- O repositório foi identificado como **público**, embora o projeto seja descrito como
  privado para estudo e lazer. Isso aumenta o cuidado com código, dados, branding e
  assets; nenhuma mudança de visibilidade foi autorizada.

## 11. Decisões pendentes

- aceitar ou ajustar D-001 a D-010;
- confirmar `pnpm` e Turborepo;
- confirmar Fastify em vez de Nest;
- escolher e fixar a versão LTS do Node;
- definir biblioteca/schema de validação e transporte WebSocket;
- decidir visibilidade e política de colaboradores do repositório;
- definir dispositivos de referência;
- aprovar o primeiro pack placeholder e sua licença;
- definir espectadores por arena;
- definir RPO, RTO e retenção;
- resolver questões abertas de `game-design.md` na fase que as consome.

## 12. Riscos atuais

- começar scaffold antes da aprovação documental;
- decisões propostas serem tratadas como aceitas;
- repositório público receber conteúdo protegido;
- duplicação entre a baseline raiz e a visão operacional;
- duas IAs escreverem na mesma branch;
- documentação deixar de ser atualizada junto do código futuro.

## 13. Próxima tarefa recomendada

Após a publicação e verificação remota desta documentação, revisar a branch
`docs/estrutura-inicial` e obter decisão explícita sobre merge da Fase 0B.

A Fase 1 não foi iniciada e não deve começar no mesmo trabalho de revisão.

## 14. Instruções para reproduzir o estado

Não existe ambiente de aplicação. Para revisar a documentação com Git instalado:

```text
git clone https://github.com/lujhe4ever/jogopokemoncnx.git
cd jogopokemoncnx
git fetch origin
git switch docs/estrutura-inicial
```

Ler, nesta ordem:

1. `AGENTS.md`;
2. `architecture.md`;
3. todos os arquivos em `docs/`;
4. histórico e diff contra `main`.

Se a branch já tiver sido integrada, sincronizar `main` com fast-forward e seguir o
mesmo roteiro de leitura.
