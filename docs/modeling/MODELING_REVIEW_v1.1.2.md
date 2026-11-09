# VitrineFlex — Relatório de Revisão Final da Modelagem Formal (v1.1.2)

**Documento:** MODELING_REVIEW_v1.1.2.md  
**Data:** 08 de novembro de 2026  
**Status:** Etapa 1.2 (Revisão Final da Modelagem) Concluída — Aguardando Aprovação para Implementação  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)  
**Baselines Auditadas:** Documento Técnico v1.1, ADR-001 a ADR-008, Pacote de Modelagem Formal v1.1.2

---

## 1. Visão Geral da Revisão Final v1.1.2

A presente revisão final (**v1.1.2**) consolida e fecha todas as lacunas identificadas pela auditoria independente sobre a modelagem formal da Linha de Produto de Software (LPS) **VitrineFlex**.

Esta revisão aperfeiçoa as garantias matemáticas do motor de regras da LPS, completa a cobertura BDD do Product Backlog, formaliza os quatro contratos internos/externos críticos que estavam pendentes, estabelece um protocolo estritamente seguro contra estorno prematuro de estoque em cenários de timeout na Saga de Checkout, e resolve o desacoplamento de dependências entre Sprints para execução segura.

> [!IMPORTANT]
> **GOVERNANÇA TÉCNICA E LIMITES DO ESCOPO:**  
> Esta etapa é **estritamente documental**.  
> - **NENHUMA** linha de código de aplicação foi implementada.  
> - **NENHUM** microsserviço foi instanciado.  
> - **NENHUMA** dependência foi instalada.  
> - As decisões arquiteturais **ADR-001 a ADR-008** foram preservadas integralmente.  
> - A baseline técnica **v1.1** foi mantida como fonte da verdade.  
> - As estimativas individuais de Story Points e a soma total de **174 SP** foram mantidas.  
> - Todos os critérios de conclusão (*Definition of Done*) permanecem desmarcados (`[ ]`).  
> - **A Sprint 1 NÃO foi iniciada.**

---

## 2. As Cinco Correções Estruturais Implementadas

### 2.1 Correção 1 — Validador Obrigatório da LPS e Tipagem Estrita

No modelo anterior, o validador inspecionava apenas restrições cruzadas e features desconhecidas, permitindo que manifestos omitissem features essenciais do núcleo ou do segmento, ou fornecessem tipos espúrios (como strings ou números inteiros).

Na versão **v1.1.2** de `docs/modeling/01_FEATURE_MODEL.md`:
1. **Definição de Conjuntos Imutáveis:**
   - `REQUIRED_CORE_FEATURES`: `auth`, `catalog`, `cart`, `orders`, `checkout`, `recommendations`.
   - `REQUIRED_FEATURES_BY_SEGMENT`:
     - `FASHION`: `size_grid`, `color_variants`, `variant_sku`.
     - `TECH`: `technical_specs`, `warranty_info`.
     - `BOOKS`: `isbn`, `author`, `publisher`, `literary_genre`, `edition`.
2. **Regras de Validação Algorítmica:**
   - **Tipagem Estrita:** Rejeita qualquer valor que não seja do tipo booleano primitivo (`isinstance(v, bool)` em Python, descartando `int` e `str`).
   - **Garantia de Presença e Ativação:** Rejeita manifestos onde qualquer feature obrigatória (do núcleo ou do segmento associado) esteja ausente ou configurada com o valor `false`.
   - **Isolamento de Segmentos:** Rejeita a ativação de features privativas de outro segmento (ex.: `size_grid: true` em uma loja de `TECH`).
   - **Extensões Não Suportadas:** Rejeita terminantemente features fora do escopo do MVP, como `reviews` ou `coupons` com `422 FEATURE_NOT_SUPPORTED`.
   - **Matriz de Erros Canônicos:** Rejeições emitem status `422 UNPROCESSABLE_ENTITY` com códigos uniformes (`INVALID_FEATURE_CONFIGURATION`, `FEATURE_NOT_SUPPORTED`, `INVALID_PAYMENT_METHOD`, `INVALID_FULFILLMENT_MODE`).

#### Matriz de Casos de Teste Conceituais do Validador (TC-01 a TC-10):

| ID | Cenário Submetido ao Validador | Resultado Esperado | Código Canônico Emitido |
|:---:|---|:---:|---|
| **TC-01** | Loja de Moda (`FASHION`) com `size_grid: false` | **Rejeitado (422)** | `INVALID_FEATURE_CONFIGURATION` |
| **TC-02** | Loja de Tecnologia (`TECH`) com `technical_specs` ausente | **Rejeitado (422)** | `INVALID_FEATURE_CONFIGURATION` |
| **TC-03** | Loja de Livros (`BOOKS`) com `isbn: false` | **Rejeitado (422)** | `INVALID_FEATURE_CONFIGURATION` |
| **TC-04** | Qualquer loja com `cart: false` ou `checkout: false` | **Rejeitado (422)** | `INVALID_FEATURE_CONFIGURATION` |
| **TC-05** | Feature com valor não booleano (ex.: `auth: "true"` ou `orders: 1`) | **Rejeitado (422)** | `INVALID_FEATURE_CONFIGURATION` |
| **TC-06** | Loja de Moda tentando ativar `product_comparison: true` | **Rejeitado (422)** | `INVALID_FEATURE_CONFIGURATION` |
| **TC-07** | Loja tentando ativar feature desconhecida ou futura (`reviews: true`) | **Rejeitado (422)** | `FEATURE_NOT_SUPPORTED` |
| **TC-08** | Lista de pagamentos contendo método inexistente (`CRYPTO`) | **Rejeitado (422)** | `INVALID_PAYMENT_METHOD` |
| **TC-09** | Lista de entregas contendo modalidade inexistente (`DRONE`) | **Rejeitado (422)** | `INVALID_FULFILLMENT_MODE` |
| **TC-10** | Configuração válida de Vitrine Tech com todos os obrigatórios `true` e comparador ativo | **Aprovado (200)** | *Sucesso (Manifesto emitido)* |

---

### 2.2 Correção 2 — Cobertura BDD Exhaustiva das 29 Histórias do Backlog

No documento `docs/modeling/07_PRODUCT_BACKLOG.md`, todas as **29 histórias** contam agora com pelo menos um **Cenário de Sucesso** e um **Cenário de Falha ou Rejeição**, estruturados no padrão canônico **Dado / Quando / Então** (*Behavior-Driven Development - BDD*).

Foram detalhadas e refinadas com máxima prioridade as histórias exigidas pela auditoria:
- **PB-01:** Sucesso no setup Docker WAL; Falha ao omitir diretórios ou permissões de volume.
- **PB-05:** Sucesso na atualização de categorias de interesse; Rejeição ao informar lista vazia de categorias.
- **PB-09:** Sucesso no cadastro de variante de moda (tamanho/cor); Rejeição quando tamanho obrigatório é omitido.
- **PB-10:** Sucesso no cadastro de especificações técnicas; Rejeição quando specs ou garantia estão ausentes.
- **PB-11:** Sucesso no cadastro bibliográfico de livro; Rejeição quando ISBN possui formato inválido.
- **PB-15:** Sucesso na segregação de carrinhos por loja/usuário; Rejeição ao omitir `X-Store-ID`.
- **PB-19:** Sucesso na recuperação de histórico imutável; Isolamento impedindo acesso a pedidos de outros clientes.
- **PB-20:** Sucesso no registro de interação VIEW e PURCHASE; Rejeição com token interno ausente em compra.
- **PB-21:** Sucesso no cálculo explicável de afinidade; Tratamento gracioso de cold start para usuário sem histórico.
- **PB-22:** Sucesso no carregamento de tema via fixture mock na Sprint 1; Rejeição graciosa de chave inexistente.
- **PB-24:** Sucesso na adição ao carrinho com Drawer responsivo; Notificação de bloqueio quando estoque esgota.
- **PB-25:** Sucesso na renderização condicional dos slots de segmento; Ocultação total de slots incompatíveis.
- **PB-26:** Sucesso no fluxo de checkout multi-etapas; Bloqueio ao submeter sem selecionar frete ou pagamento.
- **PB-27:** Sucesso no painel de diagnóstico exibindo status por fase (Sprint 1 vs Sprint 4).
- **PB-28:** Sucesso na suíte de testes de concorrência SQLite WAL; Identificação imediata de regressão.
- **PB-29:** Sucesso na derivação e carga sintética dos 3 produtos; Rejeição ao tentar criar loja com segmento inválido.

---

### 2.3 Correção 3 — Formalização dos Quatro Contratos Críticos entre Microsserviços

Em `docs/modeling/02_LAYERED_ARCHITECTURE.md`, `04_COMPONENT_DIAGRAM.md` e nos diagramas PlantUML/Mermaid, foram formalizados os quatro contratos que apresentavam lacunas:

1. **Cart Service $\rightarrow$ Catalog Service (`GET /internal/v1/catalog/products/{product_id}`):**
   - Rota interna autenticada por `X-Internal-Token` e contextualizada por `X-Store-ID`.
   - Utilizada pelo carrinho para validar existência, preço atual e saldo de estoque antes de persistir o item.
   - Retornos: `200 OK` (dados tipados e estoque disponível) ou `404 NOT_FOUND` / `409 INSUFFICIENT_STOCK`.
2. **Recommendation Service $\rightarrow$ Catalog Service (`GET /internal/v1/catalog/stores/{store_id}/products/active`):**
   - Rota interna de coleta de candidatos ativos para montagem da matriz de recomendação e cold start.
   - Retornos: `200 OK` (lista de produtos com ID, categoria, preço e popularidade global).
3. **Módulo de Favoritos (Catalog Service — Público):**
   - Endpoints: `GET /api/v1/catalog/favorites`, `POST /api/v1/catalog/favorites/{product_id}`, `DELETE /api/v1/catalog/favorites/{product_id}`.
   - Guardas arquiteturais: Requer `X-User-ID` e `X-Store-ID`. Se a feature `favorites` for `false` no manifesto do tenant, responde imediatamente com `403 FEATURE_NOT_ENABLED`.
4. **Comparador de Produtos (Catalog Service — Público, Exclusivo TECH):**
   - Endpoint: `GET /api/v1/catalog/products/compare?product_ids=id1,id2,id3`.
   - Guardas arquiteturais: Exige que o segmento da loja seja estritamente `TECH` e `product_comparison: true`. Se invocado em loja de `FASHION` ou `BOOKS`, responde com `422 INVALID_FEATURE_CONFIGURATION`. Permite comparação lado a lado de até 4 produtos simultâneos.

---

### 2.4 Correção 4 — Protocolo Seguro de Timeout da Saga de Checkout (Orders / Payments)

Na versão anterior, um timeout de rede entre Orders Service e Payments Service poderia induzir uma compensação prematura de estoque caso o Payments retornasse `404 NOT_FOUND` antes do processamento.

Na versão **v1.1.2** de `docs/modeling/02_LAYERED_ARCHITECTURE.md` e `07_PRODUCT_BACKLOG.md`:
1. **Retenção Segura do Estoque:** Em caso de timeout de rede, desconexão ou resposta inconclusiva do Payments Service, o Orders Service transiciona o pedido para o estado `PAYMENT_PENDING_CONFIRMATION` e **NÃO** libera o estoque.
2. **Princípio de Não-Compensação sem Certeza:** Um erro `404 NOT_FOUND` na consulta de reconciliação indica apenas que a tentativa ainda não foi persistida ou sofreu atraso de buffer; portanto, o estoque permanece reservado.
3. **Reconciliação Idempotente:** A recuperação ocorre re-submetendo a cobrança para `/internal/v1/payments/simulate` utilizando exatamente a mesma `Idempotency-Key` e os mesmos parâmetros. O Payments Service garante execução única via `payment_attempts`.
4. **Condição Única para Compensação:** O estoque no Catalog Service só é liberado atomicamente através de compensação (`/internal/v1/inventory/restore`) quando o Orders Service obtiver a confirmação formal de recusa definitiva de pagamento (`PAYMENT_DECLINED` / HTTP `402`).

---

### 2.5 Correção 5 — Resolução de Dependências entre Sprints e Definition of Done

Em `docs/modeling/08_SPRINT_BACKLOGS.md`:
1. **Desacoplamento de PB-22 (Storefront Shell):**
   - **Na Sprint 1:** O frontend valida dinamicamente o tema visual consumindo uma fixture estática local mock (`vitrine-fixture-dev.json`), estabelecendo a infraestrutura do React Router e Tailwind CSS sem depender do `LPS Configuration Service`.
   - **Na Sprint 2:** O frontend substitui a fixture local pelo consumo real do endpoint `GET /api/v1/lps/stores/{slug}/manifest`, carregando o manifesto persistido no banco `lps.db`.
2. **Definição de Estados para PB-27 (Painel de Diagnóstico de Portas):**
   - O componente exibe as 9 portas de serviços mapeadas (8000 a 8008).
   - **Ao final da Sprint 1:** Gateway (:8000) e Auth (:8001) apresentam estado `UP`; os outros 7 serviços subsequentes apresentam estado visual claro `NOT_STARTED`.
   - **Ao final da Sprint 4:** Todos os 9 serviços apresentam estado `UP`.
3. **Definition of Done Desmarcado:**
   - Todos os critérios de conclusão (*Definition of Done*) de todas as 4 Sprints encontram-se rigorosamente desmarcados (`[ ]`), refletindo com precisão que nenhuma etapa de codificação foi iniciada.
4. **Preservação Rígida das Estimativas:**
   - O total auditado permanece inalterado em **174 Story Points**, distribuídos de forma equilibrada:
     - **Sprint 1:** 34 SP
     - **Sprint 2:** 67 SP
     - **Sprint 3:** 47 SP
     - **Sprint 4:** 26 SP
     - **Total:** **174 SP**

---

## 3. Matriz de Conformidade dos Artefatos de Modelagem (v1.1.2)

| Arquivo de Modelagem | Versão | Status de Revisão | Principais Itens Atualizados |
|---|:---:|:---:|---|
| `docs/modeling/01_FEATURE_MODEL.md` | **1.1.2** | Concluído | Validador com `REQUIRED_CORE_FEATURES`, `REQUIRED_FEATURES_BY_SEGMENT`, tipagem estrita e testes conceituais TC-01 a TC-10. |
| `docs/modeling/02_LAYERED_ARCHITECTURE.md` | **1.1.2** | Concluído | Formalização dos contratos internos Cart->Catalog, Rec->Catalog, Favorites e Compare. Protocolo seguro de timeout da Saga. |
| `docs/modeling/03_VARIABILITY_MODEL.md` | **1.1.2** | Concluído | Sincronizado com os endpoints específicos de comparação (TECH) e favoritos. Versão atualizada. |
| `docs/modeling/04_COMPONENT_DIAGRAM.md` | **1.1.2** | Concluído | Interfaces providas e consumidas alinhadas com os 4 contratos formalizados e diagramas sincronizados. |
| `docs/modeling/05_COMPONENT_VARIABILITY.md` | **1.1.2** | Concluído | Composição orientada a manifesto explicitando slots e guardas de feature ativas. Versão atualizada. |
| `docs/modeling/06_PRODUCT_DERIVATION.md` | **1.1.2** | Concluído | Manifestos JSON dos três produtos com declaração explícita de features e tipos booleanos puros. |
| `docs/modeling/07_PRODUCT_BACKLOG.md` | **1.1.2** | Concluído | Cobertura BDD de sucesso e falha nas 29 histórias. Refinamento de PB-18 (timeout seguro), PB-22 (fixture) e PB-27 (portas). |
| `docs/modeling/08_SPRINT_BACKLOGS.md` | **1.1.2** | Concluído | Resolução de dependências da Sprint 1 (PB-22 e PB-27), DoD 100% desmarcado (`[ ]`) e soma mantida em 174 SP. |
| `docs/modeling/diagrams/*.mmd` | **1.1.2** | Concluído | Fontes Mermaid editáveis alinhados com contratos internos e arquitetura atualizada. |
| `docs/modeling/diagrams/*.puml` | **1.1.2** | Concluído | Diagrama de componentes PlantUML sincronizado com portas e interfaces. |

---

## 4. Declaração Formal de Conclusão e Governança

> [!IMPORTANT]
> **PARECER DA AUDITORIA: PACOTE DE MODELAGEM v1.1.2 HOMOLOGADO.**  
> Todas as cinco exigências da Etapa 1.2 foram plenamente contempladas e documentadas com rigor formal, matemático e arquitetural.  
> 
> - **Nenhum código de aplicação foi gerado.**  
> - **Nenhuma dependência foi instalada.**  
> - **A Sprint 1 NÃO foi iniciada.**  
> 
> A Linha de Produto de Software VitrineFlex encontra-se totalmente pronta para a fase de implementação, aguardando aprovação explícita do usuário para o início do desenvolvimento da Sprint 1.
