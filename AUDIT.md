# Auditoria de Segurança e Confiabilidade — Roleon

> Revisão crítica read-only. Plataforma Next.js (App Router) + Supabase + Pagar.me V5 (split, PIX/cartão).
> Banco consultado em leitura via MCP Supabase (projeto `lmjuugxjvoxyorciitjn`). Nenhum arquivo de aplicação foi alterado.

---

## 1. Sumário executivo

O checkout **confia no preço e no desconto enviados pelo client** — qualquer comprador pode pagar centavos por qualquer ingresso ou zerar o valor com um desconto arbitrário, e os códigos de cupom necessários **vazam para qualquer usuário logado** via RLS. Em paralelo, a policy de RLS de `profiles` permite que **um usuário comum se promova a `admin`** (`UPDATE ... SET role='admin'`), derrubando toda a autorização baseada em papel das rotas de produtor/admin. O **token de portaria vaza pela anon key** de qualquer evento ativo, abrindo check-in/fraude sem autenticação. No financeiro pós-venda, o **estorno usa `event.price` em vez de `price_paid`** (estorna a mais) e o **cron de repasse transfere o saldo inteiro do recipient** (mistura eventos e tem bypass de autenticação por header forjável). Há ainda vazamento de cupom/estoque em falhas de pagamento. **Recomendação: bloquear a virada para produção até corrigir os itens CRÍTICOS.**

---

## 2. Tabela de achados

| ID | Severidade | Título | Evidência |
|----|-----------|--------|-----------|
| F1 | **CRÍTICO** | Checkout confia no preço vindo do client (`ticket_type_price`) | [checkout/route.ts:132](src/app/api/checkout/route.ts:132) |
| F2 | **CRÍTICO** | Checkout confia no `discount_applied` do client → ingresso grátis | [checkout/route.ts:137](src/app/api/checkout/route.ts:137), [:191](src/app/api/checkout/route.ts:191), [:375](src/app/api/checkout/route.ts:375) |
| F3 | **CRÍTICO** | Escalonamento de privilégio: usuário pode se tornar `admin` via RLS | RLS `profiles` UPDATE `qual=(auth.uid()=id)` + grant UPDATE em `role` |
| F4 | **CRÍTICO** | Estorno usa `event.price` em vez de `price_paid` (estorna a mais) | [refund.ts:55](src/lib/refund.ts:55) |
| F5 | **ALTO** | `checkin_access_token` vaza pela anon key + brute force de token curto | RLS `events` (anon, `status='active'`) + [scan/route.ts:37](src/app/api/portaria/[event_id]/scan/route.ts:37) |
| F6 | **ALTO** | `admin/refund` usa `PAGARME_WEBHOOK_SECRET` como bearer estático | [admin/refund/route.ts:14](src/app/api/admin/refund/route.ts:14) |
| F7 | **ALTO** | Bypass de auth no cron de repasse via header `x-vercel-cron-auth` forjável | [cron/repasse/route.ts:16](src/app/api/cron/repasse/route.ts:16) |
| F8 | **ALTO** | Repasse transfere `available_amount` inteiro do recipient (mistura eventos) | [cron/repasse/route.ts:87](src/app/api/cron/repasse/route.ts:87)–[98](src/app/api/cron/repasse/route.ts:98) |
| F9 | **ALTO** | Cupom vaza (consumido sem compra) em falha de pedido PIX e recusa de cartão | [checkout/route.ts:292](src/app/api/checkout/route.ts:292), [:417](src/app/api/checkout/route.ts:417), [:429](src/app/api/checkout/route.ts:429) |
| F10 | **ALTO** | Estoque não é liberado em falha/expiração de PIX | [checkout/route.ts:281](src/app/api/checkout/route.ts:281), [:306](src/app/api/checkout/route.ts:306), [webhook:339](src/app/api/webhook/pagarme/route.ts:339) |
| F11 | **MÉDIO** | RLS de `coupons` expõe todos os cupons ativos a qualquer logado | RLS `coupons` SELECT `qual=(active=true)` p/ `authenticated` |
| F12 | **MÉDIO** | `user_id` spoofável no checkout → atribuição de ticket e bypass do limite | [checkout/route.ts:51](src/app/api/checkout/route.ts:51), [:82](src/app/api/checkout/route.ts:82) |
| F13 | **MÉDIO** | Cancelamento marca evento `cancelled` mesmo com estornos falhos | [cancel/route.ts:85](src/app/api/produtor/events/[id]/cancel/route.ts:85)–[88](src/app/api/produtor/events/[id]/cancel/route.ts:88) |
| F14 | **MÉDIO** | Webhook fail-open com env vazio + idempotência com corrida/bypass | [webhook/route.ts:37](src/app/api/webhook/pagarme/route.ts:37)–[43](src/app/api/webhook/pagarme/route.ts:43), [:51](src/app/api/webhook/pagarme/route.ts:51) |

---

## 3. Detalhamento dos achados

### F1 — CRÍTICO — Preço do ingresso vem do client
**Cenário:** O comprador chama `POST /api/checkout` com `ticket_type_price: 0.01`. Em [checkout/route.ts:132](src/app/api/checkout/route.ts:132): `let price = Number(body.ticket_type_price) || Number(event.price) || 0`. No fluxo **cartão** o preço **nunca** é re-resolvido do banco — é usado diretamente para `calcFees` e para o `amount` enviado ao Pagar.me ([:378](src/app/api/checkout/route.ts:378)) e para o `split` ([:408](src/app/api/checkout/route.ts:408)). No fluxo PIX só há re-resolução quando `ticket_type_price` está **ausente** ([:148](src/app/api/checkout/route.ts:148)); basta enviar o campo para pular a checagem.
**Evidência:** [checkout/route.ts:132](src/app/api/checkout/route.ts:132), [:148](src/app/api/checkout/route.ts:148), [:378](src/app/api/checkout/route.ts:378).
**Impacto:** ingresso vendido por centavos; o `split` para o produtor é calculado sobre o preço adulterado.
**Correção:** ignorar `ticket_type_price`/`ticket_type_name` do body. **Sempre** resolver `price` no servidor a partir de `ticket_types.price` pelo `ticket_type_id` (e validar que o `ticket_type_id` pertence ao `event_id`), ou de `events.price`. O client só deve enviar `event_id`, `ticket_type_id`, `quantity` e o `card_token`.

### F2 — CRÍTICO — Desconto (`discount_applied`) vem do client
**Cenário:** Comprador envia um `coupon_code` válido (que ele descobre via F11) e `discount_applied: 999999`. Em [checkout/route.ts:137](src/app/api/checkout/route.ts:137): `const discountApplied = couponCode ? Number(body.discount_applied) || 0 : 0`. Depois ([:191](src/app/api/checkout/route.ts:191)/[:375](src/app/api/checkout/route.ts:375)): `price = Math.max(0, price - discountApplied)` → `price = 0`. O `atomic_use_coupon` valida apenas a existência/limite do código, **não o valor do desconto**. Paga-se só as taxas fixas (centavos).
**Evidência:** [checkout/route.ts:137](src/app/api/checkout/route.ts:137), [:191](src/app/api/checkout/route.ts:191), [:375](src/app/api/checkout/route.ts:375); RPC `atomic_use_coupon` retorna `discount_type`/`discount_value` mas o código **não os usa**.
**Impacto:** ingresso gratuito com qualquer cupom ativo.
**Correção:** recalcular o desconto no servidor a partir do `discount_type`/`discount_value` retornados por `atomic_use_coupon` (lógica idêntica à de [coupon/validate/route.ts:57](src/app/api/coupon/validate/route.ts:57)-64), aplicando-o ao `price` resolvido no servidor. Descartar `body.discount_applied`.

### F3 — CRÍTICO — Escalonamento de privilégio via RLS em `profiles`
**Cenário:** A policy de UPDATE de `profiles` é `USING (auth.uid() = id)` para o role `public`, **sem `WITH CHECK` por coluna**, e o grant de coluna concede `UPDATE` em `role` ao `authenticated`. O único trigger (`trg_prevent_cpf_update`) protege apenas o **CPF**. Um usuário logado, usando a própria anon key + JWT, executa:
```js
supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
```
e passa a ser admin.
**Evidência:** RLS `profiles` UPDATE `qual=(auth.uid() = id)`; `column_privileges` confirma `authenticated → UPDATE(role)`; `prevent_cpf_update` cobre só `cpf`.
**Impacto:** derruba **toda** a autorização baseada em `profile.role` — `admin/approve-event`, `admin/refund` (via role? não, mas as rotas de produtor sim), `produtor/events/[id]/cancel`, `refund-ticket`, `portaria-token`, etc. Com role `admin`, o invasor estorna/cancela qualquer evento e lê dados de qualquer produtor.
**Correção:** revogar `UPDATE (role, pagar_me_recipient_id, pagar_me_bank_synced, email_verified, ...)` de `authenticated`/`anon` no nível de coluna, **ou** adicionar trigger `BEFORE UPDATE` que rejeite mudança de `role` (e demais colunas sensíveis) quando não for service_role. Idealmente mover `role` para uma tabela separada gerida só pelo service role.

### F4 — CRÍTICO — Estorno calcula valor por `event.price`, não `price_paid`
**Cenário:** Em [refund.ts:55](src/lib/refund.ts:55): `const refundAmount = Number(event.price)`. O valor cobrado de fato está em `ticket.price_paid` (o `unitTotal` com taxas e **com cupom aplicado**). Para um ticket comprado com cupom/lote mais barato, o estorno em [refund.ts:83](src/lib/refund.ts:83) (`amount: refundAmountCents`) é **maior** que o cobrado — prejuízo direto. Para tickets de lotes com preço acima de `event.price`, estorna a menos. O `price_paid` correto já está carregado em [refund.ts:29](src/lib/refund.ts:29) e é usado apenas no log de auditoria ([refund.ts:107](src/lib/refund.ts:107)), expondo a inconsistência (`roleon_fee_retained` fica negativo).
**Evidência:** [refund.ts:55](src/lib/refund.ts:55), [:83](src/lib/refund.ts:83), [:107](src/lib/refund.ts:107).
**Outros locais checados:** `cancel/route.ts` e `refund-ticket/route.ts` delegam tudo a `performRefund` (mesmo bug, não duplicam o cálculo); `admin/refund/route.ts` idem. **Apenas `lib/refund.ts` contém o cálculo** — corrigir num lugar resolve todos os caminhos.
**Correção:** estornar com base em `ticket.price_paid` (já em reais → `Math.round(Number(ticket.price_paid) * 100)`). Decidir explicitamente a política de retenção da margem Roleon (estornar líquido vs. cheio) e refletir no `amount`.

### F5 — ALTO — Token de portaria vaza pela anon key + brute force de token curto
**Cenário (vazamento):** RLS de `events` libera SELECT para `anon` em qualquer linha com `status='active'`, e o grant de coluna concede `SELECT(checkin_access_token)` ao `anon` (confirmado via `has_column_privilege('anon','events','checkin_access_token','SELECT') = true`). Com a anon key (embarcada no front), qualquer um faz `supabase.from('events').select('id, checkin_access_token').eq('status','active')` e obtém o token de portaria de **todos os eventos ativos**.
**Cenário (brute force):** Com o `access_token` em mãos, o invasor chama `POST /api/portaria/[event_id]/scan`. Em [scan/route.ts:37](src/app/api/portaria/[event_id]/scan/route.ts:37): se `checkin_token.length <= 6`, faz `ilike(checkin_token + '%')` — um prefixo de 6 hex casa com qualquer ingresso cujo token comece com eles. Sem rate limit no endpoint, é possível enumerar e marcar ingressos como `used` (fraude de entrada e/ou DoS contra ingressos legítimos).
**Evidência:** RLS `events` (anon/`status='active'`) + grant de coluna; [scan/route.ts:36](src/app/api/portaria/[event_id]/scan/route.ts:36)-40.
**Correção:** (a) revogar `SELECT(checkin_access_token)` de `anon`/`authenticated` (servir o token só via rota autenticada de produtor, que já existe); (b) não aceitar prefixo no scan — exigir o `checkin_token` completo, ou validar o código curto **escopado a um identificador do ingresso** + rate limit por `event_id`/IP.

### F6 — ALTO — Secret de webhook reutilizado como credencial de admin
**Cenário:** [admin/refund/route.ts:14](src/app/api/admin/refund/route.ts:14): `if (!token || token !== process.env.PAGARME_WEBHOOK_SECRET)`. O mesmo segredo configurado no painel do Pagar.me (para o webhook) é a única credencial para estornar **qualquer** ingresso. Não há vínculo com um usuário admin nem rotação independente. Vazou o secret do webhook → estornos arbitrários.
**Evidência:** [admin/refund/route.ts:14](src/app/api/admin/refund/route.ts:14); mesmo valor usado em [webhook/route.ts:38](src/app/api/webhook/pagarme/route.ts:38).
**Correção:** autenticar `admin/refund` por sessão Supabase + `role='admin'` (após corrigir F3) ou por um secret dedicado (`ADMIN_API_SECRET`) distinto do webhook. Nunca compartilhar segredos entre fronteiras de confiança.

### F7 — ALTO — Bypass de autenticação no cron de repasse
**Cenário:** [cron/repasse/route.ts:16](src/app/api/cron/repasse/route.ts:16): `const isVercelCron = req.headers.get('x-vercel-cron-auth') !== null` e [:18](src/app/api/cron/repasse/route.ts:18) `if (!isVercelCron && auth !== Bearer CRON_SECRET)`. A checagem é por **presença** do header, não pelo valor. Qualquer requisição com `x-vercel-cron-auth: x` (header arbitrário e forjável, não é segredo) pula o `CRON_SECRET` e dispara o repasse.
**Evidência:** [cron/repasse/route.ts:16](src/app/api/cron/repasse/route.ts:16)-18.
**Impacto:** invasor dispara transferências reais quando quiser (combinado com F8, antecipa/movimenta saldo).
**Correção:** remover o atalho por header de presença. Autenticar somente por `Authorization: Bearer ${CRON_SECRET}` (mecanismo oficial do Vercel Cron). Mesma observação para qualquer outro cron.

### F8 — ALTO — Repasse transfere o saldo inteiro do recipient
**Cenário:** Em [cron/repasse/route.ts:87](src/app/api/cron/repasse/route.ts:87) o código lê `available_amount` do recipient e em [:97](src/app/api/cron/repasse/route.ts:97) transfere **todo** o saldo (`amount: available`). Se o produtor tem saldo de mais de um evento (ex.: evento B ainda dentro de D+3), o saldo de B é transferido junto, mas apenas os `eventIds` de A são marcados `repasse_liberado_at` ([:111](src/app/api/cron/repasse/route.ts:111)-114) → **repasse antecipado** do evento B. Risco adicional de corrida: a query filtra `repasse_liberado_at IS NULL` ([:31](src/app/api/cron/repasse/route.ts:31)); se o cron rodar duas vezes antes do UPDATE, ambos transferem.
**Evidência:** [cron/repasse/route.ts:87](src/app/api/cron/repasse/route.ts:87)-98, [:111](src/app/api/cron/repasse/route.ts:111)-114.
**Correção:** calcular o valor a repassar **por evento** (somar `price * quantity` dos tickets `paid`/`used` do evento, ou rastrear saldo por evento) e transferir apenas esse montante, não o `available_amount` global. Tornar o cron idempotente: marcar `repasse_liberado_at` (ou criar registro de transferência) **na mesma transação/antes** da chamada externa, ou usar idempotency key no Pagar.me.

### F9 — ALTO — Cupom vaza em falhas de pagamento
**Cenário:** `atomic_use_coupon` incrementa `uses_count` **antes** de criar o pedido no Pagar.me ([checkout/route.ts:177](src/app/api/checkout/route.ts:177)-193 PIX; [:361](src/app/api/checkout/route.ts:361)-377 cartão). Se o pedido PIX falha na criação ([:282](src/app/api/checkout/route.ts:282), [:292](src/app/api/checkout/route.ts:292), [:306](src/app/api/checkout/route.ts:306)) os tickets são deletados mas **`release_coupon_use` nunca é chamado**. No cartão, recusa (402 em [:429](src/app/api/checkout/route.ts:429)) ou erro HTTP ([:417](src/app/api/checkout/route.ts:417)) retornam sem liberar o cupom. O uso fica consumido sem venda.
**Caminhos cobertos (ok):** PIX expirado/abandonado → `charge.expired`/`order.closed` no webhook libera o cupom ([webhook/route.ts:347](src/app/api/webhook/pagarme/route.ts:347)-352), **desde que o webhook dispare**.
**Evidência:** [checkout/route.ts:282](src/app/api/checkout/route.ts:282), [:292](src/app/api/checkout/route.ts:292), [:306](src/app/api/checkout/route.ts:306), [:417](src/app/api/checkout/route.ts:417)-440.
**Correção:** envolver os caminhos de falha pós-`atomic_use_coupon` com `release_coupon_use(couponCode)` (ou só consumir o cupom **após** confirmação do pedido). Idealmente atrelar o consumo ao ticket pago e reverter no mesmo bloco que deleta tickets/solta estoque.

### F10 — ALTO — Estoque não é devolvido em falha/expiração de PIX
**Cenário:** No PIX, `reserve_ticket_stock` incrementa `quantity_sold` por ticket ([checkout/route.ts:198](src/app/api/checkout/route.ts:198)). Em falha do pedido, o código faz `tickets.delete().eq('order_id', tempOrderId)` ([:281](src/app/api/checkout/route.ts:281), [:292](src/app/api/checkout/route.ts:292), [:306](src/app/api/checkout/route.ts:306)) mas **não** chama `release_ticket_stock` — ao contrário do fluxo de cartão, que libera ([:421](src/app/api/checkout/route.ts:421), [:432](src/app/api/checkout/route.ts:432), [:489](src/app/api/checkout/route.ts:489)). PIX expirado idem: o webhook `charge.expired` libera o **cupom** mas não o **estoque** ([webhook/route.ts:339](src/app/api/webhook/pagarme/route.ts:339)-352). `quantity_sold` cresce indefinidamente → lote "esgota" sem vendas.
**Evidência:** [checkout/route.ts:281](src/app/api/checkout/route.ts:281)-306; [webhook/route.ts:339](src/app/api/webhook/pagarme/route.ts:339)-352.
**Correção:** chamar `release_ticket_stock(ticket_type_id, n)` em todos os caminhos de falha do PIX e no tratamento de `charge.expired`/`order.closed` para tickets `pending` com `ticket_type_id`.

### F11 — MÉDIO — Todos os cupons ativos são legíveis por qualquer logado
**Cenário:** RLS de `coupons` tem `SELECT` para `authenticated` com `qual=(active = true)`. Qualquer usuário logado faz `supabase.from('coupons').select('code, discount_type, discount_value, ...')` e enumera **todos** os códigos ativos e seus valores — insumo direto para F2 e para uso indevido de cupons direcionados.
**Evidência:** policy `autenticado_le_cupons_ativos` em `coupons`.
**Correção:** remover a policy de leitura ampla. Validar cupom só via endpoint server-side (`coupon/validate`, que usa service role). Se o front precisar exibir algo, expor via RPC `SECURITY DEFINER` que receba o código e retorne apenas o resultado da validação.

### F12 — MÉDIO — `user_id` controlado pelo client no checkout
**Cenário:** [checkout/route.ts:51](src/app/api/checkout/route.ts:51): `const userId = user?.id || body.user_id`. Sem token válido, o `user_id` do corpo é aceito. O ticket é atribuído a esse `user_id` e o limite por usuário ([:82](src/app/api/checkout/route.ts:82) `check_user_ticket_limit`) é calculado sobre um id spoofável → contornável trocando o id a cada compra; também permite poluir os ingressos de terceiros.
**Evidência:** [checkout/route.ts:51](src/app/api/checkout/route.ts:51), [:82](src/app/api/checkout/route.ts:82)-95.
**Correção:** exigir token autenticado e usar **apenas** `user.id` derivado do JWT; rejeitar requests sem usuário (ou tratar como convidado sem `user_id`, nunca aceitar `user_id` do corpo).

### F13 — MÉDIO — Cancelamento marca evento como `cancelled` mesmo com estornos falhos
**Cenário:** Em [cancel/route.ts:46](src/app/api/produtor/events/[id]/cancel/route.ts:46)-83 o loop estorna ticket a ticket; falhas só incrementam `results.failed` e empilham o id em `results.errors` (resposta efêmera). Em seguida, [:85](src/app/api/produtor/events/[id]/cancel/route.ts:85)-88 marca o evento `cancelled` **incondicionalmente**. Tickets com estorno falho ficam em `paid`/`valid`, sem retry e sem persistência da falha além de `console.error`.
**Evidência:** [cancel/route.ts:85](src/app/api/produtor/events/[id]/cancel/route.ts:85)-88.
**Impacto:** evento "cancelado" com compradores não reembolsados e sem trilha durável para conciliação.
**Correção:** só marcar `cancelled` se `results.failed === 0`; caso contrário usar status intermediário (`cancelling`) e persistir as falhas (tabela de pendências) com retry/idempotência. Registrar cada falha em `ticket_audit_log`.

### F14 — MÉDIO — Webhook: fail-open com env vazio e idempotência frágil
**Cenário (fail-open):** [webhook/route.ts:37](src/app/api/webhook/pagarme/route.ts:37)-43 compara contra `PAGARME_WEBHOOK_USER || ''` e `PAGARME_WEBHOOK_SECRET || ''`. Se as envs não estiverem setadas (deploy mal configurado), `'' === ''` aceita qualquer requisição com `Authorization: Basic ` + base64(`:`) → payload falso de `order.paid` libera ingresso.
**Cenário (idempotência):** [:51](src/app/api/webhook/pagarme/route.ts:51)-70 consulta `webhook_logs` por `pagarme_event_id` **antes** de processar (bom), mas (a) se `payload.id` for null a checagem é pulada; (b) sem unique constraint/transação, dois retries simultâneos podem passar ambos pelo SELECT vazio e processar (reenvio de e-mail e regeneração de `checkin_token`).
**Evidência:** [webhook/route.ts:37](src/app/api/webhook/pagarme/route.ts:37)-43, [:51](src/app/api/webhook/pagarme/route.ts:51)-70.
**Correção:** abortar com 500 se as envs do webhook não estiverem definidas (não comparar contra `''`); usar comparação de tempo constante. Para idempotência: `UNIQUE(pagarme_event_id)` em `webhook_logs` e inserir o registro **antes** de processar, tratando violação de unicidade como duplicata.

---

## 4. Veredito das hipóteses

| Hipótese | Veredito | Justificativa |
|----------|----------|---------------|
| **H1** — Webhook sem validação de assinatura/Basic Auth | **REFUTADA (com ressalva)** | O handler **valida Basic Auth** (`PAGARME_WEBHOOK_USER`/`SECRET`) em [webhook/route.ts:37](src/app/api/webhook/pagarme/route.ts:37)-43 — mecanismo suportado pelo Pagar.me V5. Ressalva: **fail-open** se as envs estiverem vazias (F14). Recomenda-se também validar contra spoofing buscando o pedido na API do Pagar.me antes de marcar `paid`. |
| **H2** — Webhook reprocessa em retry | **PARCIAL** | Há checagem de idempotência por `pagarme_event_id` **antes** de processar ([webhook:51](src/app/api/webhook/pagarme/route.ts:51)), porém sem unique constraint/transação (corrida) e totalmente pulada quando `payload.id` é null (F14). |
| **H3** — `reserve_ticket_stock` / oversell | **PARCIAL** | A RPC usa `SELECT ... FOR UPDATE` corretamente (lock por linha), então dois compradores simultâneos **não** levam o último ingresso. Mas: (a) o checkout só reserva quando há `ticket_type_id` ([checkout:197](src/app/api/checkout/route.ts:197)/[:451](src/app/api/checkout/route.ts:451)) — sem ele não há reserva; (b) estoque não é devolvido em falha/expiração de PIX (F10). |
| **H4** — Cupom vaza em caminhos de falha | **CONFIRMADA** | Vaza em falha de criação de pedido PIX e em recusa/erro de cartão (sem `release_coupon_use`) — F9. PIX expirado/abandonado **é** revertido pelo webhook. |
| **H5** — Refund usa `event.price` em vez de `price_paid` | **CONFIRMADA** | [refund.ts:55](src/lib/refund.ts:55). É o único ponto de cálculo; `cancel`, `refund-ticket` e `admin/refund` herdam o bug via `performRefund`. Não há outra ocorrência do padrão em relatórios — F4. |
| **H6** — Cancelamento com falha parcial marca `cancelled` mesmo assim | **CONFIRMADA** | [cancel/route.ts:85](src/app/api/produtor/events/[id]/cancel/route.ts:85)-88 marca `cancelled` incondicionalmente; tickets falhos ficam `paid`/`valid`, sem retry nem persistência — F13. |
| **H7** — `admin/refund` usa secret de webhook como credencial de admin | **CONFIRMADA** | [admin/refund/route.ts:14](src/app/api/admin/refund/route.ts:14) — F6. Ver inventário de auth abaixo. |
| **H8** — RLS das tabelas sensíveis | **PARCIAL** | RLS **habilitado em todas** as tabelas. `profiles`/`tickets`/`waitlist`/`push_subscriptions`/`saved_events` restringem por `auth.uid()`; `webhook_logs` e `ticket_audit_log` **sem policies** (deny para anon/authenticated, ok). **Falhas**: `coupons` expõe todos os ativos (F11); `events.checkin_access_token` legível por `anon` (F5); policy de UPDATE de `profiles` permite **auto-promoção a admin** (F3). CPF/PIX/dados bancários **não** vazam para anon (RLS de linha bloqueia, apesar do grant de coluna). |

### Inventário de autenticação por rota (apoio a H7)

- **Sessão Supabase + dono do recurso:** `profile/*`, `push/*`, `waitlist`, `account/delete`, `produtor/upload-cover`.
- **Sessão + `role` (producer/admin) + ownership do evento:** `produtor/events/*`, `produtor/coupons*`, `produtor/analytics`, `produtor/checkin`, `cancel`, `refund-ticket`, `portaria-token`, `participantes`. ⚠️ Toda essa camada é anulável por F3 (auto-promoção a admin).
- **Sessão + `role='admin'`:** `admin/approve-event`, `admin/events/[id]/approve|reject`, `admin/fila`. ⚠️ Idem F3.
- **Secret de cron (`CRON_SECRET`):** `cron/reminder` (Bearer, ok); `cron/repasse` (Bearer **+ bypass por header forjável** — F7).
- **Secret estático compartilhado:** `admin/refund` usa `PAGARME_WEBHOOK_SECRET` (F6).
- **Basic Auth do webhook:** `webhook/pagarme` (fail-open se env vazio — F14).
- **Sem autenticação real (rate-limit/segredo de recurso apenas):** `checkout` (rate-limit por IP; `user_id` spoofável — F12), `coupon/validate`, `checkout/status*`, `pix-qrcode`, `portaria/[event_id]` GET e `scan` (gate é o `checkin_access_token`, que vaza — F5).

---

## 5. Plano de correção ordenado por risco

**Bloco A — Integridade do dinheiro no checkout (CRÍTICO, sair juntos):**
1. F1 + F2 — recalcular **preço e desconto inteiramente no servidor** (resolver `ticket_type` por id no banco; aplicar desconto a partir de `discount_value`/`discount_type` do `atomic_use_coupon`). Descartar `ticket_type_price` e `discount_applied` do body.
2. F12 — derivar `user_id` apenas do JWT no mesmo passo.
3. F11 — fechar a leitura ampla de `coupons` (remove o insumo de F2).

**Bloco B — Autorização e segredos (CRÍTICO/ALTO, sair juntos):**
4. F3 — impedir auto-alteração de `role` (revogar grant de coluna + trigger guard). É pré-requisito para confiar em qualquer checagem de `role`.
5. F6 — segredo dedicado/sessão admin para `admin/refund`.
6. F7 — remover bypass por header no cron de repasse.

**Bloco C — Portaria (ALTO):**
7. F5 — revogar `SELECT(checkin_access_token)` do `anon`; exigir token completo no scan + rate limit.

**Bloco D — Estorno e repasse (CRÍTICO/ALTO, financeiro pós-venda):**
8. F4 — estornar por `price_paid` (corrige `cancel`, `refund-ticket`, `admin/refund` de uma vez).
9. F8 — repasse por valor calculado por evento + idempotência.
10. F13 — não marcar evento `cancelled` com estornos falhos; persistir pendências.

**Bloco E — Consistência em falhas de pagamento (ALTO/MÉDIO):**
11. F9 — liberar cupom em todos os caminhos de falha pós-consumo.
12. F10 — liberar estoque em falha/expiração de PIX.
13. F14 — webhook: abortar com env vazio + `UNIQUE(pagarme_event_id)` antes de processar.

> **Janela atual:** Pagar.me está em modo TESTE — os blocos A–D devem ser corrigidos e testados **antes** de virar a chave para produção. Os achados são baratos de corrigir agora e caros (perda financeira/fraude) depois.
