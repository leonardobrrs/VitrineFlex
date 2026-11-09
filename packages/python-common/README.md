# python-common

Biblioteca técnica compartilhada para a plataforma **VitrineFlex** (UFAL 2026.2).

Contém:
- `database.py`: `DatabaseEngineFactory` com configuração de persistência SQLite WAL e timeout (ADR-005).
- `errors.py`: Schemas e exceptions para respostas de erro uniformes `APIErrorResponse`.
- `security.py`: Funções de hash Argon2id, emissão/validação de JWT e validação de `X-Internal-Token` (ADR-007).
