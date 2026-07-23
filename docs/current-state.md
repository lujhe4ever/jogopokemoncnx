# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-23 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Branch principal | `main` |
| Branch desta entrega | `agent/fase-7-criaturas-progressao` |
| Fase | Fase 7 — fundação de criaturas, treinamento e progressão |
| Status | **reservada — implementação em andamento** |

## 1. Resumo

As Fases 0B a 5 foram integradas à `main`. A Fase 6 está implementada na branch
`agent/fase-6-npcs-itens` e reservada no PR #7.

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
| Missões | não iniciado |
| Criaturas e batalhas | não iniciado |
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
- 7 arquivos de teste e 17 testes automatizados;
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

D-001 a D-008 e D-011 estão aceitas. As demais decisões técnicas
continuam com o status registrado em `docs/decisions.md`.

## 9. Próxima tarefa recomendada

Implementar exclusivamente a Fase 7: definições e instâncias de criatura, catálogo
original, equipe, coleção, experiência, evolução e persistência transacional.

## 10. Instruções para reproduzir

Sincronizar a branch, copiar `.env.example` para `.env`, iniciar PostgreSQL, aplicar
as migrações e executar `pnpm dev`. Para revisão sem Docker, executar `pnpm check`;
a CI cobre PostgreSQL e migrações.
