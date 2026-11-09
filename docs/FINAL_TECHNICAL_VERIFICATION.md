# VitrineFlex — Relatório de Verificação Técnica Final Pré-Homologação Docente

**Documento:** `docs/FINAL_TECHNICAL_VERIFICATION.md`  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software  
**Curso:** Ciência da Computação — Universidade Federal de Alagoas (UFAL 2026.2)  
**Status do Projeto:** 174 / 174 Story Points Entregues (100% das 4 Sprints Concluídas)  
**Data:** 08 de Novembro de 2026  

---

## 1. Verificações Realizadas

| Item | Verificação | Classificação | Justificativa / Evidência |
|---|---|---|---|
| **1.1** | Inicialização e integridade do índice de idempotência no SQLite | **APROVADO** | Confirmado no schema do banco que o índice `uq_interaction_dedup_ref` é `UNIQUE`, parcial (`WHERE reference_id IS NOT NULL`) e criado via DDL idempotente tanto em bancos novos quanto existentes. |
| **1.2** | Concorrência de 10 chamadas simultâneas com mesmo `reference_id` | **APROVADO** | 10 chamadas paralelas via `asyncio.gather` resultam em exatamente 1 registro gravado no banco e todas as 10 respostas retornam o mesmo ID de interação. |
| **1.3** | Detecção de conflito de chave de referência com produto divergente | **APROVADO** | Tentativa de reaproveitar `reference_id` com outro `product_id` resulta em `HTTP 409 REFERENCE_ID_CONFLICT` com integridade preservada no banco. |
| **1.4** | Múltiplas visualizações legítimas (`VIEW`) com `reference_id` nulo | **APROVADO** | Inserção de múltiplos eventos de navegação `VIEW` sem referência é permitida sem colisão de índice e confirmada no banco com contagem exata. |
| **1.5** | Independência de eventos legítimos com chaves distintas | **APROVADO** | Eventos distintos de favoritos e compras com identificadores de referência próprios são registrados individualmente sem deduplicação indevida. |
| **1.6** | Isolamento de loja e proteção contra sobrescrita de contexto | **APROVADO** | Divergência entre o cabeçalho seguro do Gateway (`X-Store-ID`) e o corpo da requisição (`store_id`) é rejeitada com `HTTP 400 STORE_CONTEXT_MISMATCH`. O Gateway sobrescreve/higieniza `X-Store-ID` a partir da origem validada. |
| **1.7** | Validação de produto e catálogo interlojas | **APROVADO** | O serviço consulta o Catalog Service antes de gravar interações públicas, rejeitando produtos inexistentes (`HTTP 404 PRODUCT_NOT_FOUND`) e produtos de outras lojas (`HTTP 400 PRODUCT_STORE_MISMATCH`). |
| **1.8** | Janela temporal explícita de visualizações recentes ($V$) | **APROVADO** | Implementada janela temporal explícita de 30 dias (`cutoff = now - timedelta(days=30)`). Visualizações com mais de 30 dias não pontuam em $V$; visualizações dentro da janela são pontuadas. |
| **1.9** | Execução e orquestração de microsserviços em Docker | **NÃO EXECUTADO** | O utilitário Docker CLI não está instalado no host de desenvolvimento. Arquivos de infraestrutura foram elaborados conforme a especificação arquitetural, mas a execução operacional conteinerizada não foi validada. |
| **1.10** | Preservação da contabilidade e baseline (174 SP / 29 histórias) | **APROVADO** | Nenhuma sprint 5 foi criada, nenhum ponto foi alterado e nenhuma funcionalidade externa foi adicionada. |

---

## 2. Testes Executados e Resultados

### 2.1. Resumo Quantitativo
- **Total de testes automatizados:** 65 testes.
- **Aprovados:** 65 (100%).
- **Falhas:** 0.
- **Warnings:** 1 (StarletteDeprecationWarning referente à biblioteca de teste `httpx`).
- **Tempo de execução:** 57.20 segundos.

### 2.2. Distribuição dos Testes por Módulo
| Suíte de Testes | Arquivo | Testes | Status |
|---|---|---|---|
| **API Gateway & Roteamento** | `tests/test_api_gateway.py` | 4 | APROVADO |
| **Auth Service & Identidade** | `tests/test_auth_service.py` | 4 | APROVADO |
| **Cart Service & Isolamento** | `tests/test_cart_service.py` | 4 | APROVADO |
| **Catalog Service & Atômico** | `tests/test_catalog_service.py` | 8 | APROVADO |
| **Gateway & Auth Integration** | `tests/test_gateway_auth_integration.py` | 2 | APROVADO |
| **LPS Config & Manifestos** | `tests/test_lps_config_service.py` | 5 | APROVADO |
| **Manifest Provider Cache** | `tests/test_manifest_provider.py` | 1 | APROVADO |
| **Orders Service & Snapshots** | `tests/test_orders_service.py` | 2 | APROVADO |
| **Payments Service & Idempotência** | `tests/test_payments_service.py` | 7 | APROVADO |
| **Python Common & WAL/Argon2** | `tests/test_python_common.py` | 5 | APROVADO |
| **Shipping Service & Cotações** | `tests/test_shipping_service.py` | 3 | APROVADO |
| **Sprint 2 E2E & Concorrência** | `tests/test_sprint2_e2e_integration.py` | 2 | APROVADO |
| **Sprint 3 Saga Integration** | `tests/test_sprint3_saga_integration.py` | 6 | APROVADO |
| **Sprint 4 Recomendação, E2E & WAL** | `tests/test_sprint4_recommendations_and_e2e.py` | 12 | APROVADO |
| **Total Acumulado** | **14 arquivos de teste** | **65** | **100% APROVADO** |

### 2.3. Compilação do Frontend SPA (React + TypeScript)
- **Comando:** `npm --prefix apps/web run build`
- **Resultado:** Código de retorno 0.
- **Módulos transformados:** 1.553 módulos compilados pelo Vite v5.4.21 em 3.17 segundos.
- **Erros de tipagem TypeScript:** 0 erros.

---

## 3. Problemas Encontrados

Durante o diagnóstico detalhado da auditoria técnica final pré-homologação docente, foram identificados os seguintes problemas específicos:

1. **Importação Tardia de Metadados no Banco de Recomendações:**  
   Em `recommendation_database.py`, `Base.metadata.create_all(bind=engine)` era chamado sem importar previamente `recommendation_models`. Se `init_db()` fosse invocado a partir de um script ou processo que não importou a rota previamente, a tabela `user_interactions` não constava no registro do SQLAlchemy.
2. **Potencial Sobrescrita de Contexto de Loja em Rota Pública:**  
   Em `recommendation_routes.py`, a rota pública `/api/v1/recommendations/interactions` utilizava a lógica `target_store_id = req.store_id or x_store_id`. Caso um atacante enviasse `X-Store-ID: store-fashion` no cabeçalho e `store_id: store-tech` no corpo JSON, o corpo sobrescrevia o cabeçalho injetado pela borda sem qualquer validação de inconsistência.
3. **Ausência de Validação do Pertencimento do Produto à Loja:**  
   A rota pública de interações aceitava registrar eventos `VIEW` contendo `product_id` arbitrário, sem verificar se o identificador realmente correspondia a um produto cadastrado e se este produto pertencia à loja alvo indicada.
4. **Subespecificação Temporal da Métrica de Visualizações Recentes ($V$):**  
   A documentação e os requisitos mencionavam "visualizações recentes do produto pelo cliente", contudo a consulta comportamental contabilizava indistintamente todas as visualizações desde o início dos registros.

---

## 4. Correções Efetuadas

Todas as correções foram implementadas e verificadas pontualmente, preservando integralmente os contratos e a arquitetura:

1. **Garantia de Registro de Metadados no SQLite:**  
   Adicionado `import recommendation_models # noqa: F401` em `recommendation_database.py`, assegurando que `UserInteraction` e o índice parcial `uq_interaction_dedup_ref` sejam sempre registrados em `Base.metadata` e persistidos no banco.
2. **Proteção contra Divergência de Contexto de Loja:**  
   Modificada a rota `register_public_interaction` em `recommendation_routes.py` para verificar se `req.store_id` diverge de `x_store_id`. Em caso de conflito, rejeita imediatamente com `HTTP 400 STORE_CONTEXT_MISMATCH`.
3. **Validação Ativa de Produto no Catálogo:**  
   Na rota `register_public_interaction`, implementada chamada interna ao `Catalog Service` (`/internal/v1/catalog/products/{product_id}`). Retorna `HTTP 404 PRODUCT_NOT_FOUND` se o produto não existir e `HTTP 400 PRODUCT_STORE_MISMATCH` se o produto pertencer a outra loja.
4. **Janela Temporal Explícita para Visualizações Recentes:**  
   Implementada a constante configurável `RECENT_VIEWS_WINDOW_DAYS = 30` em `recommendation_routes.py`. A contagem de visualizações recentes ($V$) agora filtra estritamente eventos com `created_at >= now - timedelta(days=30)`.
5. **Expansão da Cobertura de Testes Automatizados:**  
   - Em `tests/test_sprint4_recommendations_and_e2e.py`:
     - Expandido `test_recommendation_idempotency_concurrency_and_conflict_audit` para 10 chamadas concorrentes com `asyncio.gather`.
     - Criado `test_recommendation_store_isolation_and_product_validation` cobrindo divergência de contexto, produto trocado de loja, produto inexistente e interação válida.
     - Criado `test_recommendation_recent_views_temporal_window` comprovando que visualizações de 45 dias atrás não pontuam em $V$, enquanto visualizações de 2 dias atrás pontuam normalmente.

---

## 5. Limitações Remanescentes

1. **Ambiente Local sem Docker Daemon / CLI:**  
   A máquina host de desenvolvimento não possui o binário `docker` instalado. A declaração `infra/docker-compose.yml` e os respectivos `Dockerfile` foram confeccionados conforme a especificação arquitetural, mas a execução operacional em contêineres reais permanece não executada.
2. **Processamento Financeiro Simulado:**  
   O `Payments Service` implementa controle transacional, idempotência estrita via Compare-And-Swap e simulação determinística de recusa e timeout, operando em escopo acadêmico sem integração a gateways bancários externos em produção.
3. **Persistência Mononó em SQLite WAL:**  
   O SQLite em modo Write-Ahead Logging atende perfeitamente ao escopo da LPS multitenant acadêmica, mas limita escritas simultâneas a um único processo gravador por arquivo com espera ativa (`busy_timeout`). Para escala elástica horizontal multi-host, recomenda-se transição para PostgreSQL dedicado.

---

## 6. Evidências de Execução

### 6.1. Verificação da Indisponibilidade do Docker CLI
```powershell
PS> docker --version; docker compose version
docker : O termo 'docker' não é reconhecido como nome de cmdlet, função, arquivo de script ou programa operável.
```

### 6.2. Execução da Suíte de 65 Testes Automatizados (Pytest)
```text
============================= test session starts =============================
platform win32 -- Python 3.15.0, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\Users\Leonardo\Desktop\2026.2\TÓP EM ENG DE SOFTWARE - PROJETANDO LINHAS DE PROD DE SOFTWARE\projeto\VitrineFlex
configfile: pytest.ini
plugins: anyio-4.16.0, asyncio-1.4.1.post1
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 65 items

tests/test_api_gateway.py ....                                           [  6%]
tests/test_auth_service.py ....                                          [ 12%]
tests/test_cart_service.py ....                                          [ 18%]
tests/test_catalog_service.py ........                                   [ 30%]
tests/test_gateway_auth_integration.py ..                                [ 33%]
tests/test_lps_config_service.py .....                                   [ 41%]
tests/test_manifest_provider.py .                                        [ 43%]
tests/test_orders_service.py ..                                          [ 46%]
tests/test_payments_service.py .......                                   [ 56%]
tests/test_python_common.py .....                                        [ 64%]
tests/test_shipping_service.py ...                                       [ 69%]
tests/test_sprint2_e2e_integration.py ..                                 [ 72%]
tests/test_sprint3_saga_integration.py ......                            [ 81%]
tests/test_sprint4_recommendations_and_e2e.py ............               [100%]

======================= 65 passed, 1 warning in 57.20s ========================
```

### 6.3. Compilação do Frontend SPA em React + TypeScript
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

---

## 7. Parecer Técnico Final

| Dimensão Avaliada | Classificação | Parecer |
|---|---|---|
| **Arquitetura de Microsserviços e Borda Segura** | **APROVADO** | Borda higieniza cabeçalhos, isola contexto seguro via JWT e roteia 9 microsserviços especializados com validação de `X-Store-ID`. |
| **Modelagem Formal da LPS e Feature Model** | **APROVADO** | 18 features booleanas validadas pelo validador formal com Cross-Tree Constraints ativas. |
| **Isolamento Multitenant e Integridade de Dados** | **APROVADO** | Validação em runtime de contexto de loja e pertinência de produtos ao catálogo, com separação de bancos SQLite WAL por serviço. |
| **Saga de Checkout e Concorrência de Estoque** | **APROVADO** | Saga orquestrada com compensação síncrona; teste de concorrência com 5 threads disputando 1 unidade aprovado com zero overselling e zero deadlocks. |
| **Idempotência e Concorrência em Recomendações** | **APROVADO** | Índice parcial único no SQLite atestado; 10 requisições simultâneas deduplicadas com sucesso; detecção de conflitos de referência funcional. |
| **Motor de Recomendação Explicável e Janela Recente** | **APROVADO** | Fórmula determinística rigorosamente respeitada, com janela de 30 dias para visualizações recentes e fallback cold start. |
| **Qualidade e Cobertura de Testes** | **APROVADO** | 65 testes automatizados aprovados sem regressões; frontend SPA compilado sem erros TypeScript. |
| **Ambiente Conteinerizado em Docker** | **NÃO EXECUTADO** | CLI do Docker ausente no ambiente do host; execução operacional em contêineres permanece não executada; validação funcional realizada via ASGI/Uvicorn e Pytest local. |
| **Homologação Acadêmica Final** | **PENDENTE DE VALIDAÇÃO DOCENTE** | Todo o código, artefatos e evidências estão prontos e submetidos à apreciação e avaliação exclusiva do professor titular da disciplina UFAL 2026.2. |
