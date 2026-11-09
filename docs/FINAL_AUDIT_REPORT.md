# VitrineFlex — Relatório Final de Auditoria Técnica e Fechamento do Projeto

**Documento:** `docs/FINAL_AUDIT_REPORT.md`  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software  
**Curso:** Ciência da Computação — Universidade Federal de Alagoas (UFAL 2026.2)  
**Status do Projeto:** 174 / 174 Story Points Entregues (100% das 4 Sprints Concluídas)  
**Data:** 08 de Novembro de 2026  

---

## 1. Funcionalidades Implementadas

Ao longo das quatro Sprints planejadas na baseline v1.1.3, o projeto VitrineFlex entregou **29 histórias de usuário**, totalizando exatamente **174 Story Points**, organizados na seguinte estrutura arquitetural e de domínio:

### 1.1. Core da LPS e Modelo de Variabilidade
- **Feature Model com 18 Features Booleanas:** Formalizado em `docs/modeling/01_FEATURE_MODEL.md` e auditado pelo validador formal `lps_validator.py` com aplicação rigorosa das restrições cruzadas (CTC-01 a CTC-11).
- **Três Vitrines Derivadas Operacionais:**
  1. **Vitrine Moda** (`store-fashion`, slug `vitrine-moda`):
     - Segmento: Vestuário.
     - Features ativas: `size_grid`, `color_variants`, `variant_sku`, `favorites`.
     - Features desativadas: `technical_specs`, `warranty_info`, `product_comparison`, `isbn`, `author`, `publisher`, `literary_genre`, `edition`.
     - Políticas: Pagamento via PIX e Cartão de Crédito; Entrega em domicílio e Retirada presencial.
  2. **Vitrine Tech** (`store-tech`, slug `vitrine-tech`):
     - Segmento: Eletrônicos e Informática.
     - Features ativas: `technical_specs`, `warranty_info`, `product_comparison`, `favorites`.
     - Features desativadas: Toda a grade de vestuário e atributos bibliográficos.
     - Políticas: Pagamento via PIX, Cartão de Crédito e Boleto Bancário; Apenas entrega em domicílio.
  3. **Vitrine Books** (`store-books`, slug `vitrine-books`):
     - Segmento: Livraria e Publicações.
     - Features ativas: `isbn`, `author`, `publisher`, `literary_genre`, `edition`.
     - Features desativadas: Grade de vestuário, especificações técnicas, `product_comparison` (proibido por restrição) e `favorites` (desativado por política da loja).
     - Políticas: Pagamento via PIX e Boleto Bancário; Entrega em domicílio e Retirada presencial.

### 1.2. Topologia de 9 Microsserviços Especializados
- **API Gateway (:8000):** Proxy reverso assíncrono com roteamento inteligente, sanitização agressiva de cabeçalhos (`X-User-ID`, `X-User-Role`, `X-Internal-Token`), autenticação JWT com injeção de contexto seguro e Painel de Diagnóstico do Sistema (`/api/v1/system/services`, PB-27).
- **Auth Service (:8001):** Gestão de identidades com criptografia Argon2id, emissão e validação de tokens JWT, persistência em `auth.db` (SQLite WAL) e gestão de preferências de categorias do usuário (`preferences`).
- **LPS Configuration Service (:8002):** Catálogo formal de features, validador de restrições de domínio, cadastro de lojas e emissão de manifestos versionados (`ProductManifest`) sob o endpoint `/api/v1/lps/stores/{slug}/manifest`.
- **Catalog Service (:8003):** Catálogo segmentado de produtos e variantes, controle transacional de estoque atômico, gestão de favoritos com contrato canônico (POST, GET, DELETE) e comparador de especificações técnicas.
- **Cart Service (:8004):** Carrinhos de compras isolados por `(store_id, user_id)`, controle de itens e quantidades, cálculo de subtotal em centavos e endpoints canônicos internos para integração do checkout (`/internal/v1/cart/{store_id}/{user_id}`).
- **Orders Service (:8005):** Orquestrador da Saga de checkout com compensação síncrona imediata, controle de concorrência com lease expiration / Compare-And-Swap (CAS), entidade `CheckoutOperation` com hash de payload SHA-256 para idempotência estrita, e snapshots imutáveis de endereço e itens faturados.
- **Payments Service (:8006):** Simulador de transações financeiras com suporte aos métodos PIX, Cartão e Boleto conforme o manifesto da loja, controle de idempotência estrita via `IdempotencyOperation` com CAS, e simulação determinística de recusa e timeout.
- **Shipping Service (:8007):** Mecanismo de cotação de frete determinístico por faixas de CEP e validação de modalidades de entrega (`standard`, `express`, `pickup`) contra o manifesto da loja.
- **Recommendation Service (:8008):** Ingestão de eventos comportamentais (`VIEW`, `FAVORITE`, `PURCHASE`) com garantia de idempotência via índice parcial único (`store_id`, `event_type`, `reference_id`), proteção estrita de contexto de loja (`STORE_CONTEXT_MISMATCH`), validação de existência e pertencimento do produto ao catálogo (`PRODUCT_NOT_FOUND`, `PRODUCT_STORE_MISMATCH`), janela temporal explícita de 30 dias para visualizações recentes ($V$), motor de pontuação explicável com fórmula ponderada e fallback gracioso de cold start para visitantes anônimos.

### 1.3. Frontend SPA em React + TypeScript
- Composição dinâmica orientada a manifestos (*Manifest-Driven Component Composition* — MDCC).
- Injeção dinâmica de CSS Variables para theming por loja (cores primárias, secundárias e background).
- Painel visual de diagnósticos `/diagnostics` integrando o monitor de portas e estados de microsserviços.
- Carrossel de recomendações explicáveis integrado nas páginas das vitrines.

---

## 2. Funcionalidades Testadas

A cobertura de testes automatizados contempla **65 cenários formais**, implementados com `pytest` e `pytest-asyncio`, validando ponta a ponta todos os requisitos funcionais e não-funcionais:

### 2.1. Variabilidade e Validação Formal da LPS
- Restrições cruzadas (CTC-01 a CTC-11): obrigatoriedade das 6 features core, restrições mútuas de segmentos, rejeição de features fora do escopo homologado (HTTP 422).
- Isolamento estrito de catálogos e carrinhos entre lojas e usuários distintos.
- Respeito às políticas de pagamento e entrega ativadas/desativadas em cada vitrine.

### 2.2. Concorrência e Persistência SQLite WAL
- **Disputa Concorrente da Última Unidade de Estoque (PB-28):** 5 threads disparando checkout simultâneo para um produto com exatamente 1 unidade em estoque. Resultado auditado: 1 pedido concluído com sucesso (`status = PAID`), 4 pedidos rejeitados com `HTTP 409 INSUFFICIENT_STOCK`, estoque final exatamente 0 (zero overselling), nenhum deadlock no banco WAL.
- **Concorrência em Pagamentos e Recomendações:** Disparos paralelos com 10 requisições simultâneas (`asyncio.gather`) e threads protegidas por Compare-And-Swap (CAS) e índice parcial único no banco SQLite WAL.

### 2.3. Idempotência e Resiliência
- **Idempotência de Checkout em Orders:** Mesma `Idempotency-Key` com o mesmo payload recupera a operação original; mesma chave com payload alterado gera rejeição `HTTP 409 IDEMPOTENCY_CONFLICT`.
- **Idempotência em Pagamentos:** Controle de lease ativo por 30 segundos, bloqueando requisições duplicadas em processamento e retornando snapshot consistente em requisições repetidas concluídas.
- **Idempotência e Concorrência em Recomendações:** 10 chamadas concorrentes com mesmo payload recuperam o mesmo registro (1 gravação única no banco); detecção de divergência de payload gerando `HTTP 409 REFERENCE_ID_CONFLICT`; múltiplas visualizações legítimas sem referência aceitas; e eventos distintos com referências diferentes não deduplicados.
- **Isolamento de Loja e Janela Temporal:** Rejeição de requisições com divergência de loja (`STORE_CONTEXT_MISMATCH`), validação de produto no catálogo (`PRODUCT_NOT_FOUND` / `PRODUCT_STORE_MISMATCH`), e validação de que visualizações antigas (> 30 dias) são excluídas de $V$.
- **Saga de Checkout:**
  - Fluxo com pagamento aprovado -> pedido `PAID`, estoque baixado, carrinho limpo e evento comportamental emitido.
  - Fluxo com pagamento recusado -> pedido `PAYMENT_FAILED` e compensação síncrona imediata restaurando o estoque no Catalog Service.
  - Fluxo com timeout de rede -> pedido retido em `PAYMENT_PENDING_CONFIRMATION` com estoque preservado para reconciliação segura (sem compensação prematura).

### 2.4. Segurança de Borda
- Higienização de cabeçalhos no API Gateway: tentativa de forjamento externo de `X-User-ID`, `X-User-Role` ou `X-Internal-Token` é bloqueada e descartada.
- Validação criptográfica do token JWT injetando as credenciais seguras na malha interna de microsserviços.
- Injeção e validação do contexto confiável de loja (`X-Store-ID`), impedindo escolha arbitrária pelo cliente externo e rejeitando divergências.

---

## 3. Evidências de Execução

### 3.1. Saída da Suíte Completa de Testes Automatizados (Pytest)
Executado em ambiente local com interpretador Python 3.15 via comando `.venv\Scripts\pytest -v`:

```text
============================= test session starts =============================
platform win32 -- Python 3.15.0, pytest-9.2.0, pluggy-1.7.0 -- C:\Users\Leonardo\Desktop\2026.2\TÓP EM ENG DE SOFTWARE - PROJETANDO LINHAS DE PROD DE SOFTWARE\projeto\VitrineFlex\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\Leonardo\Desktop\2026.2\TÓP EM ENG DE SOFTWARE - PROJETANDO LINHAS DE PROD DE SOFTWARE\projeto\VitrineFlex
configfile: pytest.ini
plugins: anyio-4.16.0, asyncio-1.4.1.post1
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collecting ... collected 65 items

tests/test_api_gateway.py::test_gateway_health PASSED                    [  1%]
tests/test_api_gateway.py::test_diagnostics_lists_all_nine_services PASSED [  3%]
tests/test_api_gateway.py::test_header_sanitization_removes_forged_headers PASSED [  4%]
tests/test_api_gateway.py::test_header_sanitization_injects_trusted_user_from_jwt PASSED [  6%]
tests/test_auth_service.py::test_auth_health PASSED                      [  7%]
tests/test_auth_service.py::test_user_register_and_login_success PASSED  [  9%]
tests/test_auth_service.py::test_user_login_invalid_credentials PASSED   [ 10%]
tests/test_auth_service.py::test_user_preferences_lifecycle PASSED       [ 12%]
tests/test_cart_service.py::test_cart_health PASSED                      [ 14%]
tests/test_cart_service.py::test_cart_isolation_by_user_and_store_pb15 PASSED [ 15%]
tests/test_cart_service.py::test_cart_item_update_delete_and_clear_pb15 PASSED [ 17%]
tests/test_cart_service.py::test_internal_cart_canonical_endpoints_for_orders PASSED [ 18%]
tests/test_catalog_service.py::test_catalog_health PASSED                [ 20%]
tests/test_catalog_service.py::test_products_creation_and_segment_attributes PASSED [ 21%]
tests/test_catalog_service.py::test_store_isolation_pb08 PASSED          [ 23%]
tests/test_catalog_service.py::test_atomic_inventory_decrement_and_idempotent_restore_pb12 PASSED [ 25%]
tests/test_catalog_service.py::test_favorites_management_pb13 PASSED     [ 26%]
tests/test_catalog_service.py::test_product_comparison_pb14 PASSED       [ 28%]
tests/test_catalog_service.py::test_canonical_favorites_contract_pb13 PASSED [ 29%]
tests/test_catalog_service.py::test_variant_stock_management_and_multi_item_idempotency_pb12 PASSED [ 31%]
tests/test_gateway_auth_integration.py::test_full_gateway_to_auth_integration_with_header_sanitization PASSED [ 32%]
tests/test_gateway_auth_integration.py::test_gateway_to_recommendations_store_trust_and_isolation_integration PASSED [ 33%]
tests/test_lps_config_service.py::test_lps_health PASSED                 [ 34%]
tests/test_lps_config_service.py::test_feature_catalog_endpoint PASSED   [ 35%]
tests/test_lps_config_service.py::test_lps_validation_rules PASSED       [ 37%]
tests/test_lps_config_service.py::test_store_derivation_and_manifest_versioning PASSED [ 39%]
tests/test_lps_config_service.py::test_canonical_manifest_endpoint_and_exact_18_boolean_features PASSED [ 40%]
tests/test_manifest_provider.py::test_manifest_provider_cache_and_expiration PASSED [ 42%]
tests/test_orders_service.py::test_orders_health PASSED                  [ 43%]
tests/test_orders_service.py::test_orders_listing_isolation_and_immutable_snapshots_pb19 PASSED [ 45%]
tests/test_payments_service.py::test_payments_health PASSED              [ 46%]
tests/test_payments_service.py::test_payment_methods_enabled_and_disabled_in_manifest_pb16 PASSED [ 48%]
tests/test_payments_service.py::test_payment_strict_idempotency_pb16 PASSED [ 50%]
tests/test_payments_service.py::test_simulated_payment_scenarios_rejection_and_timeout_pb16 PASSED [ 51%]
tests/test_payments_service.py::test_concurrent_payment_requests_wal PASSED [ 53%]
tests/test_payments_service.py::test_canonical_payments_endpoints_with_auth PASSED [ 54%]
tests/test_payments_service.py::test_payment_safe_recovery_and_cas_lease_cases PASSED [ 56%]
tests/test_python_common.py::test_sqlite_wal_pragmas PASSED              [ 57%]
tests/test_python_common.py::test_argon2id_password_hashing PASSED       [ 59%]
tests/test_python_common.py::test_jwt_token_lifecycle PASSED             [ 60%]
tests/test_python_common.py::test_jwt_token_invalid PASSED               [ 62%]
tests/test_python_common.py::test_validate_internal_token PASSED         [ 64%]
tests/test_shipping_service.py::test_shipping_health PASSED              [ 65%]
tests/test_shipping_service.py::test_shipping_quote_and_manifest_modalities_pb17 PASSED [ 67%]
tests/test_shipping_service.py::test_unsupported_fulfillment_mode_rejected_pb17 PASSED [ 68%]
tests/test_sprint2_e2e_integration.py::test_derivation_of_three_segments_and_cataloging PASSED [ 70%]
tests/test_sprint2_e2e_integration.py::test_concurrent_inventory_decrements_no_overselling PASSED [ 71%]
tests/test_sprint3_saga_integration.py::test_checkout_saga_approved_flow_pb18 PASSED [ 73%]
tests/test_sprint3_saga_integration.py::test_checkout_saga_payment_declined_and_synchronous_compensation_pb18 PASSED [ 75%]
tests/test_sprint3_saga_integration.py::test_checkout_saga_payment_timeout_retains_inventory_pb18 PASSED [ 76%]
tests/test_sprint3_saga_integration.py::test_checkout_idempotency_divergent_payload_conflict PASSED [ 78%]
tests/test_sprint3_saga_integration.py::test_multi_item_order_independent_reservations PASSED [ 79%]
tests/test_sprint3_saga_integration.py::test_saga_lease_concurrency_and_safe_recovery PASSED [ 81%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_health PASSED [ 82%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_interactions_public_and_internal_pb20 PASSED [ 84%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_idempotency_concurrency_and_conflict_audit PASSED [ 85%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_store_isolation_and_product_validation PASSED [ 87%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_recent_views_temporal_window PASSED [ 89%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_algorithm_affinity_formula_and_explainability_pb21 PASSED [ 90%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_cold_start_fallback_pb21 PASSED [ 92%]
tests/test_sprint4_recommendations_and_e2e.py::test_recommendation_catalog_unavailability_resilience_pb21 PASSED [ 93%]
tests/test_sprint4_recommendations_and_e2e.py::test_variability_feature_restrictions_three_segments_pb28 PASSED [ 95%]
tests/test_sprint4_recommendations_and_e2e.py::test_timeout_semantics_retains_stock_without_premature_compensation_pb28 PASSED [ 96%]
tests/test_sprint4_recommendations_and_e2e.py::test_saga_lease_downstream_delay_stale_executor_cannot_commit_pb28 PASSED [ 98%]
tests/test_sprint4_recommendations_and_e2e.py::test_concurrent_checkout_last_unit_five_threads_wal_pb28 PASSED [100%]

============================== warnings summary ===============================
..\..\..\..\..\..\..\Python315\Lib\importlib\__init__.py:88
  C:\Python315\Lib\importlib\__init__.py:88: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    return _bootstrap._gcd_import(name[level:], package, level)

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================= 65 passed, 1 warning in 57.20s ========================
```

### 3.2. Saída da Compilação do Frontend SPA (Vite / TypeScript)
Executado via comando `npm --prefix apps/web run build`:

```text
> vitrineflex-web@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 1553 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.54 kB │ gzip:  0.36 kB
dist/assets/index-C4hbIFqG.css   35.82 kB │ gzip:  6.59 kB
dist/assets/index-ENNO4WDc.js   309.54 kB │ gzip: 88.43 kB
✓ built in 3.17s
```

### 3.3. Script de Carga e Inicialização das Vitrines Demonstrativas
O script `scripts/seed_demo_stores.py` povoa as três vitrines canônicas no banco `lps.db` e `catalog.db`:
- Cria os usuários base (cliente de moda, cliente de tech, cliente de livros).
- Registra as 3 lojas (`vitrine-moda`, `vitrine-tech`, `vitrine-books`) com suas respectivas matrizes de 18 features booleanas.
- Cadastra os produtos e variantes de cada segmento (camisetas/vestidos com grade P/M/G e cores; smartphones e notebooks com garantia e ficha técnica; livros clássicos e técnicos com ISBN e editora).

---

## 4. Limitações Não Resolvidas

Por transparência técnica e rigor acadêmico, registram-se as limitações conhecidas da implementação atual:

1. **Ausência do Binário Docker CLI no Host de Desenvolvimento:**  
   O arquivo `infra/docker-compose.yml` e os respectivos arquivos `Dockerfile` de cada microsserviço foram implementados conforme a especificação arquitetural de portas (:8000 a :8008) e redes privadas. Entretanto, por não haver o executável do Docker CLI disponível no ambiente host Windows utilizado, os testes funcionais foram executados localmente via ASGI/Uvicorn e Pytest, enquanto a execução operacional em contêineres Docker permanece não executada.
2. **Processamento Financeiro Simulado:**  
   O `Payments Service` implementa a semântica rigorosa de estados de pagamento, idempotência com CAS e validação de métodos habilitados, mas opera como uma simulação em memória/banco SQLite WAL. Não há integração externa com gateways de pagamento em produção (como Stripe, Adyen ou Pagar.me), por se tratar de escopo estritamente acadêmico.
3. **Escalabilidade da Persistência SQLite WAL em Ambientes Distribuídos:**  
   O SQLite configurado com WAL (`PRAGMA journal_mode = WAL;`) garante excelente vazão de leitura e previne corrupção de concorrência com espera ativa (`PRAGMA busy_timeout = 5000;`). No entanto, a gravação permanece limitada a um único escritor por arquivo de banco. Para implantações de larga escala com réplicas dinâmicas de microsserviços em Kubernetes, faz-se necessária a transição para um SGBD cliente-servidor distribuído (como PostgreSQL).

---

## 5. Pendências de Validação Docente

A presente entrega cumpre 100% das exigências contratuais, técnicas e documentais registradas nas baselines do projeto. Permanecem como pendências exclusivamente acadêmicas:

1. **Apresentação e Arguição Final:** Submissão do código-fonte, suíte de testes e documentações à banca examinadora e ao professor da disciplina para avaliação das rubricas da disciplina.
2. **Alinhamento do Mecanismo de Derivação da LPS:** Homologação formal com o docente acerca da aceitação do mecanismo de **derivação lógica em tempo de execução dirigida por manifestos (MDCC)** em comparação com abordagens alternativas baseadas em geradores de código pré-compilados.
3. **Assinatura e Homologação Final:** Emissão do parecer de homologação definitiva da disciplina **Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)**.
