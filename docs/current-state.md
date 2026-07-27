# Estado atual do projeto

| Campo | Valor |
| --- | --- |
| Atualizado em | 2026-07-27 |
| Repositório | `lujhe4ever/jogopokemoncnx` |
| Fonte oficial | GitHub |
| SHA-base | `6f8929fb6b2587418ab8e06be9ec0e38fe301dd5` |
| Branch desta entrega | `feat/fase-18-vertical-slice-jogavel` |
| Issue de reserva | #26 |
| Fase | 18 — Vertical slice visual e jogável |
| Status | **implementada localmente; aguardando revisão da PR rascunho** |
| Deploy | não autorizado e não realizado |

## 1. Resultado desta fase

A fundação das Fases 0B–17 foi preservada e conectada a uma jornada visual completa:

- cadastro, login, retomada de sessão e logout;
- escolha permanente entre Broto Âmbar, Musgote e Maréu;
- companheiro persistido no primeiro slot da equipe;
- casa e Campina do Luar renderizadas em Phaser com pixel art procedural original;
- personagem com orientação e passo animado nas quatro direções;
- Cuidadora, baú, Erva luminosa, Orbe de captura e encontro visíveis;
- HUD da missão, inventário, coleção/equipe e missões;
- encontro orientado pela definição autorizada no conteúdo da zona;
- batalha usando a primeira criatura da equipe;
- dano, defesa, XP, nível e evolução projetados pela resposta do servidor;
- captura transacional, atualização da coleção e retomada após recarregar;
- efeitos sonoros procedurais opt-in e controles mobile;
- E2E Playwright da primeira expedição com evidências automáticas.

## 2. Contratos adicionados

| Rota | Finalidade |
| --- | --- |
| `GET /game/state` | projeção minimizada de perfil, checkpoint, inventário, criaturas e missões |
| `POST /game/starter` | escolha idempotente e única do companheiro |
| `POST /game/team` | valida ownership, ordem e limite da equipe |

As rotas continuam registradas sem `/api`. Vite e Nginx removem o prefixo público
`/api` para o jogo; `/api/admin` e `/api/alpha` permanecem preservados.

## 3. Conteúdo e procedência

O runtime usa apenas conteúdo original do Projeto LT:

- criaturas e textos do pack `original-creatures`;
- composição visual Phaser/HTML/CSS criada nesta fase;
- efeitos WebAudio gerados em tempo de execução;
- pack de procedência `original-vertical-slice`.

Nenhum sprite, nome, áudio ou mídia Pokémon foi ativado. As PRs #17, #21, #23 e #25
permanecem fora da base e não foram mescladas.

## 4. Execução

```text
pnpm install --frozen-lockfile
Copy-Item .env.example .env
docker compose up -d postgres
pnpm setup:local
pnpm dev
```

URL do jogo: `http://localhost:5173`.

## 5. Verificação

A instalação, geração Prisma, formatação, lint, typecheck, testes, builds, budgets,
scans de segredos/licenças, readiness e auditoria são executados pelo workspace. A CI
também inicia PostgreSQL vazio, aplica todas as migrations e executa o E2E Chromium.

Evidências manuais versionadas:

- `docs/screenshots/fase-18-onboarding.png`;
- `docs/screenshots/fase-18-casa.png`;
- `docs/screenshots/fase-18-batalha.png`;
- `docs/screenshots/fase-18-mobile.png`.

## 6. Limitações reais

- Docker não está instalado no computador desta execução; banco vazio, migrations e
  E2E com persistência real dependem da CI Linux;
- os efeitos visuais e de áudio são procedurais e deliberadamente pequenos, ainda sem
  spritesheets ou trilha musical externa;
- recuperação/verificação de e-mail e MFA continuam fora do escopo;
- infraestrutura real, participantes externos e telemetria real permanecem
  desautorizados;
- o repositório continua público apesar do uso pretendido ser privado/educacional.

## 7. Próximo gate

Revisar a PR rascunho da Fase 18 e sua CI. Ajustes pertencentes a esta vertical slice
podem ser feitos na mesma branch após autorização/revisão. Merge, deploy e uma Fase 19
exigem decisões separadas.
