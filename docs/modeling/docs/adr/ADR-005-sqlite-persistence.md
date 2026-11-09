# ADR-005 — SQLite por serviço com WAL e controle de contenção

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

A disciplina sugere Python e os trabalhos de referência utilizaram Docker e SQLite. A baseline propõe database-per-service. Porém, o SQLite possui limitações de concorrência, especialmente em múltiplas escritas simultâneas.

## 2. Alternativas consideradas

- Alternativa A: PostgreSQL central com bancos/schemas por serviço.
- **Alternativa B (escolhida):** SQLite por serviço com WAL, timeout e tratamento de contenção.

## 3. Decisão

Manter um arquivo SQLite independente por serviço, com SQLAlchemy, e padronizar:

- `PRAGMA journal_mode=WAL`;
- `PRAGMA busy_timeout=5000` (5 segundos);
- transações curtas;
- índices para `store_id` e filtros frequentes;
- sessão/conexão isolada por unidade de trabalho;
- retry limitado somente para operações que sejam seguras/idempotentes;
- volumes Docker próprios para persistência de cada serviço.

A documentação afirmará explicitamente que WAL permite melhor coexistência de leitores e escritor, mas continua existindo apenas um escritor ativo por vez.

## 4. Justificativa

A decisão respeita a simplicidade do ambiente acadêmico, elimina necessidade de serviço de banco externo e mantém propriedade dos dados por microsserviço. As configurações reduzem bloqueios transitórios, mas não transformam SQLite em banco de escrita altamente concorrente.

## 5. Consequências e trade-offs

- Menor esforço de instalação e execução local.
- Cada serviço controla seu próprio esquema e arquivo.
- Cargas elevadas de escrita podem serializar e elevar latência.
- Os testes devem incluir contenção e checkout concorrente.
- Migração futura para PostgreSQL por serviço permanece possível, mas fora do MVP.

## 6. Orientações de implementação

1. Configurar WAL e `busy_timeout` na inicialização de cada engine/conexão.
2. Não compartilhar arquivo `.db` entre microsserviços.
3. Evitar transações abertas durante chamadas HTTP externas.
4. Executar chamadas de rede fora da transação de escrita sempre que possível.
5. Aplicar update condicional de estoque numa transação curta.
6. Documentar volumes e backups locais; não incluir bancos de demonstração com dados pessoais reais no Git.

## 7. Verificações e critérios de aceite

- Cada serviço cria/abre apenas seu banco.
- `PRAGMA journal_mode` retorna `wal`.
- `PRAGMA busy_timeout` retorna 5000.
- Teste com leituras concorrentes e tentativas simultâneas de estoque não corrompe dados.
- Teste demonstra que, sob escrita concorrente, há serialização/espera e não se promete múltiplos escritores simultâneos.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
