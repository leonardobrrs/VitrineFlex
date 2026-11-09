# ADR-003 — Baixa atômica de estoque e compensação idempotente

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

O checkout inicial consultava disponibilidade antes do pagamento, mas não definia baixa atômica nem reversão. Duas compras simultâneas poderiam vender a última unidade mais de uma vez; uma recusa de pagamento também poderia deixar estoque inconsistente.

## 2. Alternativas consideradas

- Alternativa A (escolhida): baixa atômica antes do pagamento e compensação se pagamento falhar.
- Alternativa B: reserva temporária com TTL, commit e release, exigindo mecanismo de expiração.
- Alternativa C: baixar estoque somente após aprovação, aceitando risco de cancelamento por falta de saldo.

## 3. Decisão

No MVP, Orders orquestrará um fluxo síncrono com compensação:

1. Requer `Idempotency-Key` no checkout.
2. Revalida carrinho, preço, variantes e estoque.
3. Cria pedido `PENDING_PAYMENT` com snapshot e `manifest_version`.
4. Solicita ao Catalog a baixa atômica de estoque antes da simulação de pagamento.
5. Catalog realiza update condicional (`available_stock >= requested_quantity`) dentro de transação e registra uma movimentação idempotente.
6. Payments simula a transação com sua própria chave idempotente.
7. Em sucesso, Orders marca `PAID` e limpa carrinho.
8. Em falha, Orders solicita restauração idempotente de estoque e marca `PAYMENT_FAILED`.
9. Se a compensação não concluir, o pedido permanece `COMPENSATION_PENDING` e pode ser reconciliado/repetido por operação administrativa.
10. Se houver timeout/resposta ambígua no Payments, Orders mantém `PAYMENT_PENDING_CONFIRMATION` e consulta/reexecuta o mesmo `Idempotency-Key`; não libera estoque até conhecer resultado definitivo.

## 4. Justificativa

A baixa antes do pagamento simulado evita que duas compras confirmem o mesmo saldo. A compensação síncrona é mais simples para o MVP do que uma reserva com TTL e worker de expiração. A idempotência protege contra retries de rede e repetição pelo usuário. O padrão é uma Saga orquestrada simples, sem afirmar transação distribuída ACID.

## 5. Consequências e trade-offs

- Exige estado adicional de pedido e registro de movimentações de estoque.
- Uma falha prolongada na compensação precisa ser visível e reconciliável; não será escondida como sucesso.
- Timeout ambíguo de pagamento não pode ser tratado como recusa definitiva: manter pedido pendente de confirmação e consultar com a mesma chave idempotente antes de liberar estoque.
- O fluxo pode manter estoque reduzido enquanto pagamento simulado está em andamento.
- Não há job automático de TTL; a reconciliação será via endpoint/ação administrativa no MVP.

## 6. Orientações de implementação

1. Orders gera/recebe `Idempotency-Key` única por cliente e loja, persiste a chave com unicidade.
2. Catalog expõe apenas internamente `POST /internal/v1/inventory/decrement` e `POST /internal/v1/inventory/restore`.
3. As operações internas recebem `operation_id` estável e registram `InventoryMovement` para impedir duplicação.
4. O decremento usa transação curta e operação condicional; estoque insuficiente retorna conflito de domínio.
5. Payments persiste `PaymentAttempt` com referência de idempotência.
6. Orders registra transições de estado e erro de compensação.
7. Não limpar o carrinho antes de `PAID`.
8. Definir estado `PAYMENT_PENDING_CONFIRMATION` para resposta ambígua/timeout; só executar a compensação após resultado definitivo de falha.

## 7. Verificações e critérios de aceite

- Duas requisições concorrentes para a última unidade: no máximo uma baixa é aprovada.
- Repetir checkout com a mesma chave retorna o pedido anterior sem gerar novo pedido ou nova baixa.
- Pagamento recusado restaura estoque uma única vez.
- Repetir restauração não incrementa estoque novamente.
- Falha da restauração mantém `COMPENSATION_PENDING` com registro de erro.
- Timeout de Payments não libera estoque; consulta/retry com a mesma chave resolve o mesmo resultado sem nova transação.
- Pedido pago preserva snapshots e manifesto usados no instante da compra.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
