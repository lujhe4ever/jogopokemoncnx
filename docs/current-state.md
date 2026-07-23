# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-23 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Branch principal | `main` |
| Branch desta entrega | `codex/pokemon-canonical-pilot` |
| Fase | Catálogo Pokémon canônico |
| Status | **em expansão na branch — aguardando revisão do proprietário** |

## 1. Resumo

As Fases 0B a 10 foram integradas à `main`. Esta branch adiciona um catálogo separado
para metadados canônicos de Pokémon e inventário de assets, sem publicar mídia de
terceiros cuja redistribuição não esteja claramente autorizada.

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

Verificação e recuperação de e-mail permanecem fora do escopo até que seus fluxos
completos sejam definidos.

## 3. Estrutura relevante

- `apps/web`: cliente placeholder Vite;
- `apps/server`: servidor, configuração, autenticação e adaptadores Prisma;
- `apps/server/prisma`: schema e migrações;
- `packages/engine-core`: núcleo puro ainda mínimo;
- `tests`: testes arquiteturais, de runtime e autenticação;
- `docker-compose.yml`: PostgreSQL local;
- `.github/workflows/ci.yml`: instalação, migração e qualidade.

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
| Outras batalhas | não iniciado |
| Arena e recursos sociais | não iniciado |
| Administração e deploy | não iniciado |

## 5. Comandos

```text
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm --filter @lt/server prisma:generate
pnpm --filter @lt/server db:migrate
pnpm dev
pnpm check
```

## 6. Verificações atuais

- formatação, lint e TypeScript estrito;
- 13 arquivos de teste e 37 testes automatizados;
- build do servidor e cliente;
- validação do schema Prisma;
- migrações aplicadas em PostgreSQL vazio pela CI;
- nenhum segredo ou asset de terceiros incluído.

## 7. Limitações e riscos

- Docker não está disponível no computador atual; a integração com PostgreSQL é
  validada na CI;
- parâmetros Argon2id precisam ser reavaliados em hardware de produção;
- não existe envio de e-mail, recuperação de senha ou MFA;
- o repositório permanece público;
- nenhum deploy foi realizado.

## 8. Decisões vigentes

D-001 a D-008 e D-011 a D-015 estão aceitas. As demais decisões técnicas
continuam com o status registrado em `docs/decisions.md`.

## 9. Próxima tarefa recomendada

Concluir e revisar a expansão do catálogo Pokémon canônico, incluindo definições
auditáveis e a decisão de licença de cada coleção candidata de sprites reais.

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
