# ADR-006 — Imutabilidade do segmento e versionamento do manifesto

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

A configuração de uma loja pode mudar após haver produtos, favoritos e pedidos. Alterar o segmento comercial após a persistência do catálogo poderia invalidar atributos, variantes e histórico. Desligar uma feature com dados existentes também pode afetar a consulta histórica.

## 2. Alternativas consideradas

- Alternativa A: manifesto totalmente mutável, sem histórico.
- **Alternativa B (escolhida):** segmento imutável e opcionais versionadas.
- Alternativa C: manifesto completamente imutável; qualquer alteração exigiria nova loja.

## 3. Decisão

O segmento (`FASHION`, `TECH` ou `BOOKS`) será imutável após a criação da loja. Alterações permitidas em features comportamentais/opcionais gerarão uma nova revisão do `ProductManifest` (`manifest_version = manifest_version + 1`). O manifesto anterior será mantido para rastreabilidade.

Orders armazenará a `manifest_version` utilizada na compra. Desabilitar feature não apagará os dados históricos: os registros serão preservados, mas a interface e as operações novas seguirão a versão atual. Features estruturais ou com dados incompatíveis não poderão ser desativadas até que exista estratégia explícita e segura.

## 4. Justificativa

A regra separa variabilidade estrutural do segmento e variabilidade comportamental. Evita que uma loja de livros seja convertida em loja de moda por atualização de configuração e preserva evidência de qual configuração gerou cada pedido.

## 5. Consequências e trade-offs

- A configuração deixa de ser sobrescrita sem histórico.
- A recuperação da loja sempre usa a versão corrente, enquanto pedidos preservam a versão transacional.
- Features podem ser ocultadas/desativadas sem apagar registros históricos.
- A validação pode rejeitar atualização que afete dados em uso; derivar outra loja pode ser necessário para alterações estruturais.

## 6. Orientações de implementação

1. `ProductManifest` deve possuir `manifest_version`, `schema_version`, `created_at` e referência à loja.
2. O LPS Configuration Service mantém histórico ordenado das versões.
3. `segment` não é editável após a criação.
4. Alteração de opcionais cria versão nova, sem atualizar o registro antigo in place.
5. Orders grava a versão vigente no momento de checkout.
6. A regra de ativação de feature deve ser aplicada com a versão atual, respeitando o TTL de cache definido em ADR-004.

## 7. Verificações e critérios de aceite

- Manifesto v1 continua consultável após criação da v2.
- Segmento não pode ser alterado por PATCH.
- Feature Comparison não pode ser habilitada em loja não Tech.
- Pedidos antigos continuam exibindo snapshots mesmo após desativação de feature.
- Feature com dados incompatíveis não pode ser desativada sem regra de migração/compatibilidade.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
