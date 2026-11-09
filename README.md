# VitrineFlex — Linha de Produto de Software para E-Commerce Multidomínio

> **VitrineFlex** é uma Linha de Produto de Software (LPS / *Software Product Line*) orientada a e-commerce, projetada e implementada como uma arquitetura distribuída de microsserviços em **Python (FastAPI)** com frontend configurável em **React (TypeScript, Vite e Tailwind CSS)**.

O sistema instancia e opera vitrines de comércio eletrônico altamente especializadas para múltiplos domínios de negócio a partir de um **Feature Model formal de 23 features**, garantindo variabilidade dinâmica em tempo de execução, isolamento de dados e contratos arquiteturais consistentes.

---

## 🏬 Lojas Demonstrativas Instanciadas

O projeto inclui três vitrines pré-configuradas demonstrando a flexibilidade e os pontos de extensão da LPS:

| Loja | Segmento | Rota | Principais Variações e Recursos |
| :--- | :--- | :--- | :--- |
| **Vitrine Fashion** | `FASHION` | [`/loja/moda`](http://localhost:5173/loja/moda) | Seletor de variações de cor e tamanho (P/M/G), guia interativo de medidas corporais, visual editorial com layout 3:4. |
| **Vitrine Tech** | `TECH` | [`/loja/tech`](http://localhost:5173/loja/tech) | Comparador lado a lado de produtos, especificações técnicas detalhadas, filtros técnicos facetados com rolagem otimizada. |
| **Vitrine Books** | `BOOKS` | [`/loja/livros`](http://localhost:5173/loja/livros) | Ficha catalográfica com ISBN/autor/editora, leitor modal para prévia de capítulos, alertas de reposição de estoque na conta. |

---

## 🏛️ Arquitetura dos Microsserviços

O backend é organizado em **9 microsserviços autônomos**, adotando o padrão **Database-per-Service** com persistência em SQLite operando em modo WAL (*Write-Ahead Logging*):

```
                     ┌────────────────────────┐
                     │   Browser / Frontend   │
                     │  (React / Vite :5173)  │
                     └───────────┬────────────┘
                                 │ HTTP / JSON
                                 ▼
                     ┌────────────────────────┐
                     │      API Gateway       │
                     │     (FastAPI :8000)    │
                     └───────────┬────────────┘
                                 │
         ┌───────────────┬───────┴───────┬───────────────┬───────────────┐
         ▼               ▼               ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │   Auth    │   │LPS Config │   │  Catalog  │   │   Cart    │   │  Orders   │
   │  (:8001)  │   │  (:8002)  │   │  (:8003)  │   │  (:8004)  │   │  (:8005)  │
   └───────────┘   └───────────┘   └───────────┘   └───────────┘   └─────┬─────┘
         ▼               ▼               ▼                               │ (Saga)
   ┌───────────┐   ┌───────────┐   ┌───────────┐                         │
   │ Payments  │   │ Shipping  │   │Recommend. │ ◄───────────────────────┘
   │  (:8006)  │   │  (:8007)  │   │  (:8008)  │
   └───────────┘   └───────────┘   └───────────┘
```

### Mapeamento de Serviços e Portas

| Serviço | Porta | Responsabilidade Principal |
| :--- | :---: | :--- |
| **API Gateway** | `8000` | Ponto único de entrada, roteamento reverso, higienização de cabeçalhos de borda e injeção de identidade confiável (`X-User-ID`, `X-Store-ID`). |
| **Auth Service** | `8001` | Registro de clientes, autenticação com Argon2id, emissão e validação de tokens JWT. |
| **LPS Configuration Service** | `8002` | Gerenciamento do Feature Model canônico de 23 features, manifestos das lojas e validação de regras de variabilidade. |
| **Catalog Service** | `8003` | Catálogo de produtos, variações, atributos técnicos, favoritos, controle de estoque atômico e alertas de reposição. |
| **Cart Service** | `8004` | Carrinho de compras com suporte a sessão convidada e sincronização com usuário autenticado. |
| **Orders Service** | `8005` | Gestão de pedidos e **Orquestrador da Saga** de checkout com compensação síncrona idempotente. |
| **Payments Service** | `8006` | Processamento idempotente de pagamentos (PIX, Cartão de Crédito e Boleto) com simulação de estorno/compensação. |
| **Shipping Service** | `8007` | Cálculo de frete por CEP com opções expressa e padrão, prazos e rastreamento. |
| **Recommendation Service** | `8008` | Motor de recomendações e histórico de produtos vistos recentemente, baseado em eventos (`VIEW`, `FAVORITE`, `PURCHASE`). |

---

## 🧩 Feature Model (LPS)

A variabilidade do VitrineFlex é regida por um modelo formal com **23 features** categorizadas em:

- **Core Obrigatório:** `auth`, `catalog`, `cart`, `checkout`, `shipping`, `payment`.
- **Formas de Pagamento:** `payment_pix`, `payment_credit_card`, `payment_boleto`.
- **Modalidades de Entrega:** `delivery_standard`, `delivery_express`, `delivery_pickup`.
- **Engajamento & Descoberta:** `favorites`, `recommendations`, `recently_viewed`.
- **Extensões de Moda:** `size_guide`, `color_size_variants`.
- **Extensões de Tecnologia:** `technical_specifications`, `technical_filters`, `product_comparison`.
- **Extensões Editoriais / Livros:** `reading_preview`, `editorial_metadata`, `back_in_stock_alert`.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

- **Python 3.10 ou superior** (compatível com 3.11, 3.12 e 3.15)
- **Node.js 18 ou superior** (com `npm`)
- **Git**

---

## 🚀 Como Rodar o Projeto

### 1. Clonar o Repositório

```bash
git clone https://github.com/leonardobrrs/VitrineFlex.git
cd VitrineFlex
```

### 2. Configurar o Ambiente Backend (Python)

Crie e ative um ambiente virtual:

```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS (Bash)
python3 -m venv .venv
source .venv/bin/activate
```

Instale as dependências unificadas do backend e o pacote compartilhado:

```bash
pip install -r requirements.txt
```

### 3. Popular o Banco de Dados com as Lojas Demonstrativas

Execute o script de seed para criar as tabelas SQLite em `data/` e cadastrar as 3 lojas demonstrativas, os manifestos de features, os usuários padrão e 75 produtos com atributos enriquecidos:

```bash
python scripts/seed_demo_stores.py
```

### 4. Iniciar os Microsserviços Backend

Inicie simultaneamente o API Gateway e os 8 microsserviços através do orquestrador local:

```bash
python scripts/start_all.py
```

> **Verificação de Saúde:** O gateway estará disponível em `http://localhost:8000/health`.

### 5. Configurar e Iniciar o Frontend (React)

Abra outro terminal, entre no diretório da aplicação web e instale as dependências:

```bash
cd apps/web
npm install
npm run dev
```

O frontend estará acessível em:
👉 **`http://localhost:5173`**

---

## 🔑 Credenciais Padrão de Teste

O seed inicial cria automaticamente as seguintes contas para testes manuais:

| Tipo | E-mail | Senha | Perfil |
| :--- | :--- | :--- | :--- |
| **Cliente Padrão** | `maria.costa@email.com` | `Password123!` | Visualização de pedidos, favoritos, alertas e histórico |
| **Administrador** | `admin@vitrineflex.com` | `AdminSecret2026!` | Gestão da LPS, reposição de estoque e diagnósticos |

---

## 🧪 Execução de Testes Automatizados

O projeto conta com ampla cobertura de testes de integração, idempotência e regras da LPS:

```bash
# Executar todos os testes
pytest

# Executar testes da LPS e novos fluxos de produto com relatório detalhado
pytest tests/test_lps_evolution_features.py -v

# Executar testes ponta a ponta da Saga e concorrência
pytest tests/test_sprint4_recommendations_and_e2e.py -v
```

---

## 📁 Estrutura do Repositório

```
VitrineFlex/
├── apps/
│   └── web/                     # Aplicação SPA React (Vite, TypeScript, Tailwind)
├── data/                        # Bancos de dados SQLite (Database-per-Service)
├── docs/                        # Documentação de requisitos, relatórios e ADRs
│   ├── adr/                     # Architectural Decision Records (ADR-001 a ADR-008)
│   └── feature_model/           # Modelagem formal da LPS
├── packages/
│   └── python-common/           # Biblioteca compartilhada (segurança, JWT, erros, BD)
├── scripts/
│   ├── seed_demo_stores.py      # Seed de banco, produtos, lojas e credenciais
│   └── start_all.py             # Script de inicialização dos 9 serviços FastAPI
├── services/                    # Código-fonte dos microsserviços
│   ├── api-gateway/
│   ├── auth-service/
│   ├── cart-service/
│   ├── catalog-service/
│   ├── lps-config-service/
│   ├── orders-service/
│   ├── payments-service/
│   ├── recommendation-service/
│   └── shipping-service/
├── tests/                       # Suíte de testes automatizados com Pytest
└── requirements.txt             # Dependências unificadas do ecossistema Python
```

---

## 📜 Decisões Arquiteturais Relevantes (ADRs)

- **ADR-001:** Arquitetura de microsserviços em monorepo com contratos independentes.
- **ADR-002:** Padrão Database-per-Service com SQLite em modo WAL para desacoplamento e simplicidade de desenvolvimento local.
- **ADR-003:** Saga Orquestrada pelo Orders Service com compensação síncrona idempotente.
- **ADR-004:** Cache distribuído e tolerância a falhas na resolução de manifestos da LPS.
- **ADR-005:** Sistema de recomendação baseado em matriz de interações e similaridade por categoria.
- **ADR-006:** Idempotência estrita em pagamentos e reservas com chaves de desduplicação.
- **ADR-007:** Higienização rigorosa de cabeçalhos de borda no API Gateway e injeção confiável de identidade.
- **ADR-008:** Validação formal em tempo de compilação/execução do Feature Model da LPS.

---

## 👥 Autoria e Contexto Acadêmico

Desenvolvido no contexto da disciplina **Tópicos em Engenharia de Software: Projetando Linhas de Produção de Software** — Universidade Federal de Alagoas (UFAL).
