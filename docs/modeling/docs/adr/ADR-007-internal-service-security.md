# ADR-007 — Autenticação interna entre microsserviços

- **Projeto:** VitrineFlex
- **Data da decisão:** 08/11/2026
- **Status:** Accepted (aprovada pelo responsável pelo projeto)
- **Baseline:** Documento Técnico v1.1

## 1. Contexto

Os serviços precisam executar chamadas internas como baixa de estoque, restauração, simulação de pagamento e consulta de dados. Essas rotas não devem ser acessíveis livremente pelo navegador nem aceitar cabeçalhos de contexto forjados.

## 2. Alternativas consideradas

- Alternativa A: mTLS entre containers.
- **Alternativa B (escolhida):** `X-Internal-Token` compartilhado em rede Docker privada, com contexto validado.
- Alternativa C: apenas repassar JWT do usuário para todos os fluxos internos.

## 3. Decisão

As rotas internas utilizarão `X-Internal-Token`, cujo valor será fornecido por variável de ambiente (`INTERNAL_SERVICE_KEY`) e compartilhado apenas entre containers autorizados na rede privada Docker. Os endpoints internos utilizarão prefixo `/internal/v1/*` e não serão publicados no roteamento público do Gateway.

O contexto de usuário/loja será propagado separadamente por `X-User-ID`, `X-User-Role` e `X-Store-ID`, mas esses cabeçalhos só serão confiáveis quando originados após validação no Gateway ou em chamada interna autenticada. O Gateway deve remover os mesmos cabeçalhos se enviados diretamente pelo navegador; em seguida injeta o segredo interno nas chamadas encaminhadas aos serviços na rede privada. O `X-Store-ID` é validado quanto ao formato na borda e validado quanto à existência/estado pelo serviço de domínio via manifesto em cache.

## 4. Justificativa

Um segredo compartilhado é mais simples de configurar, demonstrar e testar no escopo local do que mTLS, e impede chamadas internas triviais fora do ambiente autorizado. A rede privada Docker e a não publicação de endpoints internos reduzem exposição. Não equivale a identidade criptográfica individual por serviço e não deve ser apresentado como solução de produção.

## 5. Consequências e trade-offs

- Um segredo comum precisa ser protegido; vazamento afeta todos os serviços que o aceitam.
- Rotação de segredo exige atualizar ambiente/containers.
- A rede Docker privada e bind de portas em loopback são parte da decisão.
- JWT do usuário continua necessário para autorização de ações em nome do cliente; token interno não substitui autorização de domínio.

## 6. Orientações de implementação

1. Guardar `INTERNAL_SERVICE_KEY` em `.env` local ignorado pelo Git e documentar apenas a variável em `.env.example`.
2. Validar `X-Internal-Token` em toda rota `/internal/v1/*`.
3. Não mapear rotas internas no Gateway para o browser.
4. Publicar portas locais de microsserviços apenas em `127.0.0.1` para a demonstração acadêmica; em implantação pública manter serviços não expostos.
5. O Gateway remove cabeçalhos de identidade/segredo recebidos do cliente, valida JWT, injeta identidade confiável e inclui o segredo interno ao encaminhar a requisição à rede privada.
6. O Gateway valida presença/formato de `X-Store-ID`; o microsserviço valida loja ativa por manifesto/cache e aplica papel, membership e propriedade do recurso. O segredo interno isoladamente não concede permissão comercial.

## 7. Verificações e critérios de aceite

- Chamada interna sem token ou token inválido retorna 401/403.
- Chamada interna com token válido, identidade e escopo corretos é aceita.
- Browser não consegue chamar `/internal/v1/*` pelo Gateway.
- Cabeçalhos `X-User-ID`/`X-User-Role` forjados não alteram a identidade autenticada.
- `.env` real está no `.gitignore`; segredo não aparece em logs ou repositório.

## 8. Referências internas

- `docs/VitrineFlex_Documento_Tecnico_v1.1.md`
- `docs/adr/ADR-INDEX.md`
