# Pacote operacional

Este diretório prepara uma implantação privada reproduzível, mas não contém
credenciais e não executa deploy.

## Componentes

- `docker/`: imagens separadas de servidor, cliente e administração;
- `nginx/`: servidor estático e proxy de borda com TLS;
- `prometheus/` e `grafana/`: alertas e painel de referência;
- `scripts/`: backup, verificação de restauração e rollback;
- `budgets.json`: limites automatizados de bundles, assets e arena.

## Segredos esperados

Criar localmente `ops/secrets/`, que é ignorado pelo Git, com permissões restritas:

- `postgres_password.txt`;
- `database_url.txt`;
- `admin_step_up.txt`;
- `metrics_token.txt`;
- `tls_cert.pem`;
- `tls_key.pem`.

Nenhum valor real deve ser copiado para documentação, Compose ou GitHub Actions.
Consulte `docs/runbooks/operations.md` antes de usar o pacote.
