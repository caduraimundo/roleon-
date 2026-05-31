const SECRET = process.argv[2]
if (!SECRET) {
  console.log('Uso: node scripts/test-refund.mjs SEU_SECRET_AQUI')
  process.exit(1)
}

const BASE = 'https://www.roleon.com.br'
const AUTH = `Bearer ${SECRET}`

async function test(label, url, options, expected) {
  const res = await fetch(url, options)
  const status = res.status
  const ok = status === expected
  console.log(`\n--- ${label} ---`)
  console.log(`Status: ${status} ${ok ? '✓ correto' : `✗ esperado ${expected}`}`)
  const body = await res.json().catch(() => ({}))
  console.log('Body:', JSON.stringify(body))
}

await test(
  'Teste 1: sem autenticação (esperado 401)',
  `${BASE}/api/admin/refund`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: 'x', reason: 'cancelamento' }) },
  401
)

await test(
  'Teste 2: sem reason (esperado 400)',
  `${BASE}/api/admin/refund`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: AUTH }, body: JSON.stringify({ ticket_id: 'x' }) },
  400
)

await test(
  'Teste 3: reason inválido (esperado 400)',
  `${BASE}/api/admin/refund`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: AUTH }, body: JSON.stringify({ ticket_id: 'x', reason: 'motivo_errado' }) },
  400
)

await test(
  'Teste 4: ticket inexistente (esperado 400)',
  `${BASE}/api/admin/refund`,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: AUTH }, body: JSON.stringify({ ticket_id: '00000000-0000-0000-0000-000000000000', reason: 'cancelamento' }) },
  400
)

console.log('\n--- Testes concluídos ---')
