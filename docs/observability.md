# Observabilidade

## Sinais disponíveis

O servidor mantém logs estruturados com request ID e expõe métricas Prometheus
somente quando `METRICS_TOKEN` possui pelo menos 32 caracteres. A rota `/metrics`
exige `Authorization: Bearer <token>`, usa comparação em tempo constante e não é
publicada pelo proxy de borda.

As métricas cobrem:

- requisições e erros HTTP acumulados;
- uptime e memória RSS do processo;
- salas e jogadores presentes;
- mensagens descartadas por backpressure;
- maior duração de tick observada;
- broadcasts e entregas de telão.

O dashboard de referência está em `ops/grafana/dashboard.json`. Os alertas em
`ops/prometheus/alerts.yml` cobrem indisponibilidade, taxa de erro, memória,
backpressure e tick acima do orçamento.

## Uso operacional

- Prometheus deve ler o token de um arquivo secreto e acessar o servidor pela rede
  interna;
- logs e métricas não devem incluir senha, cookie, token, e-mail ou payload de chat;
- um alerta deve apontar para o runbook e preservar request IDs para correlação;
- ausência de dados é falha de monitoramento, não evidência de saúde;
- limites devem ser recalibrados após medição no hardware autorizado.

Tracing distribuído não foi introduzido porque a topologia continua um monólito em
uma VPS. Request IDs cobrem a correlação atual; múltiplos processos ou serviços são
o gatilho para reavaliar tracing.
