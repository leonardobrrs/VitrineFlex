# VitrineFlex — Processo de Derivação dos Três Produtos da LPS

**Documento:** 06_PRODUCT_DERIVATION.md  
**Versão:** 1.1.3 (Homologação Final da Modelagem — Etapa 1.3)  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)  
**Artefato Editável Associado:** `docs/modeling/diagrams/product-derivation.mmd`

---

## 1. Visão Geral da Derivação na LPS

A **Engenharia de Aplicação** do VitrineFlex materializa produtos derivados concretos a partir dos ativos de núcleo (*core assets*) desenvolvidos na Engenharia de Domínio. 

Para a avaliação acadêmica da disciplina, são instanciados e demonstrados **três produtos derivados representativos**, cobrindo os três segmentos comerciais permitidos:
1. **Vitrine Moda (`/loja/vitrine-moda`):** E-commerce de vestuário e acessórios.
2. **Vitrine Tech (`/loja/vitrine-tech`):** E-commerce de informática, componentes e eletrônicos.
3. **Vitrine Books (`/loja/vitrine-books`):** Livraria virtual e comércio de publicações.

A derivação ocorre em tempo de execução via **Composição Guiada por Manifesto**, garantindo isolamento multitenant lógico por `store_id`, catálogos segregados e comportamentos visual e funcionalmente distintos.

---

## 2. Estratégia Canônica de Representação no `ProductManifest`

Para assegurar consistência total entre o frontend, o API Gateway e os microsserviços do backend, foi adotada a estratégia de **Registro Explícito de Features no Manifesto**:
- Todas as funcionalidades ativas e inativas (sejam comuns do núcleo, específicas do segmento ou opcionais) são declaradas explicitamente como booleanos dentro do dicionário `features` do `ProductManifest`.
- Isso permite que o validador `@require_feature("feature_name")` do backend e o hook `useFeature("feature_name")` do frontend consultem qualquer funcionalidade de forma uniforme, sem exigir mapeamentos implícitos duplicados em código.

---

## 3. Especificação do Produto Derivado 1: Vitrine Moda

### 3.1 Identificação e Propósito
- **Nome Comercial:** Vitrine Moda Brasil
- **Identificador de URL (Slug):** `vitrine-moda`
- **Rota Pública:** `/loja/vitrine-moda`
- **Segmento:** `FASHION` (Vestuário, calçados e acessórios)
- **Identidade Visual:** Paleta em tons de rosa e bordô sofisticado (`primary_color: #9d174d`).

### 3.2 Features Selecionadas vs. Indisponíveis
- **Features Ativas:**
  - Núcleo: `auth`, `catalog`, `cart`, `orders`, `checkout`, `recommendations`.
  - Segmento Moda: `size_grid`, `color_variants`, `variant_sku`.
  - Opcional: `favorites`.
- **Features Indisponíveis / Desabilitadas:**
  - Segmento Tech: `technical_specs`, `warranty_info`, `product_comparison`.
  - Segmento Livros: `isbn`, `author`, `publisher`, `literary_genre`, `edition`.
  - Extensões Fora do MVP: `reviews`, `coupons` (rejeitadas pelo validador).

### 3.3 Componentes Carregados
- **Componentes Comuns (`store_core`):** `StorefrontShell`, `ProductGrid`, `ProductCard`, `CartDrawer`, `CheckoutStepper`, `RecommendationCarousel`.
- **Componentes Específicos do Segmento:** `FashionVariantSelector.tsx` (seletores interativos de tamanho P/M/G e paleta circular de cores), `PriceRangeDisplay.tsx`.
- **Slots Opcionais:** `FavoriteHeartButton.tsx` (ativo). O slot de comparação técnica não é montado na árvore DOM.

### 3.4 Configuração de Pagamento e Entrega
- **Métodos de Pagamento:** `PIX`, `CARD`. (Boleto desabilitado).
- **Modalidades de Atendimento:** `DELIVERY`, `PICKUP`.

### 3.5 Manifesto do Produto (`ProductManifest` em JSON)
```json
{
  "schema_version": "1.0",
  "manifest_version": 1,
  "created_at": "2026-11-08T10:00:00Z",
  "store": {
    "id": "e4b3a1a0-7b2c-4e89-b8d1-111111111111",
    "name": "Vitrine Moda Brasil",
    "slug": "vitrine-moda",
    "segment": "FASHION"
  },
  "features": {
    "auth": true,
    "catalog": true,
    "cart": true,
    "orders": true,
    "checkout": true,
    "recommendations": true,
    "size_grid": true,
    "color_variants": true,
    "variant_sku": true,
    "technical_specs": false,
    "warranty_info": false,
    "product_comparison": false,
    "isbn": false,
    "author": false,
    "publisher": false,
    "literary_genre": false,
    "edition": false,
    "favorites": true
  },
  "payment_methods": ["PIX", "CARD"],
  "fulfillment_modes": ["DELIVERY", "PICKUP"],
  "theme": {
    "primary_color": "#9d174d",
    "secondary_color": "#fbcfe8",
    "font_family": "Inter, sans-serif",
    "logo_url": "/assets/logos/vitrine-moda.svg"
  }
}
```

---

## 4. Especificação do Produto Derivado 2: Vitrine Tech

### 4.1 Identificação e Propósito
- **Nome Comercial:** Vitrine Tech Informática
- **Identificador de URL (Slug):** `vitrine-tech`
- **Rota Pública:** `/loja/vitrine-tech`
- **Segmento:** `TECH` (Eletrônicos, periféricos, notebooks e hardware)
- **Identidade Visual:** Paleta em azul tecnológico e ciano escuro (`primary_color: #1e40af`).

### 4.2 Features Selecionadas vs. Indisponíveis
- **Features Ativas:**
  - Núcleo: `auth`, `catalog`, `cart`, `orders`, `checkout`, `recommendations`.
  - Segmento Tech: `technical_specs`, `warranty_info`, `product_comparison` (exclusiva TECH habilitada).
  - Opcional: `favorites`.
- **Features Indisponíveis / Desabilitadas:**
  - Segmento Moda: `size_grid`, `color_variants`, `variant_sku`.
  - Segmento Livros: `isbn`, `author`, `publisher`, `literary_genre`, `edition`.

### 4.3 Componentes Carregados
- **Componentes Comuns (`store_core`):** `StorefrontShell`, `ProductGrid`, `ProductCard`, `CartDrawer`, `CheckoutStepper`, `RecommendationCarousel`.
- **Componentes Específicos do Segmento:** `TechnicalSpecificationsTable.tsx`, `WarrantyBadge.tsx`.
- **Slots Opcionais:** `AddToCompareButton.tsx`, `ProductComparisonModal.tsx`, `FavoriteHeartButton.tsx`.

### 4.4 Configuração de Pagamento e Entrega
- **Métodos de Pagamento:** `PIX`, `CARD`, `BOLETO`.
- **Modalidades de Atendimento:** `DELIVERY` (somente entrega).

### 4.5 Manifesto do Produto (`ProductManifest` em JSON)
```json
{
  "schema_version": "1.0",
  "manifest_version": 1,
  "created_at": "2026-11-08T10:00:00Z",
  "store": {
    "id": "f5c4b2b1-8c3d-4f90-c9e2-222222222222",
    "name": "Vitrine Tech Informática",
    "slug": "vitrine-tech",
    "segment": "TECH"
  },
  "features": {
    "auth": true,
    "catalog": true,
    "cart": true,
    "orders": true,
    "checkout": true,
    "recommendations": true,
    "size_grid": false,
    "color_variants": false,
    "variant_sku": false,
    "technical_specs": true,
    "warranty_info": true,
    "product_comparison": true,
    "isbn": false,
    "author": false,
    "publisher": false,
    "literary_genre": false,
    "edition": false,
    "favorites": true
  },
  "payment_methods": ["PIX", "CARD", "BOLETO"],
  "fulfillment_modes": ["DELIVERY"],
  "theme": {
    "primary_color": "#1e40af",
    "secondary_color": "#bfdbfe",
    "font_family": "Roboto, sans-serif",
    "logo_url": "/assets/logos/vitrine-tech.svg"
  }
}
```

---

## 5. Especificação do Produto Derivado 3: Vitrine Books

### 5.1 Identificação e Propósito
- **Nome Comercial:** Vitrine Books & Letras
- **Identificador de URL (Slug):** `vitrine-books`
- **Rota Pública:** `/loja/vitrine-books`
- **Segmento:** `BOOKS` (Livros acadêmicos, ficção, quadrinhos e revistas)
- **Identidade Visual:** Paleta em tons terrosos, âmbar e café editorial (`primary_color: #78350f`).

### 5.2 Features Selecionadas vs. Indisponíveis
- **Features Ativas:**
  - Núcleo: `auth`, `catalog`, `cart`, `orders`, `checkout`, `recommendations`.
  - Segmento Livros: `isbn`, `author`, `publisher`, `literary_genre`, `edition`.
- **Features Indisponíveis / Desabilitadas:**
  - Opcional: `favorites: false` (**deliberadamente desabilitada nesta loja** para comprovar o bloqueio em runtime).
  - Segmento Tech: `technical_specs`, `warranty_info`, `product_comparison: false`.
  - Segmento Moda: `size_grid`, `color_variants`, `variant_sku: false`.

### 5.3 Componentes Carregados
- **Componentes Comuns (`store_core`):** `StorefrontShell`, `ProductGrid`, `ProductCard`, `CartDrawer`, `CheckoutStepper`, `RecommendationCarousel`.
- **Componentes Específicos do Segmento:** `BookMetadataPanel.tsx`, `BookCoverGallery.tsx`.
- **Slots Opcionais:** Desabilitados (sem botão de favorito e sem botão de comparação).

### 5.4 Configuração de Pagamento e Entrega
- **Métodos de Pagamento:** `PIX`, `BOLETO`. (Cartão desabilitado).
- **Modalidades de Atendimento:** `DELIVERY`, `PICKUP`.

### 5.5 Manifesto do Produto (`ProductManifest` em JSON)
```json
{
  "schema_version": "1.0",
  "manifest_version": 1,
  "created_at": "2026-11-08T10:00:00Z",
  "store": {
    "id": "a6d5c3c2-9d4e-4001-da03-333333333333",
    "name": "Vitrine Books & Letras",
    "slug": "vitrine-books",
    "segment": "BOOKS"
  },
  "features": {
    "auth": true,
    "catalog": true,
    "cart": true,
    "orders": true,
    "checkout": true,
    "recommendations": true,
    "size_grid": false,
    "color_variants": false,
    "variant_sku": false,
    "technical_specs": false,
    "warranty_info": false,
    "product_comparison": false,
    "isbn": true,
    "author": true,
    "publisher": true,
    "literary_genre": true,
    "edition": true,
    "favorites": false
  },
  "payment_methods": ["PIX", "BOLETO"],
  "fulfillment_modes": ["DELIVERY", "PICKUP"],
  "theme": {
    "primary_color": "#78350f",
    "secondary_color": "#fef3c7",
    "font_family": "Merriweather, serif",
    "logo_url": "/assets/logos/vitrine-books.svg"
  }
}
```

---

## 6. Quadro Comparativo Consolidado dos Três Produtos Derivados

| Critério de Derivação | Vitrine Moda | Vitrine Tech | Vitrine Books |
|---|:---:|:---:|:---:|
| **Segmento Mercadológico** | Moda (`FASHION`) | Tecnologia (`TECH`) | Livros (`BOOKS`) |
| **Rota Pública SPA** | `/loja/vitrine-moda` | `/loja/vitrine-tech` | `/loja/vitrine-books` |
| **Cor Primária do Tema** | Rosa Bordô (`#9d174d`) | Azul Tech (`#1e40af`) | Âmbar Editorial (`#78350f`) |
| **Features Ativas de Segmento** | `size_grid`, `color_variants`, `variant_sku` | `technical_specs`, `warranty_info` | `isbn`, `author`, `publisher`, `genre`, `edition` |
| **Feature: Favoritos** | **`true`** | **`true`** | **`false`** (Bloqueio 403 no backend) |
| **Feature: Comparador** | **`false`** (Bloqueado) | **`true`** (Modal ativo) | **`false`** (Bloqueado) |
| **Métodos de Pagamento** | `["PIX", "CARD"]` | `["PIX", "CARD", "BOLETO"]` | `["PIX", "BOLETO"]` |
| **Modalidades de Atendimento**| `["DELIVERY", "PICKUP"]`| `["DELIVERY"]` | `["DELIVERY", "PICKUP"]` |
| **Reúso de Código Comum** | > 80% do codebase | > 80% do codebase | > 80% do codebase |
