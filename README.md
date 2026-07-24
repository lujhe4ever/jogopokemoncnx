# Projeto LT

RPG 2D online original para navegador, com exploração, criaturas, batalhas por turno
e arena social. O roadmap 0B–17 está concluído e integrado à `main`.

## Estado

- catálogo canônico com 1.025 espécies e definições normalizadas;
- 4.100 sprites Pokémon temporários, auditados e bloqueados no runtime;
- biblioteca genérica CC0 com 15 PNGs e 39 OGGs, também desativada no runtime;
- jogo, servidor e painel administrativo construídos separadamente;
- PostgreSQL/Prisma, HTTP e WebSocket autoritativos;
- jornada de exploração, captura, missões, arena, chat, PvP e telões;
- hardening, budgets, observabilidade, backup/restore e rollback;
- alpha ensaiado internamente, com zero P0/P1 aberto;
- nenhum deploy ou coleta real de telemetria realizado.

## Início local

```sh
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm --filter @lt/server prisma:generate
pnpm --filter @lt/server db:migrate
pnpm dev
```

Validação completa:

```sh
pnpm check
pnpm audit --prod --audit-level high
```

Inventário e validação de assets:

```sh
pnpm assets:inventory
pnpm assets:validate
```

## Documentação

- [estado atual](docs/current-state.md);
- [arquitetura](docs/architecture.md);
- [roadmap](docs/roadmap.md);
- [decisões](docs/decisions.md);
- [roteiro do alpha](docs/alpha-test-plan.md);
- [runbook operacional](docs/runbooks/operations.md);
- [modelo de ameaças](docs/threat-model.md);
- [inventário de conteúdo](docs/content-inventory.md).
- [política de integração de assets](docs/asset-integration-policy.md);
- [inventário final de assets](docs/assets/final-asset-inventory.md).

O conteúdo é original e substituível. Credenciais, certificados e assets sem
procedência não pertencem ao repositório. Qualquer deploy futuro exige novo gate,
infraestrutura autorizada e resolução dos riscos residuais documentados.
