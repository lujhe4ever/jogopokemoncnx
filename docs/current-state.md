# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-23 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Branch principal | `main` |
| Branch desta entrega | `agent/fase-4-casa-movimento` |
| Fase | Fase 4 — casa, movimentação e colisão |
| Status | **concluída na branch — PR #5 aguardando revisão** |

## 1. Resumo

As Fases 0B, 1 e 2 foram integradas à `main`. A Fase 3 está implementada na branch
`agent/fase-3-autenticacao` e reservada no PR #4.

O projeto possui workspace TypeScript, servidor Fastify, cliente Vite/Phaser,
PostgreSQL, Prisma, WebSocket versionado, autenticação e a primeira fatia jogável da
casa.

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
| Mapas, NPCs, itens e missões | não iniciado |
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
- seis testes antes do teste Argon2id adicional;
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

D-001 a D-006 e D-008 estão aceitas. As demais decisões técnicas
continuam com o status registrado em `docs/decisions.md`.

## 9. Próxima tarefa recomendada

Revisar e integrar o PR #5. Depois, iniciar exclusivamente a Fase 5: mapas, zonas e
transições.

## 10. Instruções para reproduzir

Sincronizar a branch, copiar `.env.example` para `.env`, iniciar PostgreSQL, aplicar
as migrações e executar `pnpm dev`. Para revisão sem Docker, executar `pnpm check`;
a CI cobre PostgreSQL e migrações.
