import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const { order_id } = await params
  const isMock = process.env.PAGARME_API_KEY === 'ak_test_placeholder'

  if (isMock) {
    return NextResponse.json({ status: 'pending' })
  }

  const res = await fetch(`https://api.pagar.me/core/v5/orders/${order_id}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.PAGARME_API_KEY! + ':').toString('base64')}`,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ status: 'pending' })
  }

  const data = await res.json()
  return NextResponse.json({ status: data.status ?? 'pending' })
}
