# ADR-002 — Roteamento determinístico e contexto da loja

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

A baseline v1.0 misturava rotas por slug (`/stores/{slug}/products`) com rotas de serviço, forçando o Gateway e/ou o Catalog Service a resolver o slug em cada requisição de catálogo. Isso criava acoplamento e ambiguidade de roteamento.

## 2. Alternativas consideradas

- Alternativa A: Gateway resolve slug e reescreve todas as rotas.
- **Alternativa B (escolhida):** frontend carrega manifesto primeiro; Gateway usa prefixos fixos.
- Alternativa C: duplicar slug em cada serviço de domínio.

## 3. Decisão

A interface acessará `/loja/{slug}` e, na inicialização, consultará o LPS Configuration Service por meio de `GET /api/v1/lps/stores/{slug}/manifest`. O manifesto retornará `store_id`, `segment`, versão e features. Depois disso, o frontend enviará `X-Store-ID` em todas as chamadas de domínio.

O Gateway roteará exclusivamente por prefixos determinísticos:

- `/api/v1/auth/*` → Auth
- `/api/v1/lps/*` → LPS Configuration
- `/api/v1/catalog/*` → Catalog
- `/api/v1/cart/*` → Cart
- `/api/v1/orders/*` → Orders
- `/api/v1/payments/*` → Payments (quando houver rota pública; simulação de pagamento será interna no MVP)
- `/api/v1/shipping/*` → Shipping
- `/api/v1/recommendations/*` → Recommendation

## 4. Justificativa

A resolução slug→`store_id` ocorre uma vez no carregamento da loja. O Gateway permanece um proxy leve e previsível, e os serviços recebem contexto normalizado. O `X-Store-ID` é contexto solicitado, não prova de identidade nem de autorização. O Gateway verifica a presença/formato UUID, mas não consulta o LPS Configuration Service em toda requisição; cada serviço valida loja ativa/manifesto por meio do cache TTL e aplica escopo de dados/permissões do usuário.

## 5. Consequências e trade-offs

- Reduz chamadas repetidas para resolver slug e evita duplicar slug nos bancos de domínio.
- O frontend precisa tratar falha ao carregar o manifesto antes de liberar a vitrine.
- Um `store_id` alterado manualmente não pode permitir leitura ou escrita indevida; filtros tenant e autorização continuam obrigatórios.
- O Gateway se torna dependência de tráfego externo, mas não concentra regras de negócio.

## 6. Orientações de implementação

1. Publicar no LPS Config o endpoint `GET /api/v1/lps/stores/{slug}/manifest`.
2. Manter o `slug` como propriedade do LPS Configuration Service.
3. Após carregar o manifesto, armazenar o contexto da loja no estado da aplicação e enviar `X-Store-ID`.
4. O Gateway aplica tabelas explícitas de prefixo→serviço; não usa inspeção profunda de rota.
5. Criar rota interna `GET /internal/v1/lps/stores/{store_id}/manifest` no LPS Configuration para alimentar os caches locais dos microsserviços.
6. O Gateway remove os cabeçalhos `X-User-ID`, `X-User-Role` e `X-Internal-Token` fornecidos pelo cliente. Após validar JWT, injeta identidade confiável e injeta o segredo interno nas requisições encaminhadas à rede privada.
7. Todos os serviços de domínio validam `X-Store-ID`, existência/estado da loja via manifesto em cache, escopo de dados e autorização necessária.

## 7. Verificações e critérios de aceite

- Uma chamada ao manifesto por slug retorna loja ativa, `store_id` e manifesto.
- Requisições subsequentes usam prefixos determinísticos e o `X-Store-ID` correto.
- Cabeçalhos de identidade forjados pelo browser são removidos/ignorados.
- Cliente de uma loja não consegue acessar carrinho, pedidos ou favoritos de outra loja alterando `X-Store-ID`.
- Requisição sem contexto de loja em endpoint comercial retorna `400 STORE_CONTEXT_REQUIRED`.
- O Gateway não efetua uma chamada síncrona ao LPS Config em cada requisição de catálogo/carrinho/pedidos.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
