# ADR-008 — Stack de bibliotecas do frontend

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

A baseline definia React, TypeScript e Vite, mas deixava abertas as escolhas de estilo, navegação, cache de requisições e ícones. O projeto precisa de temas por loja derivada e componentes reutilizáveis com estados previsíveis de carregamento/erro.

## 2. Alternativas consideradas

- **Alternativa A (escolhida):** Tailwind CSS + Lucide React + TanStack Query + React Router.
- Alternativa B: CSS Modules puros e Fetch nativo.

## 3. Decisão

A stack do frontend será:

- React + TypeScript;
- Vite;
- Tailwind CSS;
- React Router;
- TanStack Query;
- Lucide React.

As versões exatas serão fixadas durante a preparação do ambiente após verificação de compatibilidade. O manifesto do produto fornecerá a identidade/tema da loja; variáveis CSS e classes Tailwind permitirão sua aplicação sem duplicar layouts por segmento.

## 4. Justificativa

A combinação atende à composição modular, rotas `/loja/{slug}` e `/admin`, cache e sincronização de APIs, design responsivo e identidade visual configurável. Reduz decisões abertas sem exigir uma biblioteca complexa de estado global.

## 5. Consequências e trade-offs

- Introduz dependências adicionais a serem fixadas e auditadas.
- TanStack Query cuidará de dados remotos; estado local de formulário/visual será mantido no React.
- Tailwind requer convenção consistente de componentes e tokens de tema.
- A stack não substitui a arquitetura de componentes de domínio nem a validação de features no backend.

## 6. Orientações de implementação

1. Organizar componentes comuns em `apps/web/src/components`.
2. Organizar componentes de segmento em `apps/web/src/segments/fashion`, `tech` e `books`.
3. Organizar módulos opcionais em `apps/web/src/features/favorites` e `product-comparison`.
4. Carregar manifesto e inicializar um `StoreContext` antes de renderizar rotas da loja.
5. Aplicar rotas/slots por manifesto; comparação apenas se `segment == TECH` e `product_comparison == true`.
6. Utilizar TanStack Query para chamadas e cache remoto; React Router para rotas; Tailwind para tema/estilo; Lucide React para ícones.

## 7. Verificações e critérios de aceite

- As três lojas usam os mesmos componentes-base (ProductCard, ProductGrid, CartDrawer, CheckoutStepper etc.).
- Segmentos renderizam somente seu painel de atributos.
- Features opcionais controlam rotas/slots no frontend e não substituem enforcement no backend.
- Temas distintos são aplicados usando dados do manifesto sem duplicar a aplicação.
- Estados de loading, erro e cache de chamadas são tratados com TanStack Query.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
