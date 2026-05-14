export const ROLEON_FEE_RATE = 0.05;
export const PIX_RATE = 0.0099;
export const PIX_FIXED = 0.09;
export const CARD_RATE = 0.0249;
export const CARD_FIXED = 0.09;

export function calcFees(ticketPrice: number, qty: number = 1, method: 'pix' | 'card' = 'pix') {
  const subtotal = ticketPrice * qty;
  const roleonFee = subtotal * ROLEON_FEE_RATE;
  const subtotalWithRoleon = subtotal + roleonFee;
  const pagarmeRate = method === 'pix' ? PIX_RATE : CARD_RATE;
  const pagarmeFixed = method === 'pix' ? PIX_FIXED : CARD_FIXED;
  const pagarmeFee = subtotalWithRoleon * pagarmeRate + pagarmeFixed;
  const total = subtotalWithRoleon + pagarmeFee;
  return { subtotal, roleonFee, pagarmeFee, total };
}
