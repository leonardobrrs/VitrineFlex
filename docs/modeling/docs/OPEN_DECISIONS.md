# VitrineFlex — Situação das Decisões Arquiteturais

- **Documento:** Situação das decisões após aprovação das ADRs
- **Data:** 08 de novembro de 2026
- **Baseline vigente:** `VitrineFlex_Documento_Tecnico_v1.1.md`
- **Status:** Oito decisões arquiteturais internas aprovadas; questões externas/de planejamento ainda abertas.

## 1. Decisões arquiteturais formalizadas

As oito decisões abaixo foram aprovadas pelo responsável pelo projeto e registradas individualmente em `docs/adr/`:

| ID | Decisão | Situação | Documento |
|---|---|---|---|
| ADR-001 | Features opcionais do MVP: Favoritos e Comparação Tech; Reviews/Coupons fora do MVP | Accepted | `adr/ADR-001-mvp-feature-scope.md` |
| ADR-002 | Frontend resolve manifesto por slug; Gateway usa prefixos fixos e `X-Store-ID` validado | Accepted | `adr/ADR-002-api-gateway-routing.md` |
| ADR-003 | Baixa atômica de estoque e compensação idempotente orquestrada por Orders | Accepted | `adr/ADR-003-inventory-consistency.md` |
| ADR-004 | Enforcement backend com cache por loja e TTL de 30 segundos | Accepted | `adr/ADR-004-feature-enforcement.md` |
| ADR-005 | SQLite por serviço, WAL, busy timeout 5s, transações curtas e tratamento de contenção | Accepted | `adr/ADR-005-sqlite-persistence.md` |
| ADR-006 | Segmento imutável e features opcionais versionadas no ProductManifest | Accepted | `adr/ADR-006-product-manifest-versioning.md` |
| ADR-007 | `X-Internal-Token` em rotas internas, rede Docker privada e identidade validada | Accepted | `adr/ADR-007-internal-service-security.md` |
| ADR-008 | React + TypeScript + Vite + Tailwind + React Router + TanStack Query + Lucide | Accepted | `adr/ADR-008-frontend-stack.md` |

## 2. Questões ainda abertas (não bloqueiam a baseline técnica)

| ID | Questão | Responsável por resolver | Impacto | Próxima ação |
|---|---|---|---|---|
| Q-01 | O docente aceita a derivação por instâncias lógicas no mesmo runtime? | Equipe / docente | Alto | Apresentar arquitetura e confirmar expectativa antes da implementação da derivação. |
| Q-02 | SQLite por serviço atende ao escopo e à avaliação da disciplina? | Equipe / docente | Médio | Explicar isolamento, WAL e limites; confirmar se existe preferência explícita por PostgreSQL. |
| Q-03 | Quantidade de integrantes e calendário real das Sprints | Equipe | Médio | Definir participantes, responsáveis e duração. |
| Q-04 | Versões exatas das dependências | Equipe técnica | Médio | Fixar após criar ambiente, verificar compatibilidade e executar smoke tests. |
| Q-05 | Identidade visual e dados de demonstração | Equipe | Baixo | Escolher paleta, logos e catálogo sintético para Moda, Tech e Books. |

## 3. Regras de governança

1. As ADRs com status `Accepted` orientam a implementação e não podem ser alteradas informalmente.
2. Mudanças arquiteturais futuras exigem uma nova ADR que registre contexto, alternativas, decisão e consequências, e indique qual decisão está substituindo.
3. A baseline 1.0 permanece arquivada e inalterada; a baseline vigente é a 1.1.
4. A aprovação interna não significa validação do docente nem conclusão de implementação.

## 4. Próxima atividade

Concluir a modelagem formal da LPS (feature model, diagramas de variabilidade, arquitetura em camadas e componentes), revisar contratos OpenAPI e Product Backlog/Sprint Backlogs. Nenhum código de aplicação ou dependência foi produzido nesta etapa.