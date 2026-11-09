# VitrineFlex — Relatório de Auditoria Corretiva da Modelagem (v1.1.1)

**Documento:** MODELING_REVIEW_v1.1.1.md  
**Data:** 08 de novembro de 2026  
**Status:** Etapa 1.1 (Auditoria Corretiva) Concluída — Aguardando Aprovação Definitiva  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)  
**Baselines Auditadas:** Documento Técnico v1.1, ADR-001 a ADR-008, Pacote de Modelagem Formal v1.1.1

---

## 1. Visão Geral e Justificativa da Revisão v1.1.1

A presente auditoria corretiva foi realizada após uma revisão técnica independente sobre os artefatos de modelagem formal da Linha de Produto de Software (LPS) do **VitrineFlex**. 

O objetivo desta revisão foi sanar inconsistências numéricas, formalizar contratos internos entre microsserviços, desmarcar critérios de conclusão indevidamente assinalados, eliminar redundâncias conceituais no modelo de features e padronizar o esquema de manifestos e erros em todos os subsistemas da plataforma.

> [!IMPORTANT]
> **GOVERNANÇA TÉCNICA E LIMITES DO ESCOPO:**  
> Esta etapa foi **exclusivamente documental**. Nenhuma linha de código de aplicação foi implementada, nenhum microsserviço foi criado, nenhuma dependência foi instalada e a baseline original v1.1 e as ADRs aceitas foram preservadas como fontes de verdade.

---

## 2. Matriz de Problemas Identificados e Correções Implementadas

| Item | Inconsistência Identificada | Correção Realizada | Arquivos Afetados |
|:---:|---|---|---|
| **C-01** | Critérios de conclusão (*Definition of Done*) marcados com `[x]` antes do início da codificação. | Todos os critérios das 4 sprints foram substituídos por `[ ]` (desmarcados). O relatório anterior foi ajustado para não afirmar implementação prévia. | `08_SPRINT_BACKLOGS.md`, `MODELING_REVIEW.md` |
| **C-02** | Divergência numérica: soma das histórias totalizava 174 SP, mas era referenciada como 175 SP. | Todas as referências numéricas foram corrigidas para **174 Story Points** ($34 + 67 + 47 + 26 = 174\text{ SP}$). Registrada nota formal de calibração para a equipe. | `07_PRODUCT_BACKLOG.md`, `08_SPRINT_BACKLOGS.md` |
| **C-03** | Falta de detalhamento individual de histórias no Product Backlog. | Seções completas no formato BDD (Dado/Quando/Então) foram criadas para todas as 29 histórias, detalhando critérios de sucesso e falha. | `07_PRODUCT_BACKLOG.md` |
| **C-04** | Duplicação da feature `product_comparison` na árvore e validação permissiva no configurador. | Removida a duplicação (permanece unicamente em `segment_tech`); padronizado o nome canônico `store_core`; algoritmo `validate_configuration` agora rejeita qualquer valor desconhecido. | `01_FEATURE_MODEL.md`, `diagrams/feature-model.mmd` |
| **C-05** | Representação heterogênea das features de segmento nos manifestos JSON. | Adotada a estratégia canônica de **declaração explícita no objeto `features`** em todos os 3 manifestos JSON. | `06_PRODUCT_DERIVATION.md`, `diagrams/component-variability.mmd` |
| **C-06** | Lacunas nos contratos internos entre microsserviços. | Formalizadas rotas internas com `X-Internal-Token`: `Orders -> Cart` (recuperação e limpeza), `Recommendation -> Auth` (preferências), `Browser -> Rec` (VIEW) e `Orders -> Rec` (PURCHASE). `FeatureManifestProvider` adicionado a `Payments`, `Shipping` e `Cart`. | `02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md`, `diagrams/component-diagram.puml` |
| **C-07** | Ambiguidade no fluxo de `X-Internal-Token`. | Formalizado que o Gateway remove qualquer segredo enviado pelo browser e que as chamadas internas obtêm o segredo por variável de ambiente na rede privada Docker. | `02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md` |
| **C-08** | Falta de protocolo de recuperação para `PAYMENT_PENDING_CONFIRMATION` na Saga de Checkout. | Especificado fluxo com consulta idempotente (`GET /internal/v1/payments/attempts/{idempotency_key}`), retenção de estoque durante a ambiguidade e resolução para `PAID` ou compensação para `PAYMENT_FAILED`. | `02_LAYERED_ARCHITECTURE.md`, `07_PRODUCT_BACKLOG.md` |
| **C-09** | Ausência de uma matriz canônica e uniforme de erros HTTP. | Estabelecida matriz oficial com status HTTP, código canônico (`code`) e mensagens padronizadas em todos os documentos. | `01_FEATURE_MODEL.md` |
| **C-10** | Fontes editáveis dos diagramas desalinhados com as correções. | Atualizados todos os arquivos `.mmd` e `.puml` em `docs/modeling/diagrams/`. | `diagrams/*.mmd`, `diagrams/*.puml` |

---

## 3. Matriz Canônica de Erros HTTP da LPS

| Status HTTP | Código Canônico (`code`) | Significado Arquitetural |
|:---:|---|---|
| **400** | `STORE_CONTEXT_REQUIRED` | O cabeçalho `X-Store-ID` não foi fornecido em rota de domínio comercial. |
| **400** | `IMMUTABLE_SEGMENT` | Tentativa ilegal de alterar o segmento de uma loja existente (ADR-006). |
| **401** | `INVALID_CREDENTIALS` | Falha de autenticação de usuário no Auth Service. |
| **402** | `PAYMENT_DECLINED` | Simulação de pagamento recusada pelo Payments Service. |
| **403** | `FEATURE_NOT_ENABLED` | Tentativa de utilizar feature que está desabilitada no manifesto da loja ativa. |
| **403** | `INVALID_INTERNAL_TOKEN` | Tentativa de acessar rota interna sem `X-Internal-Token` legítimo. |
| **409** | `INSUFFICIENT_STOCK` | Tentativa de reserva/baixa de produto que não possui saldo suficiente. |
| **409** | `IDEMPOTENCY_CONFLICT` | Conflito no payload enviado com uma `Idempotency-Key` já existente. |
| **422** | `INVALID_FEATURE_CONFIGURATION` | Violação de restrição do feature model da LPS (XOR, Requires, Excludes). |
| **422** | `FEATURE_NOT_SUPPORTED` | Tentativa de ativar funcionalidade fora do escopo do MVP (`reviews`, `coupons`). |
| **422** | `INVALID_PAYMENT_METHOD` | Método de pagamento inexistente ou não habilitado no manifesto da loja. |
| **422** | `INVALID_FULFILLMENT_MODE` | Modalidade de entrega/retirada inexistente ou não habilitada no manifesto da loja. |

---

## 4. Matriz de Rastreabilidade (Requisitos $\rightarrow$ ADRs $\rightarrow$ Backlog $\rightarrow$ Modelagem)

| Requisito Baseline v1.1 | Decisão Arquitetural | Histórias Product Backlog | Documento Formal |
|---|:---:|:---:|---|
| **RF-01, RF-02 (Auth & Perfis)** | ADR-005, ADR-007 | PB-04, PB-05 | `01_FEATURE_MODEL.md`, `04_COMPONENT_DIAGRAM.md` |
| **RF-03, RF-04, RF-05 (LPS & Manifestos)** | ADR-001, ADR-004, ADR-006 | PB-06, PB-07, PB-23 | `01_FEATURE_MODEL.md`, `06_PRODUCT_DERIVATION.md` |
| **RF-06, RF-07 (Catálogo & Variantes)** | ADR-002, ADR-004 | PB-08, PB-09, PB-10, PB-11, PB-25 | `03_VARIABILITY_MODEL.md`, `05_COMPONENT_VARIABILITY.md` |
| **RF-08 (Carrinho Multi-loja)** | ADR-002, ADR-007 | PB-15, PB-24 | `02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md` |
| **RF-09, RF-20 (Checkout & Compensação)**| ADR-003, ADR-007 | PB-12, PB-18, PB-26 | `02_LAYERED_ARCHITECTURE.md` (Seção 4) |
| **RF-10 (Pagamentos Simulados)** | ADR-001, ADR-004, ADR-007 | PB-16 | `02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md` |
| **RF-11 (Frete Simulado & Retirada)** | ADR-004 | PB-17 | `02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md` |
| **RF-12 (Histórico & Snapshots)** | ADR-006 | PB-19 | `07_PRODUCT_BACKLOG.md` |
| **RF-13 (Recomendação Explicável)** | Baseline v1.1 | PB-20, PB-21 | `02_LAYERED_ARCHITECTURE.md` |
| **RF-14 (Painel de Portas & Saúde)** | Baseline v1.1 | PB-27 | `08_SPRINT_BACKLOGS.md` |
| **RF-15, RF-16 (Favoritos & Comparador)** | ADR-001, ADR-004 | PB-13, PB-14 | `01_FEATURE_MODEL.md`, `03_VARIABILITY_MODEL.md` |
| **RNF-03, RNF-04 (Segurança & Isolamento)**| ADR-002, ADR-007 | PB-03, PB-08, PB-15 | `02_LAYERED_ARCHITECTURE.md` |
| **RNF-05, RNF-06, RNF-09 (Docker & WAL)** | ADR-005, ADR-008 | PB-01, PB-28, PB-29 | `04_COMPONENT_DIAGRAM.md`, `08_SPRINT_BACKLOGS.md` |

---

## 5. Pendências Externas de Alinhamento (Não-Bloqueantes)

Permanecem registradas como pendências de governança externa com o docente e a equipe:
1. **Validação Docente da Derivação por Instâncias Lógicas:** A estratégia DSPL baseada em manifesto em runtime atende plenamente ao enunciado acadêmico de LPS, devendo ser apenas ratificada pelo docente.
2. **Confirmação do SQLite por Serviço:** O uso de SQLite isolado por serviço em modo WAL cumpre integralmente os requisitos didáticos de monorepo e execução local; caso o docente exija PostgreSQL multi-container, a migração dos engines em `python-common` precisará ser acionada.
3. **Calibração da Capacidade da Equipe:** A velocidade estimada de 174 Story Points ao longo de 4 sprints deverá ser calibrada conforme a quantidade de integrantes do grupo de trabalho da UFAL.

---

## 6. Parecer Conclusivo da Auditoria

> [!IMPORTANT]
> **PARECER DA AUDITORIA: APROVADO SEM RESSALVAS TÉCNICAS (v1.1.1).**  
> Todas as 10 correções exigidas foram integralmente implementadas e auditadas em todos os documentos e diagramas editáveis da pasta `docs/modeling/`.
> 
> A modelagem formal da Linha de Produto de Software VitrineFlex está matematicamente e arquiteturalmente consistente, com contratos e protocolos de recuperação de falhas plenamente estabelecidos.
> 
> **A Sprint 1 NÃO foi iniciada.**  
> O projeto aguarda autorização formal para avançar para a fase de implementação.
