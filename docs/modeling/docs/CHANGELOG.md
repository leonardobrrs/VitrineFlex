# VitrineFlex — Changelog da documentação

## [1.1] — 08/11/2026

### Aprovado
- Formalização de ADR-001 a ADR-008.
- MVP de features opcionais limitado a Favoritos e Comparação de Produtos (exclusiva de Tecnologia).
- Reviews e Coupons classificados como extensões futuras, não selecionáveis.
- Roteamento do Gateway por prefixos determinísticos; frontend carrega manifesto por slug e envia `X-Store-ID`.
- Tratamento do contexto da loja como dado não confiável até validação no backend.
- Checkout com baixa atômica de estoque, `Idempotency-Key`, compensação idempotente e estados explícitos `STOCK_REJECTED`, `PAYMENT_PENDING_CONFIRMATION` e `COMPENSATION_PENDING`.
- Enforcement de feature nos microsserviços via pacote `python-common`, cache local por loja e TTL de 30 segundos.
- SQLite por serviço com WAL, `busy_timeout=5000`, transações curtas e ressalva explícita de escritor único.
- Segmento imutável e versionamento de `ProductManifest`; pedidos preservam `manifest_version`.
- `X-Internal-Token` em rotas `/internal/v1/*`, rede Docker privada e remoção de cabeçalhos de identidade forjados no Gateway.
- Stack frontend fechada em React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query e Lucide React.
- Registro de eventos `UNFAVORITE` para remoção de favoritos e atualização coerente do sinal de recomendação.
- Glossário e revisão da baseline alinhados à v1.1.

### Corrigido
- Removida afirmação não sustentada de que Argon2id seria recomendação formal do NIST.
- Corrigida descrição do SQLite WAL: melhora coexistência de leitores e escritor, mas mantém apenas um escritor ativo por vez.
- Atualizado status do glossário e da revisão histórica.

### Preservado
- Documento Técnico v1.0 arquivado sem alterações em `archive/`.
- Nenhuma implementação, instalação de dependências ou criação de serviços foi realizada.

## [1.0] — 08/11/2026
- Baseline técnica inicial do VitrineFlex.
