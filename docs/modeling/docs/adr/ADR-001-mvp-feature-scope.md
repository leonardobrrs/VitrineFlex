# ADR-001 — Escopo das features opcionais no MVP

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

A baseline v1.0 listava Favoritos, Comparação de Produtos, Avaliações e Cupons como features opcionais, mas não especificava entidades, serviços e endpoints completos para todas. A inclusão simultânea das quatro funcionalidades aumentaria o escopo e criaria opções configuráveis sem comportamento backend correspondente.

## 2. Alternativas consideradas

- Alternativa A: implementar entidades e fluxos completos para todas as quatro features opcionais no MVP.
- **Alternativa B (escolhida):** incluir Favoritos e Comparação Tech; adiar Avaliações e Cupons.
- Alternativa C: eliminar todas as opcionais do MVP.

## 3. Decisão

O MVP implementará apenas:

- `favorites`: funcionalidade opcional aplicável aos três segmentos, com persistência no Catalog Service e integração com Recommendation Service.
- `product_comparison`: funcionalidade opcional exclusiva do segmento `TECH`, utilizando atributos técnicos do catálogo e composição frontend.

`reviews` e `coupons` ficam classificadas como extensões futuras. Não serão listadas como features selecionáveis, não estarão habilitadas em manifests do MVP e não terão endpoints funcionais nesta entrega. Uma requisição de configuração que contenha essas chaves deverá ser rejeitada como feature não suportada.

## 4. Justificativa

A seleção concentra o esforço em duas features que demonstram variabilidade de forma visível e testável, sem exigir um domínio adicional de moderação de avaliações ou cálculo/auditoria de cupons. Mantém a possibilidade de ampliar o modelo em versão posterior da LPS, sem prometer funcionalidades incompletas no MVP.

## 5. Consequências e trade-offs

- Favoritos acrescenta entidade `ProductFavorite`, rotas, validação de autenticação e evento para recomendação.
- Comparação exige atributos técnicos consistentes e só é renderizada em lojas `TECH` com a feature habilitada.
- Avaliações e cupons não podem ser anunciados como implementados na interface, README ou demonstração.
- A inclusão futura requer nova modelagem de dados, APIs, regras de negócio, testes e atualização formal do feature model.

## 6. Orientações de implementação

1. Manter o conjunto `supported_features` centralizado no LPS Configuration Service e documentado no feature model.
2. Modelar `favorites` como `(store_id, user_id, product_id)` no Catalog Service, com unicidade para evitar duplicação.
3. Registrar eventos `FAVORITE` e `UNFAVORITE`/remoção de favorito conforme contrato do Recommendation Service.
4. Permitir `product_comparison` apenas se `segment == TECH`.
5. O configurador não deve apresentar controles para `reviews` e `coupons` nesta versão.

## 7. Verificações e critérios de aceite

- Feature Favorites ativa: cliente autenticado consegue favoritar, listar e remover favoritos; dados não se misturam entre lojas.
- Feature Favorites inativa: endpoints retornam `403 FEATURE_NOT_ENABLED`.
- Feature Comparison ativa em TECH: comparação de produtos é funcional.
- Tentativa de ativar Comparison em FASHION/BOOKS: configuração rejeitada com `422 INVALID_FEATURE_CONFIGURATION`.
- Tentativa de enviar `reviews` ou `coupons`: configuração rejeitada como feature não suportada.
- Os três produtos demonstrativos exibem combinações consistentes com a regra.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
