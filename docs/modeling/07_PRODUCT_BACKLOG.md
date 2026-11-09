# VitrineFlex — Product Backlog da Linha de Produto de Software

**Documento:** 07_PRODUCT_BACKLOG.md  
**Versão:** 1.1.3 (Homologação Final da Modelagem — Etapa 1.3)  
**Disciplina:** Tópicos em Engenharia de Software — Projetando Linhas de Produto de Software (UFAL 2026.2)  
**Estimativas:** Fibonacci Story Points (1, 2, 3, 5, 8, 13) | **Total Auditado:** 174 SP | **Priorização:** MoSCoW

---

## 1. Visão Geral do Product Backlog

O Product Backlog do **VitrineFlex** contempla a totalidade dos requisitos funcionais (RF-01 a RF-20), não funcionais (RNF-01 a RNF-10) e restrições arquiteturais aprovadas (ADR-001 a ADR-008).

### Recálculo e Governança das Estimativas:
- **Total do Backlog:** **174 Story Points** (distribuídos em 29 histórias).
- **Distribuição Planejada pelas Sprints:**
  - Sprint 1 (Fundação e Borda): 34 SP
  - Sprint 2 (Domínio da LPS e Catálogo): 67 SP
  - Sprint 3 (Fluxo de Compra e Serviços Auxiliares): 47 SP
  - Sprint 4 (Recomendação e Validação Final): 26 SP
  - **Soma:** $34 + 67 + 47 + 26 = 174\text{ SP}$.
- *Nota de Calibração:* A velocidade e a distribuição das Sprints deverão ser calibradas conforme a quantidade final de integrantes da equipe na UFAL.

---

## 2. Tabela Consolidada de Itens do Backlog

| ID | Épico | Título Resumido | Prioridade | SP | Microsserviço / Módulo | Dependências |
|---|---|---|:---:|:---:|---|---|
| **PB-01** | Infraestrutura | Setup do Monorepo, Docker Compose e Banco SQLite WAL | Must | 5 | Infra / `packages/python-common` | Nenhuma |
| **PB-02** | Gateway | Implementação do API Gateway com Roteamento por Prefixos | Must | 5 | `services/api-gateway` | PB-01 |
| **PB-03** | Gateway | Higienização de Cabeçalhos e Injeção de Contexto Confiável | Must | 5 | `services/api-gateway` | PB-02 |
| **PB-04** | Autenticação | Cadastro de Usuários e Autenticação com Senha Argon2id | Must | 5 | `services/auth-service` | PB-02 |
| **PB-05** | Autenticação | Gestão de Perfis de Usuário e Categorias de Interesse | Must | 3 | `services/auth-service` | PB-04 |
| **PB-06** | LPS Config | Catálogo Formal de Features e Motor de Validação de Regras | Must | 8 | `services/lps-config-service` | PB-02 |
| **PB-07** | LPS Config | Persistência de Lojas e Emissão de ProductManifest Versionado | Must | 5 | `services/lps-config-service` | PB-06 |
| **PB-08** | Catálogo | Gestão de Produtos Comuns e Isolamento por Store ID | Must | 5 | `services/catalog-service` | PB-07 |
| **PB-09** | Catálogo | Modelagem de Variantes para o Segmento Moda (Tamanho e Cor) | Must | 5 | `services/catalog-service` | PB-08 |
| **PB-10** | Catálogo | Especificações Técnicas e Garantia para Tecnologia | Must | 5 | `services/catalog-service` | PB-08 |
| **PB-11** | Catálogo | Metadados Bibliográficos para o Segmento Livros | Must | 5 | `services/catalog-service` | PB-08 |
| **PB-12** | Catálogo | Operações Atômicas de Decremento e Restauração de Estoque | Must | 8 | `services/catalog-service` | PB-08 |
| **PB-13** | Opcionais | Gestão de Produtos Favoritos com Bloqueio de Tenant | Should | 5 | `services/catalog-service` | PB-08, PB-04 |
| **PB-14** | Opcionais | Comparador de Produtos Exclusivo para Tecnologia | Should | 5 | `services/catalog-service` / Frontend | PB-10 |
| **PB-15** | Carrinho | Gestão de Carrinho Isolado por Cliente e Loja | Must | 5 | `services/cart-service` | PB-08, PB-04 |
| **PB-16** | Pagamentos | Processador de Pagamentos Simulados com Idempotência | Must | 5 | `services/payments-service` | PB-02 |
| **PB-17** | Entrega | Cotação Simulada de Frete por Faixa de CEP e Retirada | Must | 5 | `services/shipping-service` | PB-02 |
| **PB-18** | Checkout | Orquestração do Checkout com Saga e Compensação Síncrona | Must | 13 | `services/orders-service` | PB-12, PB-15, PB-16, PB-17 |
| **PB-19** | Checkout | Consulta de Histórico de Pedidos e Snapshots Imutáveis | Must | 3 | `services/orders-service` | PB-18 |
| **PB-20** | Recomendação | Registro de Interações Comportamentais do Usuário | Must | 5 | `services/recommendation-service` | PB-08, PB-04 |
| **PB-21** | Recomendação | Algoritmo Explicável de Recomendação com Fallback Cold Start | Must | 8 | `services/recommendation-service` | PB-20 |
| **PB-22** | Frontend | Storefront Shell, Design System Tailwind e Roteamento SPA | Must | 8 | `apps/web` | PB-02 (Fixture Mock na Sprint 1; LPS real na Sprint 2) |
| **PB-23** | Frontend | Painel Administrativo Configurador de Lojas da LPS | Must | 8 | `apps/web` | PB-07, PB-22 |
| **PB-24** | Frontend | Componentes Comuns de Catálogo, Vitrine e Carrinho Drawer | Must | 8 | `apps/web` | PB-08, PB-15, PB-22 |
| **PB-25** | Frontend | Pontos de Extensão Variáveis dos Três Segmentos | Must | 8 | `apps/web` | PB-09, PB-10, PB-11, PB-24 |
| **PB-26** | Frontend | Fluxo de Checkout, Seletores Dinâmicos e Telas de Pedidos | Must | 8 | `apps/web` | PB-18, PB-25 |
| **PB-27** | Observabilidade| Painel de Saúde dos Serviços e Exibição de Portas Locais | Must | 3 | `services/api-gateway` / Frontend | PB-02, PB-22 |
| **PB-28** | Qualidade | Suíte de Testes Automatizados de Variabilidade e Concorrência | Must | 8 | `tests/` / Monorepo | PB-18, PB-21, PB-25 |
| **PB-29** | Entrega | Demonstração e Massa de Dados dos Três Produtos Derivados | Must | 5 | `scripts/` / Documentação | PB-28 |

---

## 3. Detalhamento BDD das 29 Histórias de Usuário (Cenários Positivos e Negativos)

### PB-01: Setup do Monorepo, Docker Compose e Banco SQLite WAL
- **História:** *Como desenvolvedor do time, quero uma estrutura de monorepo automatizada com Docker Compose e pacote técnico compartilhado, para que todos os microsserviços subam de forma homogênea e rápida em qualquer ambiente.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** Infra / `packages/python-common` | **Dependências:** Nenhuma
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Inicialização local do monorepo*
    - **Dado** o repositório clonado com `docker-compose.yml`,
    - **Quando** o desenvolvedor executa `docker compose up --build`,
    - **Então** os containers dos serviços e volumes de dados independentes são inicializados sem erros e `PRAGMA journal_mode` retorna `wal`.
  - *Cenário 2 (Falha): Arquivo .env ausente ou corrompido*
    - **Dado** a ausência do arquivo `.env` na raiz do projeto,
    - **Quando** o desenvolvedor tenta executar o comando de inicialização,
    - **Então** o script aborta a inicialização e exibe mensagem de erro orientando a copiar `.env.example` para `.env`.

---

### PB-02: Implementação do API Gateway com Roteamento por Prefixos
- **História:** *Como cliente ou administrador, quero que todas as requisições passem por um único ponto de entrada que roteie determinística e transparentemente para o serviço responsável, para que a arquitetura seja protegida e organizada.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/api-gateway` | **Dependências:** PB-01
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Encaminhamento determinístico por prefixo*
    - **Dado** uma requisição para `/api/v1/catalog/products`,
    - **Quando** o Gateway recebe a chamada,
    - **Então** despacha a chamada para o Catalog Service (:8003) preservando parâmetros de query e body (ADR-002).
  - *Cenário 2 (Falha): Serviço interno inacessível (Upstream Offline)*
    - **Dado** que um microsserviço de destino está temporariamente fora do ar,
    - **Quando** o Gateway tenta rotear a requisição,
    - **Então** responde com HTTP `503 Service Unavailable` em envelope JSON padronizado contendo `request_id`.

---

### PB-03: Higienização de Cabeçalhos e Injeção de Contexto Confiável
- **História:** *Como arquiteto de segurança, quero que o Gateway remova quaisquer cabeçalhos internos ou de identidade forjados pelo navegador e injete apenas contexto autenticado, para assegurar a inviolabilidade do sistema.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/api-gateway` | **Dependências:** PB-02
- **Critérios de Aceitação:**
  - *Cenário 1 (Segurança/Rejeição): Tentativa de forjar cabeçalhos internos*
    - **Dado** uma requisição externa contendo `X-Internal-Token: forjado` e `X-User-ID: admin-id`,
    - **Quando** a requisição atinge o Gateway,
    - **Então** esses cabeçalhos são sumariamente eliminados antes de qualquer encaminhamento (ADR-007).
  - *Cenário 2 (Sucesso): Injeção legítima de identidade autenticada*
    - **Dado** um token JWT válido enviado no header `Authorization`,
    - **Quando** o Gateway valida a assinatura,
    - **Então** reconstrói de forma confiável `X-User-ID` e `X-User-Role` e injeta `X-Internal-Token` para a rede privada Docker.

---

### PB-04: Cadastro de Usuários e Autenticação com Senha Argon2id
- **História:** *Como cliente ou administrador, quero me cadastrar e realizar login com e-mail e senha segura, para que minha identidade seja autenticada e eu receba um token JWT.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/auth-service` | **Dependências:** PB-02
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Cadastro e login com credenciais corretas*
    - **Dado** um e-mail novo e senha forte,
    - **Quando** o cliente envia `POST /api/v1/auth/register` e em seguida `POST /api/v1/auth/login`,
    - **Então** a senha é armazenada com hash Argon2id e um token JWT assinado com expiração é retornado.
  - *Cenário 2 (Falha): Tentativa de login com senha incorreta*
    - **Dado** um usuário cadastrado,
    - **Quando** envia uma senha errada para `POST /api/v1/auth/login`,
    - **Então** o Auth Service rejeita a requisição com HTTP `401 Unauthorized` e código `INVALID_CREDENTIALS`.

---

### PB-05: Gestão de Perfis de Usuário e Categorias de Interesse
- **História:** *Como cliente autenticado, quero definir minhas categorias de interesse no meu perfil, para receber recomendações alinhadas às minhas preferências de compra.*
- **Prioridade:** Must | **Estimativa:** 3 SP | **Módulo:** `services/auth-service` | **Dependências:** PB-04
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Atualização de preferências de interesse*
    - **Dado** um cliente logado,
    - **Quando** envia `PUT /api/v1/auth/me/preferences` com `["NOTEBOOKS", "MONITORES"]`,
    - **Então** as preferências são salvas em `user_preferences` e retornadas em consultas subsequentes.
  - *Cenário 2 (Falha): Atualização de preferências sem autenticação*
    - **Dado** um visitante sem token JWT,
    - **Quando** tenta enviar `PUT /api/v1/auth/me/preferences`,
    - **Então** a requisição é interceptada pelo Gateway com HTTP `401 Unauthorized`.

---

### PB-06: Catálogo Formal de Features e Motor de Validação de Regras
- **História:** *Como administrador da LPS, quero que o configurador valide matematicamente as regras de variabilidade e restrições cruzadas antes de criar uma loja, para evitar produtos inconsistentes.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `services/lps-config-service` | **Dependências:** PB-02
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Validação de configuração conforme o modelo*
    - **Dado** uma configuração que atenda a todas as regras do feature model,
    - **Quando** o admin envia `POST /api/v1/lps/stores/validate`,
    - **Então** o serviço responde com HTTP `200 OK` e `is_valid: true`.
  - *Cenário 2 (Falha): Rejeição de Comparador em segmento não Tech*
    - **Dado** uma tentativa de criar uma loja de Moda com `product_comparison: true`,
    - **Quando** a configuração é submetida a validação,
    - **Então** o serviço rejeita com HTTP `422 INVALID_FEATURE_CONFIGURATION` citando violação de `CTC-02`.

---

### PB-07: Persistência de Lojas e Emissão de ProductManifest Versionado
- **História:** *Como administrador da LPS, quero criar e persistir o manifesto de uma loja derivada com versionamento, para que o produto derivado possa ser inicializado e auditado.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/lps-config-service` | **Dependências:** PB-06
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Persistência de loja derivada válida*
    - **Dado** um payload válido de configuração para `vitrine-tech`,
    - **Quando** o administrador envia `POST /api/v1/lps/stores`,
    - **Então** salva no `lps.db` com `store_id` UUID, `manifest_version: 1` e status `ACTIVE`.
  - *Cenário 2 (Falha): Tentativa de alterar segmento de loja existente*
    - **Dado** uma loja de Tecnologia persistida,
    - **Quando** o admin tenta alterar o segmento para `BOOKS` via `PATCH`,
    - **Então** o serviço rejeita com HTTP `400 IMMUTABLE_SEGMENT` (ADR-006).

---

### PB-08: Gestão de Produtos Comuns e Isolamento por Store ID
- **História:** *Como administrador de loja, quero cadastrar e consultar produtos vinculados exclusivamente à minha loja, para garantir total segregação de catálogo entre produtos derivados.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/catalog-service` | **Dependências:** PB-07
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Segregação estrita por tenant*
    - **Dado** produtos cadastrados na Vitrine Moda e na Vitrine Tech,
    - **Quando** o cliente consulta `/api/v1/catalog/products` com `X-Store-ID: id-moda`,
    - **Então** apenas produtos vinculados a `id-moda` são retornados (RNF-04).
  - *Cenário 2 (Falha): Chamada comercial sem contexto de loja*
    - **Dado** uma requisição de produtos sem o header `X-Store-ID`,
    - **Quando** o Catalog recebe a chamada,
    - **Então** responde imediatamente com HTTP `400 STORE_CONTEXT_REQUIRED`.

---

### PB-09: Modelagem de Variantes para o Segmento Moda (Tamanho e Cor)
- **História:** *Como cliente da Vitrine Moda, quero selecionar produtos escolhendo tamanho e cor, para que eu adquira exatamente a peça desejada com estoque específico daquela variante.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/catalog-service` | **Dependências:** PB-08
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Cadastro e seleção de variantes de vestuário*
    - **Dado** uma camiseta cadastrada na Vitrine Moda,
    - **Quando** o administrador registra tamanhos (P, M, G) e cores (Azul, Preto),
    - **Então** o banco `catalog.db` persiste linhas em `product_variants` com SKUs únicos e saldos próprios.
  - *Cenário 2 (Falha): Cadastro de produto em Moda sem variantes*
    - **Dado** um produto cadastrado na Vitrine Moda,
    - **Quando** o administrador tenta salvá-lo sem informar a grade de tamanhos ou cores,
    - **Então** a API de cadastro rejeita a operação com HTTP `422 UNPROCESSABLE_ENTITY` exigindo os atributos do segmento.

---

### PB-10: Especificações Técnicas e Garantia para Tecnologia
- **História:** *Como cliente da Vitrine Tech, quero visualizar especificações técnicas de hardware e prazos de garantia, para avaliar se o equipamento atende aos meus requisitos de uso.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/catalog-service` | **Dependências:** PB-08
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Consulta de detalhes com ficha técnica completa*
    - **Dado** um notebook cadastrado na Vitrine Tech,
    - **Quando** o cliente abre o detalhe do item,
    - **Então** o payload retorna os atributos estruturados de CPU, RAM, GPU e os meses de garantia do fabricante.
  - *Cenário 2 (Falha): Tentativa de cadastrar produto Tech sem especificações obrigatórias*
    - **Dado** o cadastro de um produto na Vitrine Tech,
    - **Quando** o payload omite o bloco `attributes.specs`,
    - **Então** o Catalog Service rejeita o cadastro com HTTP `422 UNPROCESSABLE_ENTITY`.

---

### PB-11: Metadados Bibliográficos para o Segmento Livros
- **História:** *Como cliente da Vitrine Books, quero consultar ISBN, autores, editora e gênero de um livro, para conhecer a ficha catalográfica completa da publicação.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/catalog-service` | **Dependências:** PB-08
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Exibição de ficha catalográfica completa*
    - **Dado** um livro cadastrado na Vitrine Books,
    - **Quando** o cliente visualiza a obra,
    - **Então** os campos `isbn`, `author`, `publisher`, `literary_genre` e `edition` são retornados formatados.
  - *Cenário 2 (Falha): Cadastro de livro com ISBN inválido*
    - **Dado** o cadastro de um novo livro,
    - **Quando** o administrador envia um ISBN com formato inválido,
    - **Então** o Catalog Service rejeita a inserção com HTTP `422 UNPROCESSABLE_ENTITY` indicando formato de ISBN inválido.

---

### PB-12: Operações Atômicas de Decremento e Restauração de Estoque
- **História:** *Como sistema de compras, quero que a baixa e a devolução de estoque ocorram de forma atômica e idempotente no Catálogo, para evitar race conditions e overbooking.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `services/catalog-service` | **Dependências:** PB-08
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Decremento condicional com estoque suficiente*
    - **Dado** um produto com 5 unidades em estoque,
    - **Quando** Orders chama `/internal/v1/inventory/decrement` solicitando 2 unidades com `operation_id: op-1`,
    - **Então** o saldo é reduzido para 3 e o registro idempotente é gravado (ADR-003).
  - *Cenário 2 (Falha): Conflito por estoque insuficiente*
    - **Dado** um produto com apenas 1 unidade,
    - **Quando** duas chamadas simultâneas tentam baixar 1 unidade cada,
    - **Então** apenas uma obtém sucesso e a outra recebe HTTP `409 INSUFFICIENT_STOCK`.

---

### PB-13: Gestão de Produtos Favoritos com Bloqueio de Tenant
- **História:** *Como cliente autenticado, quero favoritar produtos para consulta posterior, desde que a loja ativa tenha essa funcionalidade habilitada.*
- **Prioridade:** Should | **Estimativa:** 5 SP | **Módulo:** `services/catalog-service` | **Dependências:** PB-08, PB-04
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Favoritar produto em loja habilitada*
    - **Dado** um cliente logado na Vitrine Moda (`favorites: true`),
    - **Quando** envia `POST /api/v1/catalog/favorites` com o `product_id`,
    - **Então** o vínculo é persistido e um evento `FAVORITE` é enviado ao Recommendation.
  - *Cenário 2 (Falha): Bloqueio em loja com favoritos desabilitados*
    - **Dado** a Vitrine Books (`favorites: false`),
    - **Quando** uma chamada é feita a `/api/v1/catalog/favorites`,
    - **Então** o backend rejeita com HTTP `403 FEATURE_NOT_ENABLED` (ADR-004).

---

### PB-14: Comparador de Produtos Exclusivo para Tecnologia
- **História:** *Como cliente da Vitrine Tech, quero selecionar até 4 produtos de tecnologia e compará-los lado a lado, para decidir a melhor compra com base nas especificações.*
- **Prioridade:** Should | **Estimativa:** 5 SP | **Módulo:** `services/catalog-service` / Frontend | **Dependências:** PB-10
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Comparação tabular na Vitrine Tech*
    - **Dado** dois produtos de informática selecionados na Vitrine Tech,
    - **Quando** o cliente chama `GET /api/v1/catalog/products/compare?product_ids=id1,id2`,
    - **Então** recebe a matriz alinhada de atributos técnicos para exibição lado a lado.
  - *Cenário 2 (Falha): Bloqueio em loja de outro segmento*
    - **Dado** uma chamada de comparação na Vitrine Moda,
    - **Quando** o backend verifica o manifesto em cache,
    - **Então** rejeita com HTTP `422 INVALID_FEATURE_CONFIGURATION`.

---

### PB-15: Gestão de Carrinho Isolado por Cliente e Loja
- **História:** *Como cliente, quero adicionar itens ao meu carrinho e mantê-los salvos exclusivamente na loja onde estou navegando, para não misturar produtos de lojas diferentes.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/cart-service` | **Dependências:** PB-08, PB-04
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Isolamento por tupla (user_id, store_id)*
    - **Dado** um usuário com itens no carrinho na Vitrine Moda e na Vitrine Tech,
    - **Quando** consulta `GET /api/v1/cart` na Vitrine Moda,
    - **Então** visualiza apenas os itens de vestuário da Vitrine Moda.
  - *Cenário 2 (Falha): Adicionar produto inativo ou inexistente*
    - **Dado** uma tentativa de adicionar ao carrinho um produto desativado no Catálogo,
    - **Quando** Cart consulta `GET /internal/v1/catalog/products/{id}`,
    - **Então** a adição é recusada com HTTP `404 NOT_FOUND` e o carrinho não é alterado.

---

### PB-16: Processador de Pagamentos Simulados com Idempotência
- **História:** *Como serviço de pedidos, quero acionar a simulação de pagamentos (PIX, Cartão, Boleto) via rota interna com chave de idempotência, para processar cobranças com segurança sem dados financeiros reais.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/payments-service` | **Dependências:** PB-02
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Processamento simulado com aprovação*
    - **Dado** uma solicitação de pagamento com método habilitado e chave `K1`,
    - **Quando** Orders envia `POST /internal/v1/payments/simulate`,
    - **Então** Payments registra a tentativa e retorna status `APPROVED` com código de autorização simulado.
  - *Cenário 2 (Falha): Método não habilitado no manifesto da loja*
    - **Dado** que a loja não possui `BOLETO` em `manifest.payment_methods`,
    - **Quando** uma tentativa com boleto é enviada,
    - **Então** Payments rejeita com HTTP `422 INVALID_PAYMENT_METHOD`.

---

### PB-17: Cotação Simulada de Frete por Faixa de CEP e Retirada
- **História:** *Como cliente no checkout, quero cotar o valor do frete pelo meu CEP ou optar por retirada gratuita, conforme as modalidades habilitadas pela loja.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/shipping-service` | **Dependências:** PB-02
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Cotação simulada para CEP válido*
    - **Dado** uma loja com `DELIVERY` habilitado,
    - **Quando** o cliente envia `POST /api/v1/shipping/quote` com CEP `57000-000`,
    - **Então** recebe o valor do frete e o prazo estimado simulado.
  - *Cenário 2 (Falha): Modalidade não suportada pelo manifesto*
    - **Dado** a Vitrine Tech com apenas `DELIVERY` ativo,
    - **Quando** o cliente tenta solicitar cotação de `PICKUP`,
    - **Então** o serviço rejeita com HTTP `422 INVALID_FULFILLMENT_MODE`.

---

### PB-18: Orquestração do Checkout com Saga, Idempotência e Compensação Síncrona
- **História:** *Como cliente com carrinho preenchido, quero finalizar a compra fornecendo endereço/retirada e pagamento, garantindo que o pedido só seja cobrado se houver estoque, que requisições concorrentes ou retentativas não dupliquem decrementos de estoque e que a Saga seja retomada com segurança.*
- **Prioridade:** Must | **Estimativa:** 13 SP | **Módulo:** `services/orders-service` | **Dependências:** PB-12, PB-15, PB-16, PB-17
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Fluxo de checkout completo e aprovado com registro de CheckoutOperation*
    - **Dado** carrinho válido, estoque suficiente e cabeçalho `Idempotency-Key: K1`,
    - **Quando** o cliente envia `POST /api/v1/orders/checkout`,
    - **Então** o Orders Service persiste imediatamente o registro em `checkout_operations` com status `STARTED` e o hash SHA-256 do payload antes de qualquer efeito colateral; executa a baixa atômica de estoque no Catalog, simula o pagamento no Payments, fecha o pedido em `PAID`, atualiza a operação para `COMPLETED`, limpa o carrinho e envia evento de compra ao Recommendation (ADR-003).
  - *Cenário 2 (Idempotência/Sucesso): Retentativa com mesma chave e mesmo payload*
    - **Dado** uma operação de checkout já processada com sucesso (`COMPLETED`) para a chave `K1`,
    - **Quando** o cliente ou frontend reenvia o checkout com a mesma chave `K1` e mesmo hash de payload,
    - **Então** o Orders Service recupera a `CheckoutOperation` existente e retorna o pedido já criado com HTTP `200 OK`, sem disparar novas chamadas ao Catalog ou Payments e sem decrementar o estoque novamente.
  - *Cenário 3 (Idempotência/Falha): Conflito por payload divergente com mesma chave*
    - **Dado** uma operação existente gravada para `(store_id, user_id, idempotency_key)`,
    - **Quando** uma requisição chega com a mesma chave mas com hash de payload diferente (ex.: itens ou valor alterados),
    - **Então** o Orders Service rejeita a requisição imediatamente com HTTP `409 IDEMPOTENCY_CONFLICT` sem alterar o estado do pedido ou tocar no estoque.
  - *Cenário 4 (Idempotência/Concorrência): Duas requisições simultâneas com a mesma chave*
    - **Dado** duas requisições paralelas enviadas no mesmo instante com a mesma chave `K1` e mesmo payload,
    - **Quando** ambas tentam inserir em `checkout_operations`,
    - **Então** a primeira obtém a trava de transação do SQLite WAL e prossegue; a segunda é bloqueada pela restrição `UNIQUE(store_id, user_id, idempotency_key)`, aguarda a conclusão da operação ou obtém a operação em andamento, impedindo rigorosamente a execução de dois decrementos de estoque.
  - *Cenário 5 (Recusa de Pagamento): Compensação síncrona de estoque*
    - **Dado** que o simulador de pagamento retorna recusa definitiva (`PAYMENT_DECLINED`),
    - **Quando** Orders recebe a recusa,
    - **Então** aciona a devolução atômica de estoque no Catálogo (`/internal/v1/inventory/restore`), marca o pedido como `PAYMENT_FAILED` e atualiza a `CheckoutOperation` para `FAILED`.
  - *Cenário 6 (Timeout Seguro): Retenção de estoque e retomada da Saga existente*
    - **Dado** que a chamada ao simulador de pagamento sofre timeout de rede,
    - **Quando** Orders não recebe resposta definitiva,
    - **Então** o pedido transita para `PAYMENT_PENDING_CONFIRMATION`, a operação permanece em andamento e o estoque **permanece baixado**. Ao reexecutar a requisição com a mesma chave, a Saga existente é retomada via consulta à tentativa no Payments; se confirmada aprovação fecha em `PAID`, e se confirmada recusa estorna o estoque para `PAYMENT_FAILED`. Em hipótese alguma um 404 transitório ou timeout libera estoque sem confirmação terminal.

---

### PB-19: Consulta de Histórico de Pedidos e Snapshots Imutáveis
- **História:** *Como cliente ou administrador, quero consultar o histórico de compras com valores e nomes congelados no momento da compra, para manter a fidelidade contábil mesmo se o catálogo mudar.*
- **Prioridade:** Must | **Estimativa:** 3 SP | **Módulo:** `services/orders-service` | **Dependências:** PB-18
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Consulta de pedido com snapshot histórico*
    - **Dado** um pedido pago há 1 mês cujos produtos tiveram o preço alterado no Catálogo hoje,
    - **Quando** o cliente consulta `GET /api/v1/orders/{order_id}`,
    - **Então** os valores unitários e nomes exibidos permanecem idênticos aos gravados no snapshot de compra.
  - *Cenário 2 (Falha): Tentativa de consultar pedido de outro usuário ou outra loja*
    - **Dado** um cliente logado tentando acessar `GET /api/v1/orders/{order_id}` de um pedido pertencente a outro cliente,
    - **Quando** o Orders Service valida o proprietário,
    - **Então** rejeita a consulta com HTTP `403 FORBIDDEN`.

---

### PB-20: Registro de Interações Comportamentais do Usuário
- **História:** *Como motor de recomendação, quero receber eventos de visualização de produto, adição de favorito e compra, para alimentar o cálculo de afinidade do cliente.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `services/recommendation-service` | **Dependências:** PB-08, PB-04
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Registro de evento válido de visualização ou compra*
    - **Dado** um evento de navegação ou compra aprovada,
    - **Quando** o endpoint público ou interno de interações é acionado,
    - **Então** o evento é persistido em `user_interactions` com timestamp, loja, usuário e categoria.
  - *Cenário 2 (Falha): Envio de evento interno sem segredo de serviço*
    - **Dado** uma chamada externa tentando acessar `/internal/v1/recommendations/interactions`,
    - **Quando** o request não possui `X-Internal-Token` legítimo,
    - **Então** o Recommendation Service rejeita o registro com HTTP `403 INVALID_INTERNAL_TOKEN`.

---

### PB-21: Algoritmo Explicável de Recomendação com Fallback Cold Start
- **História:** *Como cliente, quero receber recomendações personalizadas baseadas no meu histórico e preferências, com explicações claras sobre o motivo de cada sugestão, mantendo a vitrine funcional mesmo em caso de falha de dependências.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `services/recommendation-service` | **Dependências:** PB-20
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Sugestões personalizadas para usuário com histórico*
    - **Dado** um usuário com compras e preferências cadastradas,
    - **Quando** chama `GET /api/v1/recommendations`,
    - **Então** recebe itens ordenados pela fórmula $4I + \min(5P, 15) + \min(3F, 9) + \min(V, 5) + 2T$ acompanhados de justificativa textual clara.
  - *Cenário 2 (Sucesso/Cold Start): Novo cliente sem interações prévias*
    - **Dado** um visitante sem compras ou visualizações gravadas,
    - **Quando** consulta as recomendações,
    - **Então** o serviço aciona o fallback de cold start retornando os itens mais populares do segmento ativo.
  - *Cenário 3 (Falha/Resiliência): Indisponibilidade do Catalog Service na obtenção de candidatos*
    - **Dado** que o Catalog Service está temporariamente inacessível (conexão recusada ou timeout 503 na rota `/internal/v1/catalog/stores/{store_id}/products/active`),
    - **Quando** o Recommendation Service tenta montar as recomendações da loja,
    - **Então** o serviço degrada graciosamente capturando a exceção sem quebrar a vitrine do cliente, retornando HTTP `200 OK` com lista vazia `[]` e indicador de fallback `degraded: true` (ou HTTP `503 SERVICE_UNAVAILABLE` com código canônico `CATALOG_UNAVAILABLE` quando solicitado em modo estrito de API).

---

### PB-22: Storefront Shell, Design System Tailwind e Roteamento SPA
- **História:** *Como desenvolvedor de frontend, quero uma casca de aplicação modular com Tailwind CSS e TanStack Query, que na Sprint 1 valide a identidade visual com fixture local mock e na Sprint 2 carregue o manifesto dinâmico real.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `apps/web` | **Dependências:** PB-02 (Sprint 1: Mock Fixture; Sprint 2: LPS Real)
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Aplicação de tema visual via fixture de teste (Sprint 1)*
    - **Dado** a casca frontend em desenvolvimento na Sprint 1,
    - **Quando** a SPA carrega o manifesto de teste local (`vitrine-fixture-dev.json`) com `primary_color: #1e40af`,
    - **Então** a aplicação injeta variáveis CSS e a interface reflete a cor azul em botões e destaques sem depender do LPS Config ainda não implementado (ADR-008).
  - *Cenário 2 (Falha): Rota de loja não encontrada na SPA*
    - **Dado** o acesso a uma rota inválida como `/loja/slug-inexistente`,
    - **Quando** a SPA tenta carregar a loja,
    - **Então** uma página amigável de erro 404 (Loja Não Encontrada) é renderizada.

---

### PB-23: Painel Administrativo Configurador de Lojas da LPS
- **História:** *Como administrador da LPS, quero um painel visual com formulário interativo de features, pagamentos e entrega, que me alerte sobre regras inválidas e crie a loja derivada.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `apps/web` | **Dependências:** PB-07, PB-22
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Criação de loja pela interface*
    - **Dado** o preenchimento de nome, slug, segmento e opções válidas,
    - **Quando** o admin clica em "Criar Loja",
    - **Então** o formulário submete a criação, exibe mensagem de sucesso e redireciona para a nova vitrine.
  - *Cenário 2 (Falha): Alerta visual de restrição violada*
    - **Dado** que o admin seleciona segmento Moda e tenta marcar comparação de produtos,
    - **Quando** a validação em tempo real é executada,
    - **Então** o botão de envio é desativado com mensagem explicativa de incompatibilidade.

---

### PB-24: Componentes Comuns de Catálogo, Vitrine e Carrinho Drawer
- **História:** *Como visitante de qualquer loja, quero navegar por grades de produtos, buscar por nome e gerenciar meu carrinho em uma gaveta lateral (*drawer*), com experiência de compra ágil.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `apps/web` | **Dependências:** PB-08, PB-15, PB-22
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Adição e atualização de carrinho sem reload*
    - **Dado** um produto listado no `ProductGrid`,
    - **Quando** o cliente clica em "Adicionar ao Carrinho",
    - **Então** a gaveta `CartDrawer` se abre exibindo o item adicionado e o total recalculado via TanStack Query.
  - *Cenário 2 (Falha): Adicionar item que esgotou no estoque*
    - **Dado** um produto cujo estoque zerou no backend,
    - **Quando** o cliente tenta adicioná-lo ao carrinho,
    - **Então** um alerta visual informa "Produto esgotado" e a adição é bloqueada.

---

### PB-25: Pontos de Extensão Variáveis dos Três Segmentos no Frontend
- **História:** *Como cliente em uma página de produto, quero ver os seletores e atributos adequados ao segmento da loja onde estou navegando (Moda, Tech ou Livros).*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `apps/web` | **Dependências:** PB-09, PB-10, PB-11, PB-24
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Renderização de seletores de vestuário em Moda*
    - **Dado** a navegação na Vitrine Moda,
    - **Quando** o cliente abre um produto,
    - **Então** o componente `FashionVariantSelector` é exibido com botões de tamanho e círculos de cor.
  - *Cenário 2 (Falha): Ausência indevida de variante de outro segmento*
    - **Dado** a navegação na Vitrine Books,
    - **Quando** o cliente inspeciona o DOM da página de produto,
    - **Então** garante que nenhum componente de comparação técnica ou grade de roupas foi montado na árvore.

---

### PB-26: Fluxo de Checkout, Seletores Dinâmicos e Telas de Pedidos
- **História:** *Como cliente pronto para comprar, quero um assistente passo a passo de checkout que mostre apenas os meios de pagamento e opções de entrega configurados na loja ativa.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `apps/web` | **Dependências:** PB-18, PB-25
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Adaptação dinâmica de métodos de pagamento no checkout*
    - **Dado** uma loja com PIX e Boleto habilitados (e Cartão desabilitado),
    - **Quando** o cliente chega à etapa de pagamento,
    - **Então** apenas as abas PIX e Boleto são renderizadas pelo `PaymentMethodSelector`.
  - *Cenário 2 (Falha): Submissão de checkout sem selecionar método de pagamento*
    - **Dado** que o cliente tenta avançar sem selecionar um método habilitado,
    - **Quando** clica em "Finalizar Compra",
    - **Então** o formulário bloqueia o envio e destaca a obrigatoriedade da seleção.

---

### PB-27: Painel de Saúde dos Serviços e Exibição de Portas Locais
- **História:** *Como avaliador acadêmico, quero visualizar uma tela de diagnóstico que liste os 9 microsserviços e suas respectivas portas locais, refletindo a condição real de cada serviço (UP, DOWN ou NOT_STARTED) em cada sprint.*
- **Prioridade:** Must | **Estimativa:** 3 SP | **Módulo:** `services/api-gateway` / Frontend | **Dependências:** PB-02, PB-22
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso/Sprint 1): Condição real na Sprint 1*
    - **Dado** a aplicação rodando ao final da Sprint 1,
    - **Quando** o usuário abre a tela `/admin/diagnostico`,
    - **Então** Gateway (:8000) e Auth (:8001) exibem status `UP` (verde), enquanto os 7 serviços planejados para sprints futuras exibem status `NOT_STARTED` (cinza/neutro) com suas respectivas portas previstas (RF-14).
  - *Cenário 2 (Sucesso/Sprint 4): Condição final na Sprint 4 com todos os serviços saudáveis*
    - **Dado** a aplicação rodando ao final da Sprint 4 com os 9 containers ativos,
    - **Quando** o usuário abre o painel de diagnóstico,
    - **Então** todos os 9 microsserviços respondem HTTP 200 em `/health` e exibem status `UP` com seus tempos de resposta em milissegundos.
  - *Cenário 3 (Falha/Degradação): Identificação de microsserviço com falha (DOWN)*
    - **Dado** que um serviço planejado para estar ativo (ex.: `auth-service` na Sprint 1 ou `catalog-service` na Sprint 2) foi derrubado manualmente ou teve falha de processo,
    - **Quando** o Gateway sonda o endpoint `/health` desse serviço ou o usuário atualiza o painel `/admin/diagnostico`,
    - **Então** o painel destaca o serviço afetado em vermelho com status inequívoco `DOWN`, exibindo mensagem de erro de conexão e distinguindo-o claramente de serviços `NOT_STARTED`.

---

### PB-28: Suíte de Testes Automatizados de Variabilidade e Concorrência
- **História:** *Como engenheiro de qualidade, quero uma suíte de testes com Pytest que valide as restrições da LPS, a idempotência do checkout e a concorrência no SQLite, para assegurar a confiabilidade acadêmica.*
- **Prioridade:** Must | **Estimativa:** 8 SP | **Módulo:** `tests/` / Monorepo | **Dependências:** PB-18, PB-21, PB-25
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Teste automatizado de regressão de variabilidade*
    - **Dado** uma loja com `favorites: false`,
    - **Quando** o teste automatizado envia chamada direta para favoritar produto,
    - **Então** valida que o retorno é obrigatoriamente HTTP `403 FEATURE_NOT_ENABLED`.
  - *Cenário 2 (Falha Esperada em Concorrência): Rejeição controlada de overbooking*
    - **Dado** 1 unidade de estoque e 5 threads disparando checkout simultâneo,
    - **Quando** o teste concorrente conclui,
    - **Então** valida que exatamente 1 compra foi `PAID` e 4 compras foram `STOCK_REJECTED`, sem travamento do SQLite WAL (ADR-005).

---

### PB-29: Demonstração e Massa de Dados dos Três Produtos Derivados
- **História:** *Como usuário da plataforma, quero executar um script de sementes (*seed*) que derive automaticamente a Vitrine Moda, Vitrine Tech e Vitrine Books com catálogos realistas, para poder demonstrar a LPS em funcionamento imediatamente.*
- **Prioridade:** Must | **Estimativa:** 5 SP | **Módulo:** `scripts/` / Documentação | **Dependências:** PB-28
- **Critérios de Aceitação:**
  - *Cenário 1 (Sucesso): Carga automatizada das três vitrines*
    - **Dado** a plataforma recém-iniciada por Docker Compose,
    - **Quando** o comando `make seed` ou `python scripts/seed_demo_stores.py` é executado,
    - **Então** as lojas `vitrine-moda`, `vitrine-tech` e `vitrine-books` são criadas com manifestos, categorias e produtos próprios disponíveis para navegação imediata.
  - *Cenário 2 (Falha): Execução de seed com banco inacessível*
    - **Dado** que os containers dos microsserviços estão desligados,
    - **Quando** o script de seed é disparado,
    - **Então** o script encerra a execução com código de saída 1 e log legível indicando impossibilidade de conexão.
