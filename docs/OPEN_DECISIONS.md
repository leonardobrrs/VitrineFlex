# VitrineFlex — Decisões Arquiteturais Pendentes (Open Decisions)

**Documento:** Registro de Decisões Arquiteturais Pendentes, Alternativas e Recomendações  
**Data:** 08 de novembro de 2026  
**Status:** Propostas estruturadas para aprovação prévia  
**Referência Principal:** `docs/VitrineFlex_Documento_Tecnico_v1.0.md` e `docs/BASELINE_REVIEW.md`

---

## 1. Visão Geral

Este documento detalha as decisões arquiteturais que se encontram em aberto ou que demandam alinhamento e aprovação antes do início da implementação do projeto **VitrineFlex**. Cada decisão apresenta o problema, as alternativas avaliadas, a recomendação técnica fundamentada, o impacto técnico/acadêmico e o nível de prioridade.

---

## 2. Matriz de Decisões Pendentes

### Decisão 01: Escopo e Alocação de Entidades para Features Opcionais
- **Contexto:** A especificação v1.0 prevê quatro features opcionais (`favorites`, `reviews`, `coupons`, `product_comparison`). Contudo, o modelo de entidades da Seção 10.1 não inclui tabelas para `reviews` nem para `coupons`, e a posse de `favorites` está fragmentada.
- **Alternativas Consideradas:**
  - *Alternativa A (Expandir todos os serviços):* Modelar entidades completas de `Review` no `Catalog Service` e `Coupon` no `Orders Service`, adicionando migrations e endpoints em ambos.
  - *Alternativa B (Foco em variabilidade de alto valor):* Manter no MVP estrito as features opcionais `favorites` (alocada no `Catalog Service` e refletida no `Recommendation Service`) e `product_comparison` (recurso chave da loja de Tecnologia, puramente frontend + atributos de catálogo), enquanto `reviews` e `coupons` permanecem no modelo de features como opcionais previstos, porém com endpoints simulados ou demarcados como extensões de Sprint posterior.
  - *Alternativa C (Eliminar do modelo de features):* Remover `reviews` e `coupons` do modelo de variabilidade da LPS.
- **Recomendação Técnica:** **Alternativa B**. Permite manter a riqueza do modelo de variabilidade da LPS sem inflar o escopo de implementação do núcleo de 9 microsserviços. As entidades de favoritos ficam formalizadas no `Catalog Service` (`ProductFavorite`) e a comparação de produtos aproveita a estrutura existente de `ProductAttribute`.
- **Impacto:** Alto. Evita que o cronograma estoure tentando implementar motores de cupons e moderação de comentários antes do núcleo de compras estar estável.
- **Prioridade:** **Crítica / Alta**.

---

### Decisão 02: Padrão de Roteamento no API Gateway e Resolução de `slug` vs. `store_id`
- **Contexto:** Os contratos da baseline misturam endpoints como `GET /stores/{slug}/configuration` (LPS) e `GET /stores/{slug}/products` (Catálogo), exigindo que o Gateway faça roteamento complexo de sub-rotas e que serviços internos precisem traduzir `slug` para `store_id`.
- **Alternativas Consideradas:**
  - *Alternativa A (Gateway Tradutor Dinâmico):* O Gateway intercepta `/loja/{slug}`, consulta o `LPS Configuration Service`, armazena em cache o `slug -> store_id`, reescreve a URL para `/api/v1/catalog/products` e injeta o header `X-Store-ID`.
  - *Alternativa B (Frontend Resolve Manifesto Primeiro):* Ao carregar a aplicação em `/loja/{slug}`, o frontend solicita `GET /api/v1/lps/stores/{slug}/manifest`. De posse do manifesto, obtém o `store_id` e envia o cabeçalho `X-Store-ID: {uuid}` em todas as requisições subsequentes ao Gateway. O Gateway usa prefixos determinísticos de serviço (`/api/v1/catalog/*`, `/api/v1/cart/*`, etc.).
  - *Alternativa C (Catálogo Duplica Slug):* O banco de dados do Catálogo também replica o campo `slug` da loja e filtra diretamente por ele.
- **Recomendação Técnica:** **Alternativa B**. É a abordagem mais desacoplada, elegante e comum em aplicações SPA modernas. O Gateway permanece leve (*thin gateway*), com regras simples de proxy reverso por prefixo, e o frontend passa a controlar transparentemente o contexto da loja ativa.
- **Impacto:** Alto. Simplifica drasticamente o código do API Gateway e elimina chamadas síncronas desnecessárias entre microsserviços.
- **Prioridade:** **Crítica / Alta**.

---

### Decisão 03: Protocolo de Reserva e Decremento de Estoque no Checkout
- **Contexto:** Na baseline, o `Orders Service` apenas consulta a disponibilidade no `Catalog Service`, mas não há protocolo para reservar ou decrementar o estoque, gerando risco de venda dupla (*race condition*).
- **Alternativas Consideradas:**
  - *Alternativa A (Decremento Imediato no Checkout):* O `Orders Service` solicita baixa imediata de estoque no `Catalog Service` antes do pagamento. Se o pagamento falhar, o pedido chama uma rota de estorno de estoque (`POST /catalog/inventory/release`).
  - *Alternativa B (Reserva com TTL):* O `Orders Service` cria uma reserva temporária (`POST /catalog/inventory/reserve` com expiração de 15 minutos). Ao confirmar o pagamento simulado, a reserva é efetivada (`POST /catalog/inventory/commit`). Se falhar ou expirar, a reserva é liberada.
  - *Alternativa C (Baixa após Pagamento Confirmado):* O estoque só é decrementado após o `Payments Service` retornar aprovado. Se nesse meio tempo o estoque acabar, o pedido é cancelado e estornado.
- **Recomendação Técnica:** **Alternativa A (Compensação Simples)** para o MVP acadêmico. Implementar reserva temporária com TTL exige um agendador/job em background (*cron/celery*) para limpar reservas expiradas, o que adiciona complexidade desnecessária. A compensação síncrona imediata (reserva/baixa no pedido -> estorno se pagamento falhar) garante a consistência do estoque de maneira simples e determinística.
- **Impacto:** Alto. Garante que demonstrações de compras simultâneas mantenham os saldos de estoque estritamente corretos.
- **Prioridade:** **Alta**.

---

### Decisão 04: Mecanismo de Enforcement de Features no Backend
- **Contexto:** A regra fundamental da LPS exige que requisições a funcionalidades desabilitadas sejam bloqueadas pelo backend.
- **Alternativas Consideradas:**
  - *Alternativa A (Consulta HTTP Síncrona a cada Requisição):* Cada microsserviço faz `GET http://lps-service:8002/stores/{store_id}/features` antes de processar operações opcionais.
  - *Alternativa B (Injeção de Features no Header pelo Gateway):* O API Gateway, ao autenticar/rotear, consulta ou mantém em cache local o manifesto da loja e injeta um cabeçalho assinado `X-Store-Features: auth,catalog,cart,product_comparison` para os microsserviços internos.
  - *Alternativa C (Cache Local em Memória nos Microsserviços com TTL):* Cada microsserviço busca o manifesto no `LPS Configuration Service` apenas na primeira requisição daquela loja e o armazena em cache local por 5 minutos (*in-memory dict com timestamp*).
- **Recomendação Técnica:** **Alternativa C (Cache Local com TTL no pacote `python-common`)**. Elimina a dependência de o Gateway virar um nó sobrecarregado e evita sobrecarga de rede no serviço de LPS, garantindo que o backend rejeite com `422/403` qualquer ação desabilitada de forma ultra-rápida.
- **Impacto:** Alto. Assegura que o backend valide a LPS sem sacrificar o desempenho local.
- **Prioridade:** **Alta**.

---

### Decisão 05: Concorrência do SQLite sob FastAPI e Configuração de Persistência
- **Contexto:** O SQLite padrão pode travar em concorrência (`database is locked`) sob chamadas assíncronas do FastAPI.
- **Alternativas Consideradas:**
  - *Alternativa A (Trocar SQLite por PostgreSQL no Docker Compose):* Subir 8 instâncias ou 8 bancos lógicos em um container PostgreSQL central.
  - *Alternativa B (Manter SQLite com Configurações Rígidas de Concorrência):* Manter SQLite (conforme baseline acadêmica), mas obrigar a ativação do modo **WAL**, `busy_timeout = 5000ms`, `journal_size_limit`, e sessões SQLAlchemy com pool dedicado para evitar *thread contention*.
- **Recomendação Técnica:** **Alternativa B**. Respeita rigorosamente a baseline aprovada (SQLite como simplificação acadêmica de execução local sem dependências de infraestrutura pesada), solucionando 100% dos problemas de concorrência com a configuração correta do PRAGMA WAL.
- **Impacto:** Médio. Garante inicialização leve do projeto e compatibilidade direta em qualquer computador.
- **Prioridade:** **Alta**.

---

### Decisão 06: Imutabilidade e Versionamento do `ProductManifest`
- **Contexto:** Como lidar com alterações de features após uma loja já ter produtos e pedidos cadastrados?
- **Alternativas Consideradas:**
  - *Alternativa A (Manifesto Totalmente Mutável):* O administrador pode marcar e desmarcar features a qualquer momento via painel da LPS.
  - *Alternativa B (Manifesto com Imutabilidade de Segmento e Versionamento de Opcionais):* O segmento (`Moda`, `Tech`, `Livros`) é imutável após a criação da loja (pois dita a modelagem e os atributos de produtos já salvos). Features puramente comportamentais/opcionais (ex: permitir cupons, permitir favoritos) podem ser alternadas gerando uma nova versão de manifesto (`version = version + 1`).
  - *Alternativa C (Imutabilidade Estrita):* Uma loja criada tem manifesto congelado. Qualquer mudança de configuração exige a criação de uma nova loja derivada.
- **Recomendação Técnica:** **Alternativa B**. Reflete exatamente a teoria de Linha de Produto de Software: o núcleo de domínio do segmento é estrutural e fixo, enquanto features periféricas opcionais podem ter suas chaves alternadas via versionamento do manifesto.
- **Impacto:** Médio. Evita corrupção de catálogo e preserva a rastreabilidade do produto derivado.
- **Prioridade:** **Média**.

---

### Decisão 07: Estratégia de Autenticação Interna entre Microsserviços
- **Contexto:** Chamadas entre microsserviços (ex: `Orders` chamando `Catalog`, `Shipping` ou `Payments`) precisam de autenticação interna para evitar chamadas forjadas ou acesso indevido sem passar pelo Gateway.
- **Alternativas Consideradas:**
  - *Alternativa A (mTLS - Mutual TLS):* Certificados x509 trocados entre containers Docker.
  - *Alternativa B (Shared Secret Token - `X-Internal-Token`):* Variável de ambiente compartilhada (`INTERNAL_SERVICE_KEY`) injetada via Docker Compose. Os microsserviços exigem esse token em rotas de comunicação interna `/internal/*`.
  - *Alternativa C (Repassar o JWT do Usuário):* O serviço de origem simplesmente encaminha o `Authorization: Bearer <token>` recebido do cliente.
- **Recomendação Técnica:** **Alternativa B combinada com repasse do contexto do usuário (`X-User-ID`, `X-Store-ID`)**. O `mTLS` é complexo demais para o ambiente acadêmico local. O `X-Internal-Token` garante que as rotas internas de baixa de estoque e simulação de pagamento só respondam a requisições originadas dentro da rede Docker.
- **Impacto:** Médio. Cumpre o RNF-03 de segurança sem adicionar sobrecarga operacional de certificados.
- **Prioridade:** **Média**.

---

### Decisão 08: Padronização das Bibliotecas do Frontend e Design System
- **Contexto:** A Seção 12 lista tecnologias como React, TypeScript, Vite e deixa em aberto Tailwind CSS vs. CSS Modules, e React Router + TanStack Query.
- **Alternativas Consideradas:**
  - *Alternativa A (Tailwind CSS + Lucide Icons + TanStack Query + React Router):* Ecossistema padrão de mercado moderno, altamente modular, fácil customização de temas para os 3 produtos derivados via variáveis CSS / classes de tema.
  - *Alternativa B (CSS Modules puros + Fetch nativo):* Reduz dependências de pacotes externos, mas aumenta o esforço manual de estilização e gerenciamento de cache de requisições.
- **Recomendação Técnica:** **Alternativa A**. TanStack Query gerencia perfeitamente o cache e estados de loading/error das chamadas REST; Tailwind CSS permite configurar paletas de cores e identidades visuais dinâmicas para as três vitrines derivadas de maneira extremamente limpa.
- **Impacto:** Médio. Acelera o desenvolvimento da interface e do painel de serviços.
- **Prioridade:** **Média**.

---

## 3. Resumo das Decisões que Exigem Aprovação Prévia

| ID | Tema | Recomendação Proposta | Requer Aval da Equipe/Docente? |
|---|---|---|:---:|
| **ADR-01** | Escopo Features Opcionais | Foco em Favoritos + Comparador no MVP; postergar Cupons e Reviews | Sim |
| **ADR-02** | Roteamento & Gateway | Frontend resolve manifesto primeiro (`/loja/:slug`); Gateway usa prefixos `/api/v1/:service/*` | Sim |
| **ADR-03** | Estoque no Checkout | Baixa imediata de estoque com estorno em caso de falha de pagamento | Sim |
| **ADR-04** | Enforcement de Features | Cache em memória nos microsserviços com bloqueio `422` no backend | Sim |
| **ADR-05** | Persistência Local | Manter SQLite com modo WAL ativado e pool de timeout 5s | Sim |
| **ADR-06** | Mutabilidade Manifesto | Segmento fixo por loja; features opcionais versionadas | Sim |
| **ADR-07** | Segurança Interna | `X-Internal-Token` em rotas internas `/internal/*` | Sim |
| **ADR-08** | Stack Frontend | React + TypeScript + Tailwind CSS + TanStack Query | Sim |
