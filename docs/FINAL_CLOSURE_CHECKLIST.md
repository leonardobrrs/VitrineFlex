# VitrineFlex — Checklist Final de Fechamento Técnico

**Documento:** `docs/FINAL_CLOSURE_CHECKLIST.md`  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software  
**Curso:** Ciência da Computação — Universidade Federal de Alagoas (UFAL 2026.2)  
**Status do Projeto:** 174 / 174 Story Points Entregues (100% das 4 Sprints Concluídas)  
**Data:** 08 de Novembro de 2026  

---

## 1. Tabela de Verificação e Fechamento

Esta tabela consolida os 19 itens de avaliação global do fechamento técnico do projeto VitrineFlex (17 itens **APROVADO**, 1 item **NÃO EXECUTADO** e 1 item **PENDENTE DE VALIDAÇÃO DOCENTE**):

| Item | Resultado | Evidência | Classificação |
|---|---|---|---|
| **1. Arquitetura Monorepo e 9 Microsserviços** | Monorepo estruturado com `apps/web`, 9 microsserviços em `services/` e biblioteca compartilhada `packages/python-common`. | Mapeamento de portas (:8000 a :8008), 8 bancos isolados SQLite WAL nos microsserviços de backend (o API Gateway opera sem banco de dados próprio) e descritores em `infra/`. | **APROVADO** |
| **2. Borda Segura e API Gateway** | Ponto único de entrada, proxy reverso assíncrono, roteamento por prefixos determinísticos e higienização de cabeçalhos proibidos (`X-User-ID`, `X-User-Role`, `X-Internal-Token`). | [`services/api-gateway/src/sanitizer.py`](../services/api-gateway/src/sanitizer.py) e suíte [`tests/test_api_gateway.py`](../tests/test_api_gateway.py). | **APROVADO** |
| **3. Confiança e Contexto do X-Store-ID** | O cliente externo não pode arbitrar `X-Store-ID`. O Gateway extrai o contexto da loja de uma origem validada (path/query/body), sobrescreve o cabeçalho e a rota pública de interações rejeita divergências (`STORE_CONTEXT_MISMATCH`). O produto deve obrigatoriamente pertencer à loja no catálogo (`PRODUCT_STORE_MISMATCH`). | [`tests/test_gateway_auth_integration.py`](../tests/test_gateway_auth_integration.py) com validação de zero persistência no banco para requisições inválidas. | **APROVADO** |
| **4. Autenticação e Perfis (Auth Service)** | Hash de senha com Argon2id e salt aleatório individual, emissão e verificação de JWT e gestão de preferências de categorias de interesse. | [`services/auth-service/src/auth_routes.py`](../services/auth-service/src/auth_routes.py) e testes em [`tests/test_auth_service.py`](../tests/test_auth_service.py). | **APROVADO** |
| **5. Modelagem Formal e Feature Model** | 18 features booleanas explícitas, validação estrita de Cross-Tree Constraints (CTC-01 a CTC-11) e manifestos versionados emitidos com schema v1.0. | [`services/lps-config-service/src/lps_validator.py`](../services/lps-config-service/src/lps_validator.py) e testes em [`tests/test_lps_config_service.py`](../tests/test_lps_config_service.py). | **APROVADO** |
| **6. Catálogo Multissetorial e Variantes** | Suporte tipado aos atributos de Moda (grade/cor/SKU), Tecnologia (specs/garantia) e Livros (ISBN/autor/editora). Baixa atômica e restauração idempotente de estoque. | [`services/catalog-service/src/catalog_routes.py`](../services/catalog-service/src/catalog_routes.py) e testes em [`tests/test_catalog_service.py`](../tests/test_catalog_service.py). | **APROVADO** |
| **7. Carrinho Isolado Multi-loja** | Carrinho de compras isolado por `(store_id, user_id)`, subtotal em centavos e endpoints canônicos internos para consumo do Orders. | [`services/cart-service/src/cart_routes.py`](../services/cart-service/src/cart_routes.py) e testes em [`tests/test_cart_service.py`](../tests/test_cart_service.py). | **APROVADO** |
| **8. Processador de Pagamentos Simulado** | Métodos PIX, Cartão e Boleto validados contra o manifesto da loja, controle de idempotência via Compare-And-Swap (CAS) e simulação de recusa e timeout. | [`services/payments-service/src/payments_routes.py`](../services/payments-service/src/payments_routes.py) e testes em [`tests/test_payments_service.py`](../tests/test_payments_service.py). | **APROVADO** |
| **9. Frete Determinístico e Modalidades** | Cotação por CEP e distância, com validação de modalidades (retirada presencial vs entrega) contra o manifesto da loja. | [`services/shipping-service/src/shipping_routes.py`](../services/shipping-service/src/shipping_routes.py) e testes em [`tests/test_shipping_service.py`](../tests/test_shipping_service.py). | **APROVADO** |
| **10. Saga de Checkout Orquestrada** | Orquestração pelo Orders Service com compensação síncrona imediata em caso de recusa de pagamento, retenção em caso de timeout de rede e idempotência estrita via entidade `CheckoutOperation`. | [`services/orders-service/src/saga_orchestrator.py`](../services/orders-service/src/saga_orchestrator.py) e testes em [`tests/test_sprint3_saga_integration.py`](../tests/test_sprint3_saga_integration.py). | **APROVADO** |
| **11. Snapshots Imutáveis de Pedidos** | Gravação de histórico de status e snapshots imutáveis de endereço e itens faturados no banco `orders.db`. | [`services/orders-service/src/orders_routes.py`](../services/orders-service/src/orders_routes.py) e testes em [`tests/test_orders_service.py`](../tests/test_orders_service.py). | **APROVADO** |
| **12. Idempotência e Concorrência de Recomendações** | Índice parcial único no SQLite (`uq_interaction_dedup_ref`), deduplicação de 10 chamadas simultâneas via `asyncio.gather`, detecção de conflitos de referência e suporte a múltiplas visualizações sem referência. | [`services/recommendation-service/src/recommendation_routes.py`](../services/recommendation-service/src/recommendation_routes.py) e testes em [`tests/test_sprint4_recommendations_and_e2e.py`](../tests/test_sprint4_recommendations_and_e2e.py). | **APROVADO** |
| **13. Recomendação Explicável e Janela Temporal** | Algoritmo formal de afinidade ($score = 4I + \min(5P, 15) + \min(3F, 9) + \min(V, 5) + 2T$), janela de 30 dias para visualizações recentes e fallback cold start. | [`tests/test_sprint4_recommendations_and_e2e.py`](../tests/test_sprint4_recommendations_and_e2e.py). | **APROVADO** |
| **14. Frontend SPA React + TypeScript** | Composição dinâmica por manifestos (MDCC), injeção de CSS Variables por loja, carrossel de recomendações e painel de diagnóstico `/diagnostics`. | Compilação limpa via `npm --prefix apps/web run build` em 4.20s (1.553 módulos transformados). | **APROVADO** |
| **15. Concorrência na Última Unidade de Estoque** | 5 threads disparando checkout simultâneo sobre 1 unidade física em SQLite WAL. Exatamente 1 pedido aprovado, 4 rejeitados por falta de estoque e zero overselling. | [`tests/test_sprint4_recommendations_and_e2e.py`](../tests/test_sprint4_recommendations_and_e2e.py). | **APROVADO** |
| **16. Três Produtos Demonstrativos Derivados** | Vitrine Moda (`vitrine-moda`), Vitrine Tech (`vitrine-tech`) e Vitrine Books (`vitrine-books`) operacionais com catálogos, regras e identidades contrastantes. | Script [`scripts/seed_demo_stores.py`](../scripts/seed_demo_stores.py) e testes em [`tests/test_sprint2_e2e_integration.py`](../tests/test_sprint2_e2e_integration.py). | **APROVADO** |
| **17. Suíte Completa de Testes Automatizados** | 65 testes automatizados aprovados sem regressões. | Execução via `.venv\Scripts\pytest -v` (65 passed, 1 warning, 61.62s). | **APROVADO** |
| **18. Execução Operacional em Contêineres Docker** | Inicialização em contêineres Docker reais via `docker compose up --build`. | Docker CLI indisponível no ambiente host Windows (`docker : O termo 'docker' não é reconhecido`). Critério mantido desmarcado no DoD da Sprint 1. | **NÃO EXECUTADO** |
| **19. Homologação Docente Final** | Parecer de homologação formal emitido pelo professor da disciplina UFAL 2026.2. | Todo o repositório, evidências e relatórios encontram-se prontos e submetidos à apreciação acadêmica. | **PENDENTE DE VALIDAÇÃO DOCENTE** |

---

## 2. Resumo da Contabilidade Final

- **Story Points Planejados:** 174 SP
- **Story Points Implementados:** 174 SP (100%)
  - Sprint 1: 34 SP
  - Sprint 2: 67 SP
  - Sprint 3: 47 SP
  - Sprint 4: 26 SP
- **Histórias de Usuário:** 29 histórias entregues (PB-01 a PB-29)
- **Critérios de Conclusão das Sprints (DoD):** 25 critérios no total, sendo **24 validados (`[x]`)** e **1 não executado (`[ ]`)**
  - Sprint 1: 6 critérios (5 validados, 1 não executado)
  - Sprint 2: 6 critérios (6 validados)
  - Sprint 3: 8 critérios (8 validados)
  - Sprint 4: 5 critérios (5 validados)
- **Itens da Checklist de Fechamento Técnico:** 19 itens avaliados (**17 APROVADOS**, **1 NÃO EXECUTADO**, **1 PENDENTE DE VALIDAÇÃO DOCENTE**)
- **Suíte de Testes Automatizados:** 65 testes aprovados (100% de sucesso, 1 warning)
- **Frontend Build:** 1.553 módulos transformados, 0 erros TypeScript
