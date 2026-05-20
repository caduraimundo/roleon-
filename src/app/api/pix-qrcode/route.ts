import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const txnId = req.nextUrl.searchParams.get('txn_id')
  if (!txnId) return new Response('missing txn_id', { status: 400 })

  const url = `https://api.pagar.me/core/v5/transactions/${txnId}/qrcode?payment_method=pix`
  const auth = `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`

  const res = await fetch(url, { headers: { Authorization: auth } })
  if (!res.ok) return new Response('error fetching QR from Pagar.me', { status: 502 })

  const contentType = res.headers.get('content-type') ?? 'image/png'
  const body = await res.arrayBuffer()
  return new Response(body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=900',
    },
  })
}
