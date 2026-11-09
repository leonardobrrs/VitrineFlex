# VitrineFlex — Pacote de Documentação v1.1

Este pacote contém a baseline técnica v1.1, as oito ADRs aprovadas, diagramas, glossário, registro da revisão da v1.0 e o histórico de alterações.

## Estado

- ADR-001 a ADR-008: **Accepted** pelo responsável pelo projeto em 08/11/2026.
- Documento técnico vigente: `docs/VitrineFlex_Documento_Tecnico_v1.1.md`.
- Baseline anterior: preservada em `archive/` sem alterações.
- Implementação: **não iniciada**. Nenhum código de aplicação ou dependência foi criado nesta etapa.

## Conteúdo

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`: especificação completa em Markdown, principal referência para Antigravity.
- `docs/VitrineFlex_Documento_Tecnico_v1.1.docx` e `.pdf`: versões editável e de leitura/revisão.
- `docs/VitrineFlex_ADRs_v1.1.md`, `.docx` e `.pdf`: índice e conjunto consolidado das ADRs.
- `docs/adr/`: ADRs individuais e índice.
- `docs/diagrams/`: PNGs e fontes Graphviz `.dot` dos diagramas atualizados.
- `docs/BASELINE_REVIEW.md`: análise da baseline 1.0 com adendo de resolução.
- `docs/OPEN_DECISIONS.md`: decisões aprovadas e questões externas/de planejamento ainda abertas.
- `docs/PROJECT_GLOSSARY.md`: glossário corrigido e alinhado à v1.1.
- `docs/CHANGELOG.md`: histórico de alterações.
- `archive/`: cópias da baseline técnica v1.0 para rastreabilidade.

## Como incorporar no repositório do projeto

Copie o conteúdo de `docs/` para a pasta `docs/` do repositório VitrineFlex. Preserve `archive/` se quiser manter a versão anterior dentro do próprio repositório. Não sobrescreva a v1.0 original; a v1.1 é um novo arquivo.

## Instrução para o Antigravity

Leia `docs/VitrineFlex_Documento_Tecnico_v1.1.md`, `docs/adr/ADR-INDEX.md` e todas as ADRs `Accepted`. Trate a v1.1 como baseline técnica vigente. Não implemente código até concluir e revisar a modelagem formal da LPS e o Product/Sprint Backlog, conforme orientação do responsável pelo projeto.
