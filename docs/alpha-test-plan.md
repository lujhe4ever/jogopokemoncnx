# Roteiro do alpha privado

## Estado desta entrega

Este roteiro foi preparado e ensaiado internamente. Nenhum ambiente foi publicado,
nenhum participante foi convidado e nenhuma telemetria real foi coletada.

## Preparação

1. usar um banco descartável migrado do zero;
2. iniciar servidor e jogo localmente;
3. manter `ALPHA_TELEMETRY_ENABLED=false`, exceto no ensaio explícito de consentimento;
4. criar duas contas descartáveis sem dados pessoais reais;
5. confirmar health/readiness e registrar a versão/commit do ensaio.

## Jornada principal

| Etapa | Ação | Resultado esperado |
| --- | --- | --- |
| Conta | cadastrar, entrar, recarregar e sair | sessão segura, retomada e revogação |
| Casa | mover por teclado/toque e tentar atravessar obstáculos | autoridade e colisão consistentes |
| Clareira | usar o portal e reconectar | zona/checkpoint preservados |
| Exploração | falar com NPC, pegar item e abrir baú duas vezes | feedback acessível e recompensa única |
| Criatura | treinar, lutar e concluir batalha NPC | turno/replay/resultado consistentes |
| Captura | vencer encontro e usar o Orbe | consumo e criatura atômicos |
| Missão | acompanhar e receber recompensa | progresso e prêmio idempotentes |
| Arena | entrar com duas contas, mover, conversar e usar emote | presenças isoladas e chat limitado |
| PvP | convidar, aceitar, lutar, desconectar/reconectar e assistir | privacidade, timeout e vencedor correto |
| Encerramento | sair, retornar e consultar progresso | estado durável preservado |

As evidências automatizadas de cada checkpoint estão em
`ops/alpha/readiness.json`. `pnpm alpha:readiness` falha se uma evidência desaparecer,
se houver P0/P1 aberto ou se deploy/participantes forem autorizados acidentalmente.

## Telemetria e privacidade

A telemetria do alpha:

- fica desabilitada por padrão e só registra com configuração explícita;
- exige sessão e `consent: true`;
- aceita somente nomes de evento definidos, sem texto livre, ID, e-mail, IP ou payload;
- agrega contagens apenas em memória e expõe o total somente pelas métricas protegidas;
- não persiste perfil, sequência individual nem conteúdo de chat.

Participantes futuros devem receber objetivo, dados coletados, retenção e forma de
retirar consentimento antes do teste.

## Triagem

| Severidade | Definição | Ação |
| --- | --- | --- |
| P0 | perda/corrupção de dados, invasão ou indisponibilidade total | interromper ensaio |
| P1 | jornada principal bloqueada ou privilégio incorreto | não liberar candidato |
| P2 | função parcial com alternativa segura | corrigir antes da próxima rodada |
| P3 | problema visual/textual sem bloqueio | priorizar por impacto |

Todo defeito precisa de versão, ambiente, passos, resultado esperado/observado,
request ID e evidência sem PII. Correção exige teste de regressão e execução de
`pnpm check`.

## Gate de saída

- jornada completa sem bloqueio;
- zero P0/P1 aberto;
- progresso restaurável pelo runbook;
- budgets e arena com 20 presenças aprovados;
- licenças/procedência completas;
- auditoria e scans limpos;
- consentimento e retenção aprovados antes de usuários reais;
- infraestrutura e MFA individual aprovados antes de qualquer exposição.
