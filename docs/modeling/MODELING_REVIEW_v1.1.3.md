# VitrineFlex — Relatório de Homologação Final da Modelagem Formal (v1.1.3)

**Documento:** MODELING_REVIEW_v1.1.3.md  
**Data:** 08 de novembro de 2026  
**Status:** Etapa 1.3 (Homologação Final da Modelagem) Concluída — Pacote Homologado para Implementação  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)  
**Baselines Auditadas:** Documento Técnico v1.1, ADR-001 a ADR-008, Pacote de Modelagem Formal v1.1.3

---

## 1. Visão Geral da Homologação Final v1.1.3

A presente revisão (**v1.1.3**) conclui e homologa a modelagem formal da Linha de Produto de Software (LPS) **VitrineFlex**, incorporando os quatro refinamentos residuais solicitados após a aprovação conceitual da versão v1.1.2.

Com esta etapa, a arquitetura atinge prontidão total para codificação:
- A idempotência é formalizada no próprio banco de dados do `Orders Service` via entidade `CheckoutOperation` e no `Payments Service` via `PaymentAttempt`, com controle estrito de concorrência sem filas externas.
- A ambiguidade do cabeçalho `X-Internal-Token` foi terminantemente eliminada: o Gateway atua como filtro de borda e não injeta o segredo em chamadas públicas; apenas clientes internos dos microsserviços anexam a credencial em chamadas para rotas `/internal/v1/*`.
- O Product Backlog teve sua robustez de critérios de aceitação expandida com cenários de falha e resiliência em PB-21 e PB-27, com distinção formal dos estados `UP`, `DOWN` e `NOT_STARTED`.
- Todos os diagramas visuais (PlantUML e Mermaid) foram sincronizados com as operações completas de favoritos (`GET`, `POST`, `DELETE`), comparador exclusivo de Tecnologia e remoção de qualquer menção legada a versões anteriores.

> [!IMPORTANT]
> **GOVERNANÇA TÉCNICA E LIMITES DO ESCOPO:**  
> Esta etapa foi **estritamente documental**.  
> - **NENHUMA** linha de código de aplicação foi implementada.  
> - **NENHUM** microsserviço foi instanciado.  
> - **NENHUMA** dependência ou ferramenta foi instalada.  
> - As decisões arquiteturais **ADR-001 a ADR-008** foram preservadas integralmente.  
> - A baseline técnica **v1.1** foi mantida intacta como fonte de verdade.  
> - A distribuição de Story Points foi preservada rigorosamente em **174 SP** nas 4 Sprints.  
> - Todos os critérios de conclusão (*Definition of Done*) permanecem desmarcados (`[ ]`).  
> - **A Sprint 1 NÃO foi iniciada.**

---

## 2. Detalhamento dos Quatro Ajustes Residuais Implementados

### 2.1 Ajuste 1 — BDD Refinado com Resiliência e Estados de Diagnóstico

No arquivo `docs/modeling/07_PRODUCT_BACKLOG.md`:
1. **PB-21 (Algoritmo de Recomendação):**
   - Adicionado o **Cenário 3 (Falha/Resiliência: Indisponibilidade do Catalog Service na obtenção de candidatos)**.
   - Quando o `Catalog Service` sofre falha de rede ou retorna indisponibilidade temporária na rota `/internal/v1/catalog/stores/{store_id}/products/active`, o `Recommendation Service` captura a falha de forma graciosa, responde com HTTP `200 OK` contendo lista vazia `[]` e flag `degraded: true` (ou HTTP `503 SERVICE_UNAVAILABLE` com código canônico `CATALOG_UNAVAILABLE` quando invocado em modo estrito de API), prevenindo crashes em cascata na vitrine.
   - **Estimativa:** Mantida rigorosamente em **8 Story Points**.
2. **PB-27 (Painel de Diagnóstico de Portas e Serviços):**
   - Adicionado o **Cenário 3 (Falha/Degradação: Identificação de microsserviço com falha DOWN)**.
   - Estabelecida a distinção semântica e visual exata dos três estados de operação:
     - **`UP` (Verde):** Microsserviço ativo, respondendo com código HTTP `200 OK` no endpoint de health check com tempo de resposta em milissegundos.
     - **`DOWN` (Vermelho):** Microsserviço planejado para execução na Sprint ativa, mas que apresentou falha de processo, timeout ou resposta de erro 5xx.
     - **`NOT_STARTED` (Cinza/Neutro):** Microsserviço que ainda não foi desenvolvido ou iniciado na fase atual da Sprint (ex.: os serviços 3 a 9 na Sprint 1), exibindo suas respectivas portas planejadas.
   - **Estimativa:** Mantida rigorosamente em **3 Story Points**.

---

### 2.2 Ajuste 2 — Idempotência Formalizada no Orders Service e Payments Service

Em `docs/modeling/02_LAYERED_ARCHITECTURE.md`, `07_PRODUCT_BACKLOG.md` (PB-18) e `08_SPRINT_BACKLOGS.md`:

#### 2.2.1 Entidade `CheckoutOperation` no Orders Service:
- **Tabela Relacional (`orders.db`):** `checkout_operations`
- **Campos Mínimos e Tipos:**
  - `id`: VARCHAR(36) PRIMARY KEY (UUID da operação)
  - `store_id`: VARCHAR(36) NOT NULL (UUID da loja ativa)
  - `user_id`: VARCHAR(36) NOT NULL (UUID do cliente autenticado)
  - `idempotency_key`: VARCHAR(255) NOT NULL (Chave enviada no cabeçalho `Idempotency-Key`)
  - `request_payload_hash`: VARCHAR(64) NOT NULL (Hash SHA-256 do corpo JSON da requisição)
  - `order_id`: VARCHAR(36) NULL (UUID do pedido, preenchido quando gerado)
  - `saga_status`: VARCHAR(32) NOT NULL (`STARTED`, `INVENTORY_RESERVED`, `PAYMENT_PENDING_CONFIRMATION`, `COMPLETED`, `FAILED`)
  - `created_at`: TIMESTAMP NOT NULL
  - `updated_at`: TIMESTAMP NOT NULL
- **Restrição de Integridade:**
  - `CONSTRAINT uq_checkout_op UNIQUE (store_id, user_id, idempotency_key)`
- **Regras Operacionais e Concorrência:**
  - **Gravação Prévia:** O registro é persistido sob transação imediata `BEGIN IMMEDIATE` antes de chamar o Cart ou o Catalog.
  - **Mesmo identificador e mesmo payload:** Se `COMPLETED`, retorna o pedido já persistido (`200 OK`) sem novo decremento ou chamada ao Payments; se em trânsito, retoma a Saga existente no ponto de interrupção.
  - **Mesmo identificador e payload diferente:** Rejeição imediata com HTTP `409 IDEMPOTENCY_CONFLICT` sem tocar no estoque.
  - **Requisições Simultâneas Concorrentes:** Duas requisições paralelas colidem na restrição de unicidade; a primeira obtém o lock de escrita do SQLite WAL e a segunda é impedida de prosseguir, **garantindo que nunca ocorram dois decrementos de estoque**.

#### 2.2.2 Idempotência no Payments Service:
- **Tabela Relacional (`payments.db`):** `payment_attempts`
- **Restrição de Integridade:** `CONSTRAINT uq_payment_attempt UNIQUE (store_id, idempotency_key)`
- **Tratamento de Concorrência:**
  - Transação `BEGIN IMMEDIATE` no SQLite WAL assegura inserção atômica da tentativa.
  - Se duas requisições simultâneas chegarem com a mesma chave e mesmo payload, a segunda captura a colisão de chave única e retorna o mesmo resultado calculado pela primeira (`APPROVED` ou `DECLINED`), sem duplicar cobranças simuladas.

#### 2.2.3 Diagrama de Sequência Atualizado:
- O diagrama de sequência do checkout em `02_LAYERED_ARCHITECTURE.md` ilustra a persistência prévia de `CheckoutOperation(status='STARTED')`, a reserva atômica de estoque com `X-Internal-Token`, o tratamento de timeout com retenção de estoque e a retomada segura da Saga existente.

---

### 2.3 Ajuste 3 — Resolução Definitiva da Segurança de Borda e `X-Internal-Token`

Em `docs/modeling/02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md` e diagramas:
1. **Filtro de Entrada no API Gateway:**
   - O API Gateway higieniza todas as requisições públicas recebidas do cliente (porta `8000`), removendo sumariamente qualquer cabeçalho forjado (`X-Internal-Token`, `X-User-ID`, `X-User-Role`).
2. **Não-Injeção Indiscriminada de Segredo:**
   - O API Gateway **NÃO** injeta `INTERNAL_SERVICE_KEY` em requisições públicas normais; ele repassa aos microsserviços apenas a identidade confiável do JWT (`X-User-ID`, `X-User-Role`), o contexto de loja (`X-Store-ID`) e o trace (`X-Request-ID`).
3. **Origem do Segredo nos Microsserviços:**
   - Cada microsserviço obtém sua chave `INTERNAL_SERVICE_KEY` diretamente da variável de ambiente do container Docker (`os.environ["INTERNAL_SERVICE_KEY"]`).
4. **Anexação Restrita a Chamadas Internas:**
   - Os clientes HTTP dos microsserviços anexam o cabeçalho `X-Internal-Token: <INTERNAL_SERVICE_KEY>` **exclusivamente** ao disparar chamadas serviço-a-serviço para rotas sob o prefixo `/internal/v1/*`.
5. **Inacessibilidade Externa:**
   - O segredo de serviço nunca é retornado em respostas JSON e permanece totalmente inacessível ao frontend.

---

### 2.4 Ajuste 4 — Sincronização de Diagramas e Versionamento Unificado

1. **Diagrama de Componentes PlantUML (`component-diagram.puml` e `04_COMPONENT_DIAGRAM.md`):**
   - Atualizado para representar explicitamente as operações completas do módulo de favoritos: `GET, POST, DELETE /api/v1/catalog/favorites` com guarda de feature.
   - Comparador de produtos mantido estritamente como `GET /api/v1/catalog/products/compare (Exclusivo TECH & product_comparison: true)`.
   - Ajustadas as dependências de injeção de `SecurityContext`: o Gateway sanitiza cabeçalhos e os microsserviços validam/anexam `X-Internal-Token` em chamadas internas.
2. **Atualização de Comentários e Versões:**
   - Todos os comentários legados que ainda mencionavam `v1.1.1` ou `v1.1.2` foram atualizados para `v1.1.3` em todos os arquivos de diagramas (`component-variability.mmd`, `feature-model.mmd`, `layered-architecture.mmd`, `component-diagram.puml`) e documentos de modelagem.

---

## 3. Matriz de Auditoria e Conformidade Final (v1.1.3)

| Critério de Auditoria | Estado Verificado | Evidência Documental |
|---|:---:|---|
| **29 Histórias com Sucesso e Falha** | **100% Conforme** | Todas as 29 histórias em `07_PRODUCT_BACKLOG.md` possuem cenários Dado/Quando/Então positivos e negativos. |
| **Estimativa Total de 174 SP** | **174 SP Preservados** | Soma estrita: Sprint 1 (34) + Sprint 2 (67) + Sprint 3 (47) + Sprint 4 (26) = 174 SP. Nenhuma alteração individual. |
| **Quatro Sprints Sequenciais** | **100% Conforme** | Sprint 1 (Fundação), Sprint 2 (LPS & Catálogo), Sprint 3 (Checkout Saga), Sprint 4 (Recomendação & Derivação). |
| **Idempotência de Orders e Payments** | **100% Conforme** | Tabelas `checkout_operations` e `payment_attempts` formalizadas com campos, hashes SHA-256 e constraints UNIQUE. |
| **Prevenção de Duplo Decremento** | **100% Conforme** | `UNIQUE(store_id, user_id, idempotency_key)` com lock transacional impede decrementos concorrentes. |
| **Higienização Segura do Gateway** | **100% Conforme** | Remoção de forjamento confirmada; Gateway não injeta segredo indiscriminadamente; microsserviços usam env var. |
| **Consistência dos Contratos** | **100% Conforme** | Contratos de Cart->Catalog, Rec->Catalog, Favoritos (GET/POST/DELETE) e Compare formalizados. |
| **Conformidade com ADR-001 a ADR-008** | **100% Conforme** | Todas as oito ADRs aprovadas são integralmente respeitadas sem contradições. |
| **Definition of Done Desmarcado** | **100% Conforme** | Todos os checkboxes de conclusão em `08_SPRINT_BACKLOGS.md` permanecem rigorosamente `[ ]`. |
| **Status da Implementação** | **NÃO INICIADA** | Nenhum código foi escrito; monorepo aguarda autorização para início da Sprint 1. |

---

## 4. Parecer Conclusivo da Governança

> [!IMPORTANT]
> **PARECER DA AUDITORIA: PACOTE DE MODELAGEM FORMAL v1.1.3 HOMOLOGADO DEFINITIVAMENTE.**  
> Todos os quatro ajustes da Etapa 1.3 foram implementados com rigor matemático, arquitetural e documental.  
> 
> A Linha de Produto de Software **VitrineFlex** possui agora:
> 1. Um modelo de features canônico com validador estrito e formalizado.
> 2. Uma arquitetura de microsserviços com contratos e mecanismos de segurança de borda higienizados.
> 3. Um protocolo de checkout com Saga síncrona, compensação idempotente e proteção contra falhas e concorrência.
> 4. Um backlog de 29 histórias detalhadas com cenários BDD e estimativas calibradas em 174 Story Points.
> 
> **A Sprint 1 NÃO foi iniciada.**  
> O projeto aguarda a autorização formal do usuário para dar início à implementação da Sprint 1.
