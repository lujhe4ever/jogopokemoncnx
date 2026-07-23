# Runbook de operação privada

## Estado e limites

Este runbook prepara uma operação privada, mas nenhum deploy foi realizado. VPS,
DNS, certificados, armazenamento externo e segredos reais continuam fora do
repositório. A baseline provisória é:

- até 20 presenças por arena;
- RPO de 24 horas;
- RTO de 4 horas;
- retenção de sete backups diários;
- uma VPS, aceita inicialmente como ponto único de falha.

Revalidar capacidade, RPO e RTO no hardware autorizado antes de receber tráfego.

## Pré-requisitos

1. Linux com Docker Engine, Compose v2 e armazenamento persistente;
2. DNS privado e certificados válidos para jogo e administração;
3. volume de backup fora da VPS e, em operação real, criptografado;
4. arquivos de segredo listados em `ops/README.md`, com acesso somente ao operador;
5. imagens construídas e validadas pelo workflow manual, identificadas por tag
   imutável.

## Gate de candidato

Acionar manualmente `Build release candidate (no deploy)`. O workflow instala pelo
lockfile, gera Prisma, migra banco vazio, executa todos os checks, audita
dependências, demonstra backup/restauração e constrói as três imagens sem publicar
nem promover.

Uma falha interrompe o candidato. O workflow não possui credenciais de produção nem
etapa de deploy.

## Preparação e migração

1. copiar somente os arquivos operacionais para o host autorizado;
2. preencher `ops/secrets/` fora do Git;
3. definir `LT_IMAGE_TAG` com a tag imutável aprovada;
4. executar `docker compose -f docker-compose.production.yml config`;
5. criar backup verificável antes de qualquer migração;
6. executar o job isolado:

   ```sh
   docker compose -f docker-compose.production.yml --profile migration run --rm migrate
   ```

7. confirmar término com código zero antes de iniciar o servidor.

O PostgreSQL está somente na rede interna e não publica porta no host.

## Inicialização e saúde

Iniciar os serviços somente após a migração:

```sh
docker compose -f docker-compose.production.yml up -d postgres server web admin edge
```

Validar `/health` para disponibilidade e `/ready` para dependências. Validar jogo e
admin pelos hosts TLS esperados. Não expor `/metrics` pelo proxy público.

## Bootstrap administrativo

Usar `ADMIN_GRANT_ACCOUNT_ID` e `ADMIN_GRANT_ROLE` apenas no processo isolado do
comando `pnpm --filter @lt/server admin:grant`. Remover as variáveis imediatamente.
O segredo de elevação compartilhado é temporário e não autoriza exposição externa:
MFA individual resistente a phishing continua obrigatório antes disso.

## Backup e restauração

Criar backup:

```sh
DATABASE_URL=postgresql://... BACKUP_DIR=/backups \
  bash ops/scripts/backup.sh
```

O script gera dump PostgreSQL customizado e checksum SHA-256. Copiar ambos para
armazenamento externo criptografado. Uma cópia sem checksum ou sem teste de
restauração não atende ao RPO.

Demonstrar restauração isolada:

```sh
DATABASE_URL=postgresql://... BACKUP_DIR=/backups \
  bash ops/scripts/verify-backup.sh
```

Para restaurar um arquivo escolhido, usar banco isolado e confirmação explícita:

```sh
RESTORE_CONFIRMATION=RESTORE_DATABASE RESTORE_DATABASE_URL=postgresql://... \
  BACKUP_FILE=/backups/arquivo.dump bash ops/scripts/restore.sh
```

Nunca testar restauração sobre o banco ativo.

## Rollback

1. interromper promoção e preservar logs/request IDs;
2. avaliar compatibilidade da migração; schema destrutivo exige restauração validada;
3. definir `PREVIOUS_IMAGE_TAG` para a última tag aprovada;
4. executar com confirmação:

   ```sh
   ROLLBACK_CONFIRMATION=ROLLBACK_APPLICATION PREVIOUS_IMAGE_TAG=sha-anterior \
     bash ops/scripts/rollback.sh
   ```

5. validar saúde, readiness, login e jornada principal;
6. registrar incidente e não apagar o backup anterior.

## Incidente

1. classificar impacto e interromper mudanças;
2. coletar request IDs, métricas e logs sem copiar segredos ou PII;
3. para taxa de erro ou indisponibilidade, usar os alertas documentados;
4. para suspeita de credencial, revogar sessões e rotacionar o segredo afetado;
5. para corrupção, colocar a aplicação em manutenção e restaurar cópia já verificada;
6. documentar linha do tempo, causa, recuperação e ação preventiva.
