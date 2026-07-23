# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-23 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Branch principal | `main` |
| Branch desta entrega | `agent/fase-14-teloes-transmissao` |
| Fase | Fase 14 — telões e transmissão de batalhas |
| Status | **reservada — implementação em andamento** |

## 1. Resumo

As Fases 0B a 13 foram integradas à `main`. A Fase 14 está reservada na branch
`agent/fase-14-teloes-transmissao`.

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
| Batalhas PvP | concluídas |
| Telões e espectadores | em andamento na branch |
| Arena e presença | concluídas na branch |
| Chat, emotes e convites | concluídos na branch |
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
- 19 arquivos de teste e 55 testes automatizados;
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

D-001 a D-008 e D-011 a D-018 estão aceitas. As demais decisões técnicas
continuam com o status registrado em `docs/decisions.md`.

## 9. Próxima tarefa recomendada

Implementar exclusivamente a Fase 14: projeção pública somente leitura, retomada
sequenciada, anúncio confirmado e fan-out seguro para os telões da arena.

## 10. Instruções para reproduzir

Sincronizar a branch, copiar `.env.example` para `.env`, iniciar PostgreSQL, aplicar
as migrações e executar `pnpm dev`. Para revisão sem Docker, executar `pnpm check`;
a CI cobre PostgreSQL e migrações.
