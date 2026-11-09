# VitrineFlex — Relatório de Revisão da Modelagem Formal da LPS

**Documento:** MODELING_REVIEW.md  
**Data:** 08 de novembro de 2026  
**Status:** Etapa 1 (Modelagem Formal) Concluída — Aguardando Aprovação para Implementação  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)  
**Baseline Técnica de Referência:** `docs/modeling/docs/VitrineFlex_Documento_Tecnico_v1.1.md` e ADRs 001 a 008

---

## 1. Objetivo e Escopo da Revisão

Este documento apresenta o parecer técnico e a validação formal do pacote de modelagem da Linha de Produto de Software (LPS) **VitrineFlex** (Etapa 1). O objetivo é certificar que toda a documentação estrutural, comportamental e de planejamento atende com rigor às exigências teóricas da disciplina, respeita as decisões arquiteturais aprovadas (ADR-001 a ADR-008) e estabelece uma base sólida, sem contradições, para as etapas subsequentes de implementação.

---

## 2. Checklist de Validação Formal

A auditoria da modelagem cobriu os 7 eixos obrigatórios estabelecidos no roteiro de trabalho:

| Eixo de Auditoria | Critério Avaliado | Resultado | Evidência Documental |
|---|---|:---:|---|
| **1. Consistência dos Diagramas** | Correspondência exata entre os modelos visuais e a especificação v1.1 | **CONFORME** | `diagrams/` (.mmd, .puml) e seções de diagramas nos docs 01 a 06 |
| **2. Derivação dos Três Produtos** | Validação sintática e semântica dos manifestos JSON (Moda, Tech, Books) | **CONFORME** | `06_PRODUCT_DERIVATION.md` (Manifestos válidos, schema v1.0) |
| **3. Dependências de Features** | Restrições cross-tree (Requires, Excludes, XOR, OR) matematicamente consistentes | **CONFORME** | `01_FEATURE_MODEL.md` (Tabela CTC-01 a CTC-11) |
| **4. Delimitação de Componentes** | Todos os componentes possuem responsabilidades, interfaces e bancos bem definidos | **CONFORME** | `04_COMPONENT_DIAGRAM.md` e `05_COMPONENT_VARIABILITY.md` |
| **5. Cobertura de Requisitos** | O Product Backlog mapeia todos os requisitos da baseline (RF-01 a RF-20 e RNF-01 a RNF-10) | **CONFORME** | `07_PRODUCT_BACKLOG.md` (29 histórias cobrindo 100% dos requisitos) |
| **6. Encadeamento das Sprints** | Sprints respeitam dependências reais e produzem entregáveis demonstráveis | **CONFORME** | `08_SPRINT_BACKLOGS.md` (4 sprints com dependências estritas) |
| **7. Decisões e Governança** | Nenhuma decisão aprovada nas ADRs 001–008 foi violada ou alterada | **CONFORME** | Alinhamento total com as ADRs aceitas |

---

## 3. Análise Detalhada dos Resultados

### 3.1 Consistência dos Diagramas e Fontes Editáveis
- Todos os diagramas foram gerados em linguagens declarativas padrão (**Mermaid** para fluxos/variabilidade e **PlantUML** para arquitetura de componentes).
- Os arquivos-fonte editáveis encontram-se preservados em `docs/modeling/diagrams/`:
  - `feature-model.mmd`
  - `layered-architecture.mmd`
  - `variability.mmd`
  - `component-diagram.puml`
  - `component-variability.mmd`
  - `product-derivation.mmd`
- Não foram utilizadas setas genéricas: as relações entre features e componentes empregam notações semânticas explícitas com legendas explicativas (Mandatory, Optional, XOR, OR, Requires, Excludes).

### 3.2 Validação das Configurações dos Três Produtos Derivados
Os manifestos dos três produtos representativos foram auditados individualmente contra a matriz de restrições:
1. **Vitrine Moda (`vitrine-moda`):**
   - Atende à restrição XOR de segmento (`FASHION`).
   - Habilita `favorites: true` (permitido).
   - Mantém `product_comparison: false` (bloqueado para Moda).
   - Exclui `reviews` e `coupons` (conforme ADR-001).
   - Configura métodos válidos: `PIX`, `CARD` e `DELIVERY`, `PICKUP`.
2. **Vitrine Tech (`vitrine-tech`):**
   - Atende à restrição XOR de segmento (`TECH`).
   - Habilita `product_comparison: true` (permitido exclusivamente em Tech por `CTC-02`).
   - Habilita `favorites: true`.
   - Configura métodos válidos: `PIX`, `CARD`, `BOLETO` e modalidade exclusiva de `DELIVERY`.
3. **Vitrine Books (`vitrine-books`):**
   - Atende à restrição XOR de segmento (`BOOKS`).
   - Mantém `favorites: false` (para evidenciar o bloqueio de feature opcional).
   - Mantém `product_comparison: false`.
   - Configura métodos válidos: `PIX`, `BOLETO` e `DELIVERY`, `PICKUP`.

### 3.3 Verificação das Regras de Variabilidade e Restrições Cross-Tree
- A modelagem assegura matematicamente que features desabilitadas ou incompatíveis não possam ser ativadas pelo configurador e, caso chamadas diretamente via HTTP por um cliente, sejam interceptadas pelo backend retornando status padronizados:
  - `403 FEATURE_NOT_ENABLED`: Para features válidas no domínio, mas desligadas no manifesto da loja ativa.
  - `422 INVALID_FEATURE_CONFIGURATION`: Para combinações que violem restrições proposicionais (ex: tentar ativar comparação em livros ou moda).
  - `422 FEATURE_NOT_SUPPORTED`: Para tentativas de ativar extensões futuras fora do escopo do MVP (`reviews`, `coupons`).

### 3.4 Responsabilidades dos Componentes e Isolamento de Persistência
- O princípio *Database-per-Service* foi mantido com rigor absoluto.
- Cada um dos 8 microsserviços de negócio gerencia exclusivamente seu próprio banco SQLite:
  `auth.db`, `lps.db`, `catalog.db`, `cart.db`, `orders.db`, `payments.db`, `shipping.db` e `recommendations.db`.
- O Gateway (`:8000`) não possui banco de dados, atuando estritamente como nó de roteamento e sanitização.
- O pacote compartilhado `python-common` encapsula apenas comportamentos técnicos transversais (cache TTL de manifesto, engine WAL e formatação de erros), sem acoplar regras de negócio de domínio.

### 3.5 Cobertura Integral de Requisitos no Backlog
As 29 histórias de usuário distribuídas em 175 Story Points cobrem 100% dos requisitos funcionais (RF-01 a RF-20) e não funcionais (RNF-01 a RNF-10) da baseline técnica v1.1:
- **Isolamento de Loja (RNF-04):** Mapeado compulsoriamente em PB-03, PB-08 e PB-15.
- **Compensação Idempotente de Estoque (ADR-003):** Mapeado em PB-12 e PB-18.
- **Persistência SQLite WAL (ADR-005):** Mapeado em PB-01 e PB-28.
- **Recomendação Explicável (RF-13):** Mapeado em PB-20 e PB-21.
- **Painel de Portas e Diagnóstico (RF-14):** Mapeado em PB-27.

### 3.6 Sequenciamento das Sprints e Dependências Reais
O planejamento de 4 Sprints elimina qualquer circularidade de dependência:
- A Sprint 1 fornece a infraestrutura e a autenticação exigidas por todas as demais.
- A Sprint 2 entrega a engenharia de domínio e o catálogo que alimentam o carrinho e o checkout.
- A Sprint 3 implementa os fluxos transacionais que geram os dados de compra.
- A Sprint 4 consome os dados transacionais para gerar as recomendações e fecha a validação integrada dos três produtos derivados.

---

## 4. Itens Externos Pendentes de Alinhamento

Conforme registrado na baseline v1.1 (Seção 21.1) e em `OPEN_DECISIONS.md`, os itens abaixo não representam falhas da modelagem interna, mas sim definições institucionais que dependem de validação externa durante o semestre letivo:
1. **Validação Docente da Estratégia de Instâncias Lógicas:** A disciplina exige demonstração de múltiplos produtos derivados da LPS. A estratégia aprovada de derivação por Composição Guiada por Manifesto (DSPL) atende plenamente ao conceito acadêmico, mas deve ser confirmada com o docente em aula caso haja preferência por containers físicos isolados por produto.
2. **Confirmação do SQLite por Serviço:** O uso de SQLite isolado por serviço em modo WAL cumpre integralmente os requisitos didáticos de monorepo e execução local; caso o docente exija PostgreSQL multi-container, a migração dos engines em `python-common` precisará ser acionada.
3. **Composição Efetiva da Equipe:** A velocidade estimada de 175 Story Points ao longo de 4 sprints deve ser calibrada conforme a quantidade final de integrantes do grupo de trabalho da UFAL.

---

## 5. Parecer Conclusivo da Etapa de Modelagem

> [!IMPORTANT]
> **PARECER DA ARQUITETURA: APROVADO PARA REVISÃO.**  
> A modelagem formal da Linha de Produto de Software VitrineFlex está completa, consistente, auditada e formalizada em sua totalidade.
>
> **Nenhuma linha de código de aplicação foi implementada nesta etapa.**  
> O projeto encontra-se pronto para transitar para a **Etapa 2 (Implementação da Sprint 1 — Fundação e Borda)**, dependendo exclusivamente da validação e autorização final do responsável pelo projeto.
