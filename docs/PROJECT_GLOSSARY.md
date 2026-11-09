# VitrineFlex — Glossário do Projeto e Padrões de Nomenclatura

**Documento:** Glossário Unificado, Definições de Domínio e Convenções de Nomenclatura  
**Data:** 08 de novembro de 2026  
**Status:** Baseline aprovada para padronização de código e documentação  
**Referência Principal:** `docs/VitrineFlex_Documento_Tecnico_v1.0.md`

---

## 1. Conceitos de Domínio da Linha de Produto de Software (LPS)

| Conceito | Definição no Contexto do VitrineFlex |
|---|---|
| **Linha de Produto de Software (LPS)** | Paradigma de Engenharia de Software voltado para o desenvolvimento de uma família de produtos de software a partir de um conjunto compartilhado de ativos de núcleo (*core assets*), explorando suas características comuns e variabilidades. |
| **Engenharia de Domínio (*Domain Engineering*)** | Fase da LPS responsável pela identificação, modelagem e implementação dos ativos comuns e dos pontos de variação. No VitrineFlex, é representada pelo serviço de configuração da LPS (`LPS Configuration Service`), pelo modelo formal de features e pela biblioteca de componentes compartilhados. |
| **Engenharia de Aplicação (*Application Engineering*)** | Processo de derivação de um produto específico a partir dos ativos da LPS, guiado por uma seleção de features. No VitrineFlex, ocorre quando o administrador configura e instancia uma loja derivada (ex: *Vitrine Moda*). |
| **Modelo de Features (*Feature Model*)** | Representação estruturada em árvore das funcionalidades do sistema, expressando features obrigatórias (*mandatory*), opcionais (*optional*), mutuamente exclusivas (*alternative XOR*) e inclusivas (*alternative OR*), acompanhadas de regras de restrição cruzada (*cross-tree constraints*: `requires` e `excludes`). |
| **Ponto de Variação (*Variation Point*)** | Local específico da arquitetura (no frontend ou backend) onde o comportamento ou a estrutura do sistema varia conforme as features selecionadas (ex: painel de atributos do produto que muda conforme o segmento). |
| **Variante (*Variant*)** | Uma das realizações possíveis para um determinado ponto de variação (ex: `FashionVariantSelector`, `TechSpecificationsPanel`, `BookMetadataPanel`). |
| **Produto Derivado (*Derived Product*)** | Uma loja virtual específica, materializada por um identificador único (`store_id`), um caminho público (`/loja/{slug}`) e uma configuração ativa persistida (`ProductManifest`). |
| **Manifesto do Produto (*ProductManifest*)** | Estrutura de dados serializável em formato JSON que encapsula a especificação formal completa de um produto derivado: identificadores, segmento comercial, features ativas, métodos de pagamento, opções de entrega e identidade visual. |
| **Segmento Comercial (*Segment*)** | Domínio mercadológico específico do produto derivado (Moda, Tecnologia ou Livros). Trata-se de uma variabilidade alternativa obrigatória (*XOR*), onde exatamente um segmento deve ser escolhido por loja derivada. |

---

## 2. Termos Técnicos

| Termo | Definição Técnica |
|---|---|
| **Monorepo** | Estrutura de repositório de código único que hospeda simultaneamente todos os microsserviços do backend, a aplicação frontend SPA e os pacotes técnicos compartilhados. |
| **API Gateway** | Componente de borda (*edge reverse proxy*) que serve como ponto único de entrada para o tráfego do cliente, gerenciando roteamento, agregação de saúde, CORS e sanitização de requisições. |
| **Database-per-Service** | Padrão arquitetural em que cada microsserviço detém o controle exclusivo sobre sua base de persistência de dados. Nenhum serviço pode ler ou escrever diretamente no banco de outro serviço. |
| **Argon2id** | Algoritmo criptográfico de derivação de chave e *hashing* de senhas recomendado pelo NIST e vencedor do Password Hashing Competition (PHC), adotado para armazenamento de credenciais. |
| **JWT (JSON Web Token)** | Padrão aberto (RFC 7519) utilizado para autenticação *stateless* e transporte seguro de identidade de usuários entre o frontend e o API Gateway. |
| **SQLite WAL (Write-Ahead Logging)** | Modo de operação do SQLite (`PRAGMA journal_mode=WAL;`) que permite leitores concorrentes sem bloquear escritores, e escritor concorrente sem bloquear leitores, fundamental para estabilidade sob FastAPI. |
| **Extension Point (Ponto de Extensão)** | Interface ou componente no código frontend projetado para receber variantes dinâmicas de interface injetadas conforme o manifesto da loja ativa. |
| **Correlation ID (`X-Request-ID`)** | Identificador UUID gerado pelo Gateway na entrada da requisição e propagado por todos os microsserviços nos cabeçalhos HTTP e logs estruturados para rastreabilidade de ponta a ponta. |
| **Cold Start de Recomendação** | Cenário em que um usuário recém-cadastrado não possui interações registradas no sistema; tratado pelo algoritmo de recomendação através da exibição de produtos mais populares do segmento ativo. |

---

## 3. Entidades Principais por Domínio

### 3.1 Serviço de Autenticação (`Auth Service`)
- **`User`:** Representa um usuário cadastrado no sistema (clientes e administradores). Possui `id`, `name`, `email`, `password_hash`, `role` e timestamps.
- **`UserPreference`:** Registra as preferências e categorias de interesse declaradas pelo cliente no seu perfil.
- **`StoreMembership`:** Associa um usuário administrador a uma loja específica (`user_id`, `store_id`, `role`).
- **`UserAddress`:** Endereço de entrega cadastrado pelo cliente para cálculo simulado de frete.

### 3.2 Serviço de Configuração da LPS (`LPS Configuration Service`)
- **`Store`:** Registro mestre do produto derivado. Contém `id` (UUID), `name`, `slug` (único), `segment` e status (`ACTIVE`, `INACTIVE`).
- **`ProductManifest`:** O documento formal persistido contendo o esquema JSON com as features habilitadas, tema visual, pagamentos e métodos de entrega.
- **`FeatureDefinition`:** Catálogo estático/versionado de todas as features suportadas pela LPS, seu tipo (comum, opcional, alternativa) e metadados.
- **`FeatureConstraint`:** Regras formais de dependência (`requires`) e exclusão mútua (`excludes`).

### 3.3 Serviço de Catálogo (`Catalog Service`)
- **`Product`:** Entidade comum de produto contendo `id`, `store_id`, `name`, `description`, `price`, `active`, `category_id`.
- **`Category`:** Categoria de produto pertencente a uma loja específica.
- **`ProductVariant`:** Variações físicas de produto (usado fortemente em Moda: tamanho, cor, código SKU próprio, estoque específico).
- **`ProductAttribute`:** Atributos tabulares específicos do segmento (ex: `specs` para Tecnologia, `isbn` e `author` para Livros).
- **`Inventory`:** Registro de saldo em estoque do produto ou da variante.
- **`ProductFavorite`:** Vínculo de produto favoritado por um cliente (`user_id`, `product_id`, `store_id`).

### 3.4 Serviço de Carrinho (`Cart Service`)
- **`ShoppingCart`:** Carrinho de compras ativo associado a uma tupla (`user_id`, `store_id`).
- **`CartItem`:** Item presente no carrinho, contendo `product_id`, `variant_id` (opcional), `quantity` e preço capturado no momento da adição.

### 3.5 Serviço de Pedidos (`Orders Service`)
- **`Order`:** Registro de compra fechada contendo `id`, `store_id`, `user_id`, `total_amount`, `shipping_amount`, `status` (`PENDING`, `PAID`, `CANCELLED`), `shipping_method`, `delivery_address`.
- **`OrderItemSnapshot`:** Snapshot imutável dos itens comprados (nome, SKU, quantidade, preço unitário) para garantir integridade contábil mesmo se o catálogo for alterado posteriormente.
- **`OrderStatusHistory`:** Linha do tempo das mudanças de estado do pedido com timestamp e observações.

### 3.6 Serviço de Pagamentos (`Payments Service`)
- **`PaymentAttempt`:** Tentativa de pagamento simulado atrelada a um pedido (`order_id`, `store_id`, `amount`, `payment_method`, `status`).
- **`PaymentResult`:** Registro do resultado retornado pela simulação (`transaction_id`, `authorization_code`, `status`, `payload`).

### 3.7 Serviço de Entrega (`Shipping Service`)
- **`ShippingMethod`:** Tipos de envio configurados para a loja (`DELIVERY`, `PICKUP`).
- **`ShippingQuote`:** Registro de cálculo simulado de frete gerado para um determinado CEP e valor de pedido.
- **`PickupLocation`:** Endereço físico configurado para retirada de mercadorias no local.

### 3.8 Serviço de Recomendação (`Recommendation Service`)
- **`UserInteraction`:** Registro de eventos comportamentais (`user_id`, `store_id`, `product_id`, `category_id`, `event_type`: `VIEW`, `FAVORITE`, `PURCHASE`, `timestamp`).
- **`CategoryAffinity`:** Consolidação analítica do grau de afinidade do usuário com cada categoria.
- **`RecommendationResult`:** Registro dos produtos sugeridos, score calculado e justificativa (*reason*).

---

## 4. Nomenclatura Padronizada dos Serviços

| Nome Canônico do Serviço | Diretório no Repositório | Porta Local | Banco de Dados SQLite | Prefixo de Rota no Gateway | Responsabilidade Principal |
|---|---|:---:|---|---|---|
| **API Gateway** | `services/api-gateway` | `8000` | *N/A (Sem banco)* | `/api/v1/*` | Roteamento reverso, CORS, injeção de rastreabilidade e health agregado |
| **Auth Service** | `services/auth-service` | `8001` | `auth.db` | `/api/v1/auth/*` | Usuários, autenticação JWT, perfis e preferências |
| **LPS Configuration Service** | `services/lps-config-service` | `8002` | `lps.db` | `/api/v1/lps/*` | Modelo de features, regras de variabilidade e manifestos |
| **Catalog Service** | `services/catalog-service` | `8003` | `catalog.db` | `/api/v1/catalog/*` | Produtos, categorias, variantes, atributos por segmento e estoque |
| **Cart Service** | `services/cart-service` | `8004` | `cart.db` | `/api/v1/cart/*` | Carrinho de compras multi-loja e gestão de itens |
| **Orders Service** | `services/orders-service` | `8005` | `orders.db` | `/api/v1/orders/*` | Checkout, histórico de pedidos e snapshots de compra |
| **Payments Service** | `services/payments-service` | `8006` | `payments.db` | `/api/v1/payments/*` | Processamento simulado de pagamentos (PIX, Cartão, Boleto) |
| **Shipping Service** | `services/shipping-service` | `8007` | `shipping.db` | `/api/v1/shipping/*` | Cotação simulada de frete e regras de retirada |
| **Recommendation Service** | `services/recommendation-service` | `8008` | `recommendations.db` | `/api/v1/recommendations/*` | Motor explicável de sugestões baseado em perfil e eventos |
| **Storefront Web App** | `apps/web` | `5173` | *N/A (Frontend)* | `/loja/{slug}`, `/admin` | Aplicação SPA em React com composição dinâmica de componentes |

---

## 5. Convenções de Nomenclatura e Estilo de Código

### 5.1 Endpoints REST
- **Substantivos no plural e letras minúsculas separadas por hífen (*kebab-case*):**
  - Correto: `/api/v1/catalog/products`, `/api/v1/orders/checkout`, `/api/v1/lps/stores`
  - Incorreto: `/api/v1/getProduct`, `/api/v1/order_checkout`, `/api/v1/Stores`
- **Operações via Verbos HTTP sem verbos na URL:**
  - `GET /api/v1/catalog/products` (listar)
  - `POST /api/v1/catalog/products` (criar)
  - `GET /api/v1/catalog/products/{product_id}` (obter detalhe)
  - `PATCH /api/v1/catalog/products/{product_id}` (atualização parcial)
  - `DELETE /api/v1/catalog/products/{product_id}` (remover)
- **Ações de Negócio Específicas (Orquestrações):**
  - Utilizar substantivo ou particípio como ação no final do recurso:
  - `POST /api/v1/orders/checkout`
  - `POST /api/v1/payments/simulate`
  - `POST /api/v1/shipping/quote`
  - `POST /api/v1/lps/stores/validate`
- **Rotas Internas de Comunicação Serviço-a-Serviço:**
  - Prefixo `/internal/v1/*` para rotas protegidas por `X-Internal-Token` que não são expostas publicamente no Gateway.

### 5.2 Banco de Dados e Modelagem SQL
- **Tabelas:** Plural em *snake_case* (ex: `products`, `store_manifests`, `order_item_snapshots`).
- **Colunas:** Letras minúsculas em *snake_case* (ex: `store_id`, `created_at`, `total_amount`).
- **Chaves Primárias:** Sempre `id` (armazenado como string/UUID).
- **Chaves Estrangeiras Lógicas (trans-serviço):** Nome da entidade de origem seguido de `_id` (ex: `store_id`, `user_id`, `product_id`).

### 5.3 Código Backend (Python / FastAPI / Pydantic / SQLAlchemy)
- **Classes de Domínio e Modelos:** *PascalCase* (ex: `ProductModel`, `UserPreference`, `CatalogRepository`).
- **Schemas Pydantic:**
  - Entrada: `{Entidade}CreateSchema`, `{Entidade}UpdateSchema` (ex: `StoreCreateRequest`, `ProductUpdateInput`).
  - Saída: `{Entidade}Response` (ex: `ProductDetailResponse`, `StoreManifestResponse`).
- **Funções e Métodos:** *snake_case* (ex: `get_product_by_id`, `calculate_shipping_quote`).
- **Constantes e Enums:** *SCREAMING_SNAKE_CASE* (ex: `OrderStatus.PAID`, `SegmentType.TECH`, `DEFAULT_PAGE_SIZE = 20`).
- **Módulos e Arquivos:** *snake_case* (ex: `product_service.py`, `feature_validator.py`).

### 5.4 Código Frontend (React / TypeScript)
- **Componentes React e Contextos:** *PascalCase* (ex: `ProductCard.tsx`, `FashionVariantSelector.tsx`, `StoreContext.tsx`).
- **Hooks Personalizados:** *camelCase* prefixado com `use` (ex: `useStoreManifest.ts`, `useCart.ts`, `useRecommendations.ts`).
- **Funções utilitárias e serviços:** *camelCase* (ex: `formatCurrency.ts`, `catalogApi.ts`).
- **Tipos e Interfaces TypeScript:** *PascalCase* (ex: `Product`, `ProductManifest`, `StoreConfiguration`).
- **Arquivos de estilo ou temas:** *kebab-case* ou associados ao componente (ex: `globals.css`, `theme.config.ts`).

### 5.5 Cabeçalhos HTTP Padronizados
- **`X-Request-ID`:** Identificador único de correlação para tracing distribuído.
- **`X-Store-ID`:** Identificador UUID da loja derivada ativa no contexto da requisição.
- **`X-User-ID`:** Identificador UUID do usuário autenticado (injetado internamente após validação do JWT).
- **`X-User-Role`:** Papel do usuário autenticado (`CUSTOMER`, `STORE_ADMIN`, `LPS_ADMIN`).
- **`X-Internal-Token`:** Token compartilhado para autenticação de chamadas internas diretas entre microsserviços.
