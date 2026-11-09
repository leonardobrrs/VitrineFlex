# VitrineFlex — Índice de ADRs

- **Baseline:** Documento Técnico v1.1
- **Data de aprovação:** 08/11/2026
- **Status:** ADR-001 a ADR-008 aceitas pelo responsável pelo projeto; nenhuma implementação iniciada por força destas decisões.

| ADR | Título | Status |
|---|---|---|
| [ADR-001](ADR-001-mvp-feature-scope.md) | Escopo das features opcionais no MVP | Accepted |
| [ADR-002](ADR-002-api-gateway-routing.md) | Roteamento determinístico e contexto da loja | Accepted |
| [ADR-003](ADR-003-inventory-consistency.md) | Baixa atômica de estoque e compensação idempotente | Accepted |
| [ADR-004](ADR-004-feature-enforcement.md) | Enforcement de features no backend com cache local | Accepted |
| [ADR-005](ADR-005-sqlite-persistence.md) | SQLite por serviço com WAL e controle de contenção | Accepted |
| [ADR-006](ADR-006-product-manifest-versioning.md) | Imutabilidade do segmento e versionamento do manifesto | Accepted |
| [ADR-007](ADR-007-internal-service-security.md) | Autenticação interna entre microsserviços | Accepted |
| [ADR-008](ADR-008-frontend-stack.md) | Stack de bibliotecas do frontend | Accepted |

## Regra de governança

Uma ADR aceita não deve ser alterada silenciosamente. Uma mudança posterior deve gerar nova ADR que referencie e substitua a decisão anterior, mantendo os registros históricos. A documentação técnica deve refletir as decisões atualmente aceitas.