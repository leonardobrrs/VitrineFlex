# ADR-004 — Enforcement de features no backend com cache local

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

A LPS exige que uma funcionalidade desabilitada não possa ser executada por chamada direta à API. Consultar o LPS Configuration Service a cada operação sensível introduziria latência e forte acoplamento entre serviços.

## 2. Alternativas consideradas

- Alternativa A: chamada HTTP ao LPS a cada requisição.
- Alternativa B: Gateway injeta lista de features em cabeçalho assinado para todos os serviços.
- **Alternativa C (escolhida):** cache local por microsserviço, encapsulado em `python-common`, TTL 30s.

## 3. Decisão

Cada microsserviço que executa operação condicionada por feature utilizará um verificador comum do pacote `python-common`. O verificador buscará o `ProductManifest` no LPS Configuration Service e manterá cache local em memória com **TTL de 30 segundos** por `store_id`/versão. Durante a validade, as operações reutilizam o manifesto em cache. Ao expirar, o serviço atualiza a entrada.

Se a feature necessária estiver desligada, a operação será bloqueada com HTTP `403` e código `FEATURE_NOT_ENABLED`. Uma combinação de configuração inválida retorna `422 INVALID_FEATURE_CONFIGURATION`.

## 4. Justificativa

A opção evita chamada de rede em cada requisição e deixa o enforcement próximo do domínio. O TTL de 30 segundos limita a janela de eventual consistência quando a configuração muda, sem adicionar mensageria para invalidação. A cache não substitui verificação de identidade, autorização nem isolamento por loja.

## 5. Consequências e trade-offs

- Uma mudança de feature poderá levar até 30 segundos para refletir em um microsserviço que possua cache vigente.
- A cache precisa ser indexada por `store_id` e deve considerar `manifest_version`.
- Se o LPS Config estiver indisponível e não houver manifesto válido em cache, a operação protegida deve falhar de forma segura (fail closed), sem assumir a feature ativa.
- O pacote compartilhado deve permanecer pequeno e técnico, sem conter regras de domínio de negócio.

## 6. Orientações de implementação

1. Implementar `FeatureManifestProvider` em `packages/python-common`.
2. Chavear cache por `store_id`; armazenar timestamp de expiração e `manifest_version`.
3. Usar TTL padrão de 30 segundos configurável por ambiente para testes, mantendo 30s como baseline.
4. Exigir chamada de verificação nas rotas associadas a Favoritos e Comparação, e em qualquer outra operação opcional futura.
5. Retornar `403 FEATURE_NOT_ENABLED` se a feature estiver falsa/ausente.
6. Validar também o segmento para features segment-specific.
7. Em falha de obtenção sem cache válida, bloquear a operação e registrar erro com `X-Request-ID`.

## 7. Verificações e critérios de aceite

- Feature ativa na loja: endpoint retorna comportamento esperado.
- Feature inativa: chamada direta retorna 403 `FEATURE_NOT_ENABLED`.
- Feature comparação em segmento não Tech: retorna `422 INVALID_FEATURE_CONFIGURATION` ou regra de feature incompatível, conforme contexto.
- Cache reutiliza manifesto dentro de 30s e busca nova versão após expiração.
- Cache sem manifesto e serviço LPS indisponível: falha fechada; não libera recurso por padrão.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
