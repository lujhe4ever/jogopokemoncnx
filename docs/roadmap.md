# Roadmap

| Campo | Valor |
| --- | --- |
| Status do projeto | **Fase 0B — em andamento** |
| Atualizado em | 2026-07-23 |
| Implementação existente | Nenhuma |

## 1. Regras do roadmap

- Nenhuma fase de implementação foi iniciada.
- A documentação da Fase 0B não aprova automaticamente as decisões D-001 a D-010.
- Cada fase exige proposta, autorização explícita, execução, verificação e revisão.
- Uma fase só é concluída quando todos os critérios possuem evidência.
- Datas e estimativas serão discutidas somente após o escopo da fase ser aprovado.
- Mudança de status deve atualizar este arquivo e `current-state.md`.
- Não executar duas fases dependentes em paralelo.
- Testes, segurança, acessibilidade, desempenho e observabilidade são requisitos
  contínuos desde a primeira implementação. A fase de hardening apenas consolida e
  valida o sistema integrado; ela não adia qualidade para o fim.

Status permitidos:

- **não iniciado**;
- **em andamento**;
- **bloqueado**;
- **concluído**.

## 2. Visão resumida

| Fase | Resultado | Status |
| --- | --- | --- |
| 0B | Arquitetura e governança colaborativa | em andamento |
| 1 | Fundação e configuração reproduzível | não iniciado |
| 2 | Runtime local mínimo integrado | não iniciado |
| 3 | Autenticação, perfil e sessão | não iniciado |
| 4 | Casa, movimentação e colisão | não iniciado |
| 5 | Mapas e transições | não iniciado |
| 6 | NPCs, diálogos, itens e baús | não iniciado |
| 7 | Fundação de criaturas, treinamento e progressão | não iniciado |
| 8 | Batalha contra NPCs | não iniciado |
| 9 | Encontros e captura | não iniciado |
| 10 | Missões e persistência integrada | não iniciado |
| 11 | Arena multiplayer e presença | não iniciado |
| 12 | Chat, emotes e convites | não iniciado |
| 13 | Batalhas entre jogadores | não iniciado |
| 14 | Telões e transmissão de batalhas | não iniciado |
| 15 | Painel administrativo | não iniciado |
| 16 | Segurança, performance, testes e deploy | não iniciado |
| 17 | Alpha privado e estabilização | não iniciado |

## 3. Fases

### Fase 0B — Arquitetura e governança colaborativa

**Objetivo**

Criar uma fonte de verdade que permita a duas pessoas e duas IAs alternarem o trabalho
sem depender de memória local.

**Entregáveis**

- `architecture.md` como baseline normativa;
- `AGENTS.md`;
- `docs/architecture.md`;
- `docs/roadmap.md`;
- `docs/game-design.md`;
- `docs/decisions.md`;
- `docs/current-state.md`;
- `docs/work-log.md`;
- branch documental isolada para revisão.

**Dependências**

- nenhuma dependência técnica;
- acesso de escrita ao GitHub.

**Critérios de aceite**

- todos os arquivos obrigatórios existem;
- responsabilidades documentais não são contraditórias;
- nenhuma decisão proposta é apresentada como aceita;
- nenhum código, scaffold, dependência ou asset foi criado;
- estado e próximo passo são reproduzíveis a partir do repositório;
- usuário revisou e autorizou o encerramento/merge da fase.

**Riscos**

- duplicar informações entre `architecture.md` e `docs/architecture.md`;
- transformar recomendação em requisito sem aprovação;
- documentação extensa perder atualidade.

**Status:** **concluído** — os oito documentos foram revisados e integrados à `main`
pelo PR #1 no commit `41c2807b1b5e240909fb08c76f0325cc68345729`.

### Fase 1 — Fundação e configuração do projeto

**Objetivo**

Criar um workspace TypeScript mínimo, reproduzível e sem funcionalidade de gameplay.

**Entregáveis**

- versões fixadas de Node e gerenciador de pacotes;
- `pnpm` workspace e decisão sobre Turborepo;
- apps/pacotes mínimos com regras de dependência;
- TypeScript estrito;
- ESLint, Prettier e EditorConfig;
- runner de testes e primeiro teste arquitetural;
- Husky/lint-staged;
- `.env.example` sem segredos;
- CI inicial para install, format, lint, typecheck, test e build;
- comandos oficiais registrados em `AGENTS.md`.

**Dependências**

- Fase 0B aprovada;
- D-001 e D-002 aceitas ou experimento limitado explicitamente autorizado para o
  escopo da Fase 1;
- ambiente Node e Git validado.

**Critérios de aceite**

- instalação limpa pelo lockfile;
- format, lint, typecheck, test e build passam localmente e na CI;
- imports proibidos são detectados;
- nenhuma credencial ou asset sem licença existe;
- Windows, Linux/CI e contêiner usam comandos equivalentes.

**Riscos**

- excesso de ferramentas antes do primeiro caso de uso;
- versões incompatíveis;
- estrutura física maior que a necessidade real.

**Status:** **concluído na branch, aguardando revisão** — workspace, qualidade,
teste arquitetural, hooks e CI implementados no PR #2.

### Fase 2 — Runtime e infraestrutura local mínimos

**Objetivo**

Comprovar a comunicação vazia entre navegador, servidor e PostgreSQL.

**Entregáveis**

- boot placeholder do cliente;
- endpoint de health e readiness;
- handshake WebSocket mínimo e versionado;
- PostgreSQL e ambiente Docker Compose;
- Prisma isolado e migração inicial;
- configuração validada por ambiente;
- logs estruturados e IDs de correlação.

**Dependências**

- Fase 1 concluída;
- decisões de protocolo, persistência e containers aprovadas.

**Critérios de aceite**

- ambiente sobe do zero com procedimento documentado;
- cliente conecta por HTTP e WebSocket;
- migração aplica em banco vazio e pode ser repetida com segurança;
- desligamento fecha recursos sem corrupção;
- falhas de configuração são claras e não expõem segredos.

**Riscos**

- acoplar bootstrap ao domínio;
- divergência entre ambiente local e VPS;
- colocar acesso a Prisma ou transporte em pacotes puros.

**Status:** **concluído na branch, aguardando revisão** — runtime, migração, Compose,
testes e CI implementados no PR #3.

### Fase 3 — Autenticação, perfil e sessão

**Objetivo**

Permitir login seguro por e-mail/senha e carregar um perfil mínimo.

**Entregáveis**

- cadastro/login conforme escopo aprovado;
- senha com Argon2id parametrizado por benchmark;
- sessão opaca, revogação e rotação;
- cookie seguro;
- perfil mínimo persistido;
- ticket WebSocket efêmero;
- rate limiting e auditoria de falhas;
- testes de autenticação e autorização.

**Dependências**

- Fase 2 concluída;
- decisões de sessão, verificação de e-mail e recuperação de senha.

**Critérios de aceite**

- credenciais nunca aparecem em logs ou URL;
- senha não é armazenada em texto puro;
- sessão inválida/revogada é rejeitada;
- ticket WebSocket expira e só pode ser usado uma vez;
- enumeração e brute force possuem mitigação;
- testes cobrem fluxos felizes e falhas.

**Riscos**

- desenho incompleto de recuperação de conta;
- cookies/CORS configurados incorretamente;
- dados pessoais excessivos.

**Status:** **concluído na branch, aguardando revisão** — autenticação, sessão,
perfil, ticket WebSocket, mitigação de abuso e testes implementados no PR #4.

### Fase 4 — Protótipo local da casa, movimentação e colisão

**Objetivo**

Entregar a primeira fatia jogável: login, entrada na casa, movimento, colisão e
reconexão.

**Entregáveis**

- engine-core mínima;
- adaptador Phaser;
- cena da casa com pack placeholder original/licenciado;
- input por teclado e toque;
- movimento e colisão em passo fixo;
- servidor autoritativo;
- previsão, interpolação e reconciliação;
- checkpoint de posição segura.

**Dependências**

- Fases 2 e 3 concluídas;
- formato mínimo de mapa e conteúdo aprovado.

**Critérios de aceite**

- domínio/simulação executa headless em Node;
- cliente adulterado não força posição inválida;
- dois clientes observam estado consistente;
- recarregar/reconectar retorna a checkpoint seguro;
- desktop e dispositivo mobile de referência atingem meta acordada;
- nenhum I/O de banco ocorre no tick.

**Riscos**

- física Phaser virar fonte de verdade;
- sensação ruim sob latência;
- escrita excessiva de posição;
- pack placeholder contaminar regras.

**Status:** **concluído na branch, aguardando revisão** — casa original, simulação
headless, Phaser, autoridade do servidor, reconciliação e checkpoint no PR #5.

### Fase 5 — Mapas, zonas e transições

**Objetivo**

Expandir a casa para um mundo dividido em zonas carregadas sob demanda.

**Entregáveis**

- contrato de mapa;
- zonas e portais/transições;
- spawn e checkpoint por zona;
- carregamento e descarte de packs;
- área de interesse;
- validação de transição no servidor.

**Dependências**

- Fase 4 concluída;
- pipeline mínimo de autoria de mapa decidido.

**Critérios de aceite**

- transição não duplica avatar nem perde checkpoint;
- cliente não entra em zona sem autorização;
- boot inicial não carrega mapas futuros;
- assets antigos são liberados dentro do orçamento;
- salas não vazam estado entre zonas.

**Riscos**

- mapas pesados;
- formato de autoria difícil de manter;
- transição concorrente ou reconexão no meio da troca.

**Status:** **concluído na branch**, aguardando revisão no PR #6.

### Fase 6 — NPCs, diálogos, itens e baús

**Objetivo**

Formar o primeiro ciclo de exploração e interação.

**Entregáveis**

- interação por proximidade e contexto;
- NPCs orientados a capacidades;
- diálogo declarativo;
- itens e pickups;
- baús únicos/recorrentes conforme design;
- inventário transacional;
- feedback visual acessível.

**Dependências**

- Fase 5 concluída;
- contratos de conteúdo e inventário aprovados.

**Critérios de aceite**

- servidor valida distância e disponibilidade;
- retry não duplica baú, pickup ou recompensa;
- inventário preserva limites e invariantes;
- NPC não contém regra de infraestrutura;
- conteúdo pode mudar sem alterar a engine.

**Riscos**

- abstração de interação genérica demais;
- duplicação por concorrência;
- diálogo acoplado ao renderer.

**Status:** **não iniciado**.

### Fase 7 — Fundação de criaturas, treinamento e progressão

**Objetivo**

Criar o modelo de criaturas e equipe usando catálogo substituível, sem encontro ou
captura nesta fase.

**Entregáveis**

- definição e instância de criatura separadas;
- catálogo placeholder original/licenciado;
- equipe e coleção;
- experiência/treinamento;
- evolução conforme regra aprovada;
- persistência transacional.

**Dependências**

- Fase 6 concluída;
- decisões de atributos, equipe, treinamento e evolução em `game-design.md`.

**Critérios de aceite**

- instâncias preservam invariantes de atributos e ownership;
- retry não duplica atualização de experiência ou evolução;
- trocar o pack não altera engine/domínio;
- saves guardam IDs estáveis e versão.

**Riscos**

- regras de progressão indefinidas;
- fórmulas específicas vazarem para infraestrutura;
- mudança de conteúdo invalidar saves.

**Status:** **não iniciado**.

### Fase 8 — Batalha contra NPCs

**Objetivo**

Criar uma batalha por turno isolada do mundo.

**Entregáveis**

- máquina de estados pura;
- comandos e eventos de batalha;
- seleção de ações;
- adversário controlado por política;
- RNG com seed;
- UI de batalha;
- resultado transacional;
- timeout, abandono e retorno ao mundo.

**Dependências**

- Fase 7 concluída;
- regras mínimas de batalha aprovadas.

**Critérios de aceite**

- replay com mesma seed e comandos produz resultado equivalente;
- comandos fora de turno são rejeitados;
- resultado é aplicado uma vez;
- mundo não importa internals da batalha;
- desconexão possui resultado explícito e testado.

**Riscos**

- escopo excessivo de habilidades/efeitos;
- batalha presa em estado sem saída;
- aplicação duplicada de recompensa.

**Status:** **não iniciado**.

### Fase 9 — Encontros e captura

**Objetivo**

Conectar exploração, batalha e coleção em um fluxo de encontro e captura validado no
servidor.

**Entregáveis**

- geração de encontro no mundo;
- transição explícita para a batalha;
- elegibilidade de captura conforme regra aprovada;
- tentativa de captura após a etapa de batalha definida pelo design;
- consumo de item e criação/transferência da criatura em operação atômica;
- retorno seguro ao mundo;
- persistência idempotente do resultado.

**Dependências**

- Fases 7 e 8 concluídas;
- fórmula, recursos e condições de captura aprovados.

**Critérios de aceite**

- captura não ocorre antes da etapa de batalha exigida pelo design;
- servidor decide a tentativa com RNG controlável para teste;
- retry não duplica criatura nem consumo de item;
- falha, desconexão e timeout retornam a estado seguro;
- trocar o pack não altera engine/domínio.

**Riscos**

- fórmula de captura indefinida;
- duplicação por concorrência;
- encontro e batalha ficarem acoplados ao mundo;
- resultado parcial entre item, criatura e progresso.

**Status:** **não iniciado**.

### Fase 10 — Missões e persistência integrada

**Objetivo**

Conectar exploração, NPCs, captura e batalha em objetivos persistentes.

**Entregáveis**

- estados e condições de missão;
- progresso reagindo a eventos públicos;
- recompensas idempotentes;
- diário de missões;
- política de evolução/migração de conteúdo;
- checkpoints integrados.

**Dependências**

- Fases 6 a 9 concluídas;
- design inicial de missões aprovado.

**Critérios de aceite**

- progressão não duplica em retry/reconexão;
- missão não acessa internals de todos os módulos;
- recompensa usa transação;
- versões antigas têm migração ou política explícita;
- salvar e restaurar preserva invariantes.

**Riscos**

- dependências circulares;
- conteúdo novo invalidar progresso;
- eventos excessivamente genéricos.

**Status:** **não iniciado**.

### Fase 11 — Arena multiplayer e presença

**Objetivo**

Validar uma sala social separada da exploração para até 20 jogadores.

**Entregáveis**

- entrada e saída da arena;
- capacidade e lotação autoritativas;
- presença e posições;
- múltiplas salas isoladas;
- reconexão;
- área de interesse e deltas;
- benchmark de 20 avatares.

**Dependências**

- Fase 4 concluída;
- infraestrutura de sala estabilizada;
- política de identidade pública aprovada.

**Critérios de aceite**

- 20 avatares funcionam no hardware-alvo dentro do orçamento aprovado;
- lotação não pode ser burlada pelo cliente;
- salas não vazam eventos;
- desconexão limpa presença;
- tick e backpressure estão instrumentados.

**Riscos**

- fan-out de rede;
- consumo de memória por sala;
- abuso de presença;
- medição em hardware não representativo.

**Status:** **não iniciado**.

### Fase 12 — Chat, emotes e convites

**Objetivo**

Adicionar comunicação e desafios sociais com segurança.

**Entregáveis**

- chat sobre personagens e alternativa acessível;
- rate limit, tamanho e moderação;
- emotes por catálogo;
- mute/bloqueio conforme escopo;
- convites expiráveis e de uso único;
- revalidação de lotação e permissão.

**Dependências**

- Fase 11 concluída;
- política de moderação, retenção e privacidade.

**Critérios de aceite**

- autoria e timestamp vêm do servidor;
- spam e payload excessivo são rejeitados;
- convite expirado/usado não pode ser reaplicado;
- emote desconhecido é rejeitado;
- chat não bloqueia tick de movimento.

**Riscos**

- abuso, assédio e privacidade;
- retenção inadequada;
- overlay de chat ilegível em mobile.

**Status:** **não iniciado**.

### Fase 13 — Batalhas entre jogadores

**Objetivo**

Reutilizar o núcleo de batalha em desafios PvP autorizados pela arena.

**Entregáveis**

- aceite mútuo do desafio;
- validação de equipe;
- instância PvP;
- regras de turno/timeout;
- abandono e reconexão;
- resultado e anúncio de vencedor;
- políticas anti-replay/duplicação.

**Dependências**

- Fases 8, 11 e 12 concluídas;
- regras PvP aprovadas.

**Critérios de aceite**

- nenhum jogador controla comandos do oponente;
- escolhas privadas não vazam;
- resultado é aplicado uma vez;
- empate, timeout e abandono têm regra;
- espectadores não afetam a batalha.

**Riscos**

- espionagem de escolha;
- vantagem por desconexão;
- balanceamento virar bloqueio arquitetural.

**Status:** **não iniciado**.

### Fase 14 — Telões e transmissão de batalhas

**Objetivo**

Exibir batalhas ao vivo na arena por eventos públicos sanitizados.

**Entregáveis**

- `BattleProjection` pública;
- canal somente leitura;
- sequência e retomada;
- identificação dos competidores;
- estado visual permitido;
- anúncio de vencedor;
- política opcional de atraso;
- teste de fan-out e privacidade.

**Dependências**

- Fases 11 e 13 concluídas;
- limite de espectadores e política de visibilidade aprovados.

**Critérios de aceite**

- projeção não contém segredo ou comando;
- telão pode retomar após perda de mensagem;
- espectador não envia ação de batalha;
- vencedor é exibido a partir de evento confirmado;
- fan-out atende ao orçamento definido.

**Riscos**

- vazamento de dados privados;
- sobrecarga de broadcast;
- atraso ou inconsistência visual.

**Status:** **não iniciado**.

### Fase 15 — Painel administrativo

**Objetivo**

Operar usuários e conteúdo sem acesso manual irrestrito ao banco.

**Entregáveis**

- autenticação administrativa;
- RBAC;
- auditoria;
- consulta de perfil/progresso com minimização de dados;
- ações de suporte limitadas;
- validação e publicação de conteúdo;
- confirmação reforçada para ações destrutivas.

**Dependências**

- modelos das Fases 3 a 14 estabilizados;
- política administrativa e MFA aprovadas.

**Critérios de aceite**

- toda ação privilegiada é autorizada e auditada;
- conteúdo inválido não publica;
- admin não acessa tabelas diretamente pela UI;
- ação destrutiva exige confirmação e possui recuperação quando possível;
- dados pessoais não são expostos sem necessidade.

**Riscos**

- escalada de privilégio;
- admin acoplado ao schema;
- alterações irreversíveis;
- excesso de dados pessoais.

**Status:** **não iniciado**.

### Fase 16 — Testes, segurança, otimização e deploy

**Objetivo**

Validar requisitos não funcionais e preparar operação privada em VPS.

**Entregáveis**

- testes unitários, contrato, integração, E2E e carga consolidados;
- budgets de bundle, assets, FPS, memória e tick;
- profiling e otimizações justificadas;
- hardening, scan e revisão de ameaças;
- métricas, traces, dashboards e alertas;
- imagens de produção;
- proxy TLS e secrets;
- migração controlada;
- backup/restore e rollback testados;
- runbooks e CD com aprovação manual.

**Dependências**

- funcionalidades relevantes das fases anteriores;
- hardware-alvo, VPS, RPO/RTO e retenção aprovados.

**Critérios de aceite**

- desktop/mobile atingem metas aprovadas;
- arena de 20 jogadores atende ao orçamento;
- nenhuma falha crítica de segurança permanece aberta;
- deploy em VPS limpa é reproduzível;
- banco não está publicamente exposto;
- backup, restauração e rollback são demonstrados.

**Riscos**

- otimização tardia;
- migração incompatível;
- ponto único de falha da VPS;
- backup não restaurável;
- dispositivo de teste não representativo.

**Status:** **não iniciado**.

### Fase 17 — Alpha privado e estabilização

**Objetivo**

Validar o ciclo completo com usuários autorizados e conteúdo permitido.

**Entregáveis**

- jornada ponta a ponta;
- roteiro de testes privados;
- telemetria mínima com privacidade;
- triagem e correção de defeitos;
- checklist de licenças e substituição de assets;
- critérios para próxima etapa.

**Dependências**

- Fases 3 a 16 concluídas;
- conteúdo original/licenciado suficiente.

**Critérios de aceite**

- jornada principal é concluída sem bloqueio;
- nenhum asset sem procedência existe;
- nenhum defeito P0/P1 permanece aberto;
- progresso é recuperável;
- operação privada atende ao runbook.

**Riscos**

- expansão de escopo;
- conteúdo sem licença;
- defeitos de progressão persistente;
- telemetria excessiva.

**Status:** **não iniciado**.

## 4. Gate para a próxima tarefa

A única próxima tarefa recomendada é revisar a documentação da Fase 0B no PR #1,
resolver inconsistências e obter autorização explícita para marcá-lo como pronto ou
realizar ajustes. O merge exige autorização posterior.

A Fase 1 não está iniciada nem implicitamente autorizada.
