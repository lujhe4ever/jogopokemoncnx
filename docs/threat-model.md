# Modelo de ameaças

## Escopo

O modelo cobre navegador, proxy TLS, clientes web/admin separados, servidor
autoritativo, PostgreSQL, canal WebSocket, arquivos de segredo, backups e operador.
Provedor de VPS, DNS e emissão de certificados ainda não foram selecionados.

## Ativos

- credenciais, sessões e papéis administrativos;
- progresso, inventário, criaturas e resultados de batalha;
- conteúdo publicado e trilha de auditoria;
- disponibilidade de salas e batalhas;
- segredos operacionais, banco e backups.

## Fronteiras de confiança

1. todo cliente e payload de rede é não confiável;
2. proxy aceita tráfego externo, mas banco e métricas ficam na rede interna;
3. servidor decide movimento, recompensa, captura e resultado;
4. admin exige sessão, papel e elevação adicional;
5. operador e arquivos de segredo ficam fora do repositório;
6. backup sai da VPS apenas para armazenamento criptografado e controlado.

## Ameaças e controles

| Ameaça | Controle atual |
| --- | --- |
| roubo/fixação de sessão | token opaco por hash, expiração, revogação e cookie seguro |
| brute force e enumeração | resposta genérica, Argon2id e rate limit |
| WebSocket de origem maliciosa | allowlist de `Origin`, ticket curto e descartável |
| payload abusivo | schemas runtime, body de 64 KiB e limites específicos |
| XSS/clickjacking/sniffing | CSP, `frame-ancestors`, `X-Frame-Options`, nosniff |
| fraude de gameplay | autoridade no servidor, sequência e idempotência |
| vazamento por telão | projeção allowlist e canal somente leitura |
| escalada administrativa | app separado, RBAC, elevação e auditoria |
| segredo no Git | arquivos ignorados e scan automatizado |
| dependência vulnerável | lockfile e auditoria crítica no gate |
| conteúdo sem licença/código | manifesto, allowlist de licença e scan de paths |
| banco exposto | rede Docker interna sem porta publicada |
| perda/corrupção | dump com checksum, retenção e restauração isolada |
| imagem incompatível | build manual sem push e promoção por tag imutável |
| telemetria revelar participante | desabilitada por padrão, consentimento, allowlist e contagem anônima em memória |

## Riscos residuais

- segredo administrativo compartilhado não é MFA individual; por isso o admin não
  está aprovado para exposição externa;
- VPS única permanece ponto único de falha;
- limiares de desempenho foram medidos em ambiente de desenvolvimento/CI, não no
  hardware final;
- armazenamento externo, rotação de certificados e recuperação de conta dependem da
  infraestrutura ainda não autorizada;
- proteção contra DDoS depende do provedor futuro.

Nenhuma falha crítica conhecida permanece no código revisado, mas esses riscos
impedem declarar o sistema pronto para tráfego real. O modelo deve ser revisto antes
de qualquer deploy e sempre que mudar autenticação, topologia ou tratamento de dados.
