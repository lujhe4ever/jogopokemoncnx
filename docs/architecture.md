# Arquitetura operacional

| Campo | Valor |
| --- | --- |
| Status | **Proposta para revisão** |
| Atualizado em | 2026-07-23 |
| Implementação existente | Nenhuma |
| Baseline normativa | [`../architecture.md`](../architecture.md) |
| Decisões D-001 a D-010 | **Proposta** |

## 1. Propósito e relação com a baseline

O arquivo raiz `architecture.md` é a referência normativa para princípios, limites,
qualidades e decisões sistêmicas. Este documento descreve como esses limites deverão
aparecer na organização e nos fluxos do sistema à medida que forem implementados.

Se houver divergência, a baseline raiz prevalece até que a divergência seja discutida
e ambos os arquivos sejam atualizados no mesmo conjunto de mudanças. Nenhuma seção
abaixo afirma que o componente já existe.

## 2. Visão geral

O sistema proposto possui três superfícies:

- cliente web para jogadores;
- servidor autoritativo para API e tempo real;
- cliente administrativo separado e protegido.

PostgreSQL armazena estado durável. Salas de mundo, batalha e arena mantêm estado
transitório em memória na topologia inicial. Packs de conteúdo versionados alimentam
regras e assets sem acoplar a engine a uma franquia.

```mermaid
flowchart LR
    J["Jogador"] --> WEB["Cliente web<br/>Vite + Phaser"]
    OP["Operador"] --> ADMIN["Admin web"]
    WEB -->|"HTTPS /api"| HTTP["Fastify HTTP"]
    WEB <-->|"WebSocket /ws"| WS["Gateway de tempo real"]
    ADMIN -->|"HTTPS + RBAC"| HTTP
    HTTP --> APP["Casos de uso"]
    WS --> APP
    APP --> DOMAIN["Domínio e simulação<br/>TypeScript puro"]
    APP --> ROOMS["Registro de salas<br/>estado transitório"]
    APP --> DB[("PostgreSQL<br/>estado durável")]
    APP --> CONTENT["Packs de conteúdo"]
```

## 3. Tecnologias propostas

| Camada | Tecnologia | Estado |
| --- | --- | --- |
| Linguagem | TypeScript estrito | Proposta |
| Workspace | `pnpm` workspaces | Proposta |
| Orquestração | Turborepo | Proposta, precisa de confirmação |
| Web | Vite + Phaser 3 | Proposta |
| UI fora do canvas | HTML/CSS | Proposta |
| Servidor | Node.js LTS + Fastify | Proposta |
| Tempo real | WebSocket atrás de uma porta | Proposta |
| Persistência | PostgreSQL + Prisma | Proposta |
| Validação | Schemas compartilhados em runtime | Proposta |
| Logs | Pino em JSON | Proposta |
| Infraestrutura | Docker Compose em VPS Linux | Proposta |

Versões, bibliotecas concretas de schema e implementação WebSocket serão escolhidas na
Fase 1 ou em spikes autorizados. A arquitetura não depende da biblioteca de
transporte.

## 4. Camadas e responsabilidades

```mermaid
flowchart TB
    COMPOSE["Composition roots<br/>apps"]
    ADAPTERS["Adaptadores<br/>Phaser, HTTP, WS, Prisma"]
    APPLICATION["Aplicação<br/>casos de uso e coordenação"]
    DOMAIN["Domínio e engine-core<br/>regras puras"]

    COMPOSE --> ADAPTERS
    COMPOSE --> APPLICATION
    ADAPTERS --> APPLICATION
    APPLICATION --> DOMAIN
```

### 4.1 Domínio e engine-core

Responsáveis por:

- relógio e loop de passo fixo;
- eventos tipados e escopados;
- geometria, movimento e colisão simples;
- regras de criatura, inventário, missão e batalha;
- máquinas de estado;
- portas para render, input, áudio, assets, relógio, RNG e persistência.

Não podem importar Phaser, DOM, Fastify, WebSocket, Prisma ou código de composição.

### 4.2 Aplicação

Responsável por:

- executar casos de uso;
- coordenar módulos sem expor internals;
- definir transações e idempotência;
- converter eventos internos em projeções públicas;
- acionar repositórios por interfaces;
- mover jogadores entre instâncias de mundo, batalha e arena.

### 4.3 Adaptadores

Responsáveis por:

- Phaser: render, input, áudio, câmera e carregamento;
- HTTP/WebSocket: autenticar, validar e mapear contratos;
- Prisma: mapear modelos de persistência;
- conteúdo: validar e resolver packs;
- observabilidade: logs, métricas e traces.

### 4.4 Composition roots

Cada aplicação cria e conecta dependências. Regras de domínio não usam service locator
ou singleton global.

## 5. Organização de pastas pretendida

```text
/
├─ apps/
│  ├─ web/
│  │  └─ src/
│  │     ├─ app/
│  │     ├─ scenes/
│  │     ├─ features/
│  │     └─ adapters/
│  ├─ server/
│  │  └─ src/
│  │     ├─ modules/
│  │     ├─ adapters/
│  │     └─ bootstrap/
│  └─ admin/
├─ packages/
│  ├─ engine-core/
│  ├─ engine-phaser/
│  ├─ game-simulation/
│  ├─ battle-domain/
│  ├─ protocol/
│  ├─ content-contracts/
│  ├─ config/
│  └─ testing/
├─ content/
│  └─ packs/
├─ infra/
├─ docs/
│  └─ adr/
├─ AGENTS.md
└─ architecture.md
```

Essa árvore não deve ser criada inteira no scaffold. Cada diretório nasce com um
consumidor e uma regra de dependência verificável.

## 6. Frontend

### 6.1 Separação de interface

Phaser é usado para mundo, entidades, câmera, efeitos e interação espacial. HTML/CSS é
preferido para formulários, autenticação, menus, configurações, acessibilidade e
interfaces extensas.

Regras de negócio não residem em cenas ou componentes de UI. A UI envia comandos e
renderiza estado projetado.

### 6.2 Sistema de cenas proposto

| Cena/contexto | Responsabilidade |
| --- | --- |
| Boot | Verificar compatibilidade e carregar configuração mínima |
| Auth | Orquestrar login/perfil via interface HTML |
| World | Renderizar casa e zonas de exploração |
| Battle | Apresentar batalha e enviar escolhas |
| Arena | Renderizar espaço social, presença e telões |
| Overlay/UI | HUD e transições; sem regras de domínio |

Preload não deve virar uma cena que carrega todo o jogo. Cada contexto usa import
dinâmico e packs de assets próprios.

```mermaid
stateDiagram-v2
    [*] --> Boot
    Boot --> Auth: sessão ausente
    Boot --> World: sessão válida
    Auth --> World: login concluído
    World --> Battle: encontro ou desafio
    Battle --> World: batalha de exploração concluída
    World --> Arena: entrada autorizada
    Arena --> Battle: desafio aceito
    Battle --> Arena: batalha social concluída
    Arena --> World: sair da arena
```

### 6.3 Performance e mobile

- código dividido por contexto;
- packs de assets por zona;
- culling de tiles e entidades fora da câmera;
- limite de cache e descarte explícito;
- atlas e formatos comprimidos;
- teto de device pixel ratio em aparelhos limitados;
- teclado, gamepad e toque por `InputPort`;
- tratamento de resize, background e perda de WebGL;
- profiling antes de pooling, workers ou otimizações complexas.

## 7. Backend

O backend inicial é um monólito modular Fastify em um processo. Módulos previstos:

| Módulo | Ownership |
| --- | --- |
| Identity/Profile | conta, sessão e perfil |
| Player Progress | checkpoints e progressão durável |
| World | zonas, movimento, interação e encontros |
| Creatures | instâncias, treinamento e evolução |
| Inventory | itens, quantidades e transações |
| Quests | definição referenciada e progresso |
| Battle | máquina de estados e resultados |
| Arena Social | presença, chat, emotes e convites |
| Content | packs, versões e compatibilidade |
| Persistence | implementações de portas |
| Admin | operações autorizadas e auditadas |

Um módulo não consulta diretamente tabelas pertencentes a outro. Coordenação ocorre
por casos de uso e contratos tipados.

## 8. Fluxo principal do jogo

```mermaid
flowchart TD
    LOGIN["Login e perfil"] --> HOME["Casa do jogador"]
    HOME --> EXPLORE["Explorar zonas"]
    EXPLORE --> INTERACT["NPC, diálogo, item ou baú"]
    EXPLORE --> ENCOUNTER["Encontrar criatura"]
    ENCOUNTER --> BATTLE["Batalha por turno"]
    BATTLE --> CAPTURE{"Captura disponível?"}
    CAPTURE -->|sim| PROGRESS["Inventário e progresso"]
    CAPTURE -->|não| PROGRESS
    PROGRESS --> EXPLORE
    EXPLORE --> ARENA["Entrar na arena social"]
    ARENA --> CHALLENGE["Convite/desafio"]
    CHALLENGE --> BATTLE
    BATTLE --> SCREEN["Projeção pública nos telões"]
```

O jogador começa na casa. Essa primeira fatia valida boot, cena, input, movimento,
colisão, autoridade do servidor, checkpoint e reconexão antes de ampliar o mundo.

## 9. Tempo real e multiplayer

### 9.1 Instâncias

- `private-home`: sessão privada inicial;
- `world-zone`: exploração compartilhada ou instanciada;
- `battle-room`: batalha isolada;
- `arena-room`: espaço social com capacidade inicial de 20 jogadores.

Cada sala possui ID, tipo, capacidade, ciclo de vida e owner de processo. A primeira
topologia mantém salas em memória.

### 9.2 Protocolo

O cliente envia intenções sequenciadas. O servidor valida, aplica no tick e retorna
confirmação/snapshot/delta.

O envelope terá, no mínimo, conceitos equivalentes a:

```text
protocolVersion
type
messageId
correlationId
sequence
serverTime
payload
```

Schemas e campos exatos dependem de decisão posterior. Regras:

- uma conexão por sessão;
- handshake de versão e recursos;
- ticket WebSocket efêmero obtido por HTTPS;
- heartbeat, limites e backpressure;
- deduplicação de comandos;
- snapshot seguido de deltas na reconexão;
- área de interesse;
- nenhum banco ou I/O externo dentro do tick.

### 9.3 Movimento

A simulação proposta roda a 20 Hz, configurável. O cliente prevê somente o próprio
avatar e reconcilia com o último input processado. Avatares remotos são interpolados.
O servidor decide posição válida.

### 9.4 Arena, chat e telões

Arena é um módulo social, não o motor de batalha.

- `ArenaRegistry` mantém salas isoladas em memória e cada sala é uma fronteira de
  área de interesse;
- cada sala aceita até 20 presenças, simula movimento a 20 Hz e publica snapshot
  inicial seguido de deltas;
- sockets acima do limite de buffer deixam de receber broadcast sem bloquear o tick;
- uma janela de 30 segundos restaura posição em reconexão e IDs públicos efêmeros não
  revelam a chave interna da conta;
- chat tem tamanho, frequência, autoria e timestamp validados;
- chat é efêmero, deduplicado por request ID e rejeita URL/caractere de controle;
- mensagens aparecem sobre personagens por tempo limitado e podem alimentar painel
  acessível;
- emotes são IDs de uma allowlist de catálogo;
- convites expiram em 30 segundos, são de uso único e revalidam presença/lotação;
- telões assinam uma `BattleProjection` pública somente leitura;
- competidores e vencedor são identificados por dados sanitizados;
- escolhas secretas ou dados privados nunca entram na projeção.

## 10. Batalha

Batalha é uma máquina de estados pura, orientada a comandos e eventos. Ela recebe
participantes, regras e RNG injetável e produz eventos/resultados.

Ela não conhece Phaser, WebSocket, arena ou Prisma. Batalha contra NPC e PvP usam o
mesmo núcleo, com políticas de entrada e visibilidade distintas.

Comandos são idempotentes e sequenciados. A projeção para jogador pode conter dados
privados autorizados; a projeção para telão usa allowlist pública.

## 11. Persistência

PostgreSQL guarda:

- contas, sessões e perfis;
- checkpoints de mundo;
- instâncias de criatura e progressão;
- inventário e progresso de missão;
- resultados/checkpoints de batalha necessários;
- auditoria de ações administrativas e econômicas.

Prisma fica somente nos adaptadores. Tipos gerados não atravessam a borda de
infraestrutura.

Não se persiste cada frame. Alterações críticas usam transações, restrições únicas,
idempotência e concorrência otimista. Checkpoints são periódicos e também usados em
desconexão controlada.

Migrações são versionadas, imutáveis e testadas desde um banco vazio. Produção deverá
usar expand/contract quando necessário.

## 12. Autenticação e segurança

- senha derivada com Argon2id e parâmetros medidos;
- sessão opaca, revogável e rotacionada;
- cookie `Secure`, `HttpOnly` e `SameSite`;
- ticket WebSocket efêmero e de uso único;
- tokens não ficam em query string ou `localStorage`;
- CORS, origem e CSP com allowlists;
- rate limits separados por login, chat, convite e jogo;
- validação runtime e limites de tamanho;
- admin com RBAC, auditoria e MFA antes de exposição externa;
- logs sem senha, token, segredo ou PII desnecessária.

O servidor nunca aceita do cliente resultado de batalha, captura, recompensa,
inventário ou posição final como verdade.

## 13. Conteúdo e assets

`ContentPack` e `AssetCatalog` usam IDs namespaced, versão, checksum, dependências,
origem e licença. O cliente carrega arte/áudio/mapas sob demanda; o servidor carrega
somente metadados necessários às regras.

Packs são declarativos e não executam JavaScript arbitrário. Saves referenciam IDs e
versões, não caminhos. Alterar um ID persistido exige migração.

Somente conteúdo original, CC0 ou comprovadamente licenciado poderá ser publicado.

## 14. Deploy inicial

```mermaid
flowchart TB
    NET["Internet"] --> PROXY["Proxy TLS"]
    PROXY -->|"/"| WEB["Web estático"]
    PROXY -->|"/api e /ws"| SERVER["Servidor"]
    SERVER --> DB[("PostgreSQL")]
    MIGRATION["Job de migração"] --> DB
    DB --> BACKUP["Backup externo criptografado"]
```

Containers serão multi-stage, reproduzíveis e executados como usuário não-root.
Migração será etapa separada. Health checks de disponibilidade e prontidão serão
distintos. Deploy promoverá imagem por digest e manterá rollback.

A VPS única é um ponto único de falha aceito inicialmente. Backup fora da VPS e teste
de restauração precedem exposição externa.

## 15. Evolução e gatilhos de escala

Não introduzir Redis, broker ou microserviço por previsão. Reavaliar quando houver:

- necessidade comprovada de múltiplos processos;
- salas que não caibam em uma VPS dentro dos SLOs;
- presença ou fan-out entre processos;
- jobs duráveis que precisem sobreviver a falha;
- isolamento de falha, segurança ou deploy com benefício mensurável.

Escala horizontal exigirá afinidade de sala, registro distribuído, pub/sub e estratégia
de retomada. Isso não deve mudar o domínio nem o protocolo público sem versionamento.

## 16. Testes arquiteturais previstos

- domínio e simulação executam em Node sem DOM ou frameworks;
- regras de importação impedem dependências invertidas;
- cliente adulterado não concede resultado ou progresso;
- mensagens inválidas são rejeitadas;
- reconexão não duplica comandos;
- nenhum acesso a banco ocorre no tick;
- pack de conteúdo pode ser substituído sem alterar regras;
- projeção do telão não contém dados privados;
- benchmark cobre 20 jogadores por arena no hardware-alvo.

## 17. Decisões pendentes

O índice canônico de todas as decisões técnicas pendentes D-001 a D-010 está em
[`decisions.md`](decisions.md). Os tópicos em aberto incluem:

- `pnpm` e Turborepo;
- Fastify em vez de Nest;
- biblioteca e schema do protocolo;
- versão LTS do Node;
- dispositivos de referência;
- limite inicial de espectadores;
- RPO, RTO e retenção;
- primeiro pack de conteúdo original.

Nenhuma dessas propostas autoriza implementação antes da revisão da Fase 0B.
