// Taxas reais Pagar.me (contrato maio/2026)
// Processamento: R$0,55 por transação (PIX e cartão)
// Antifraude:    R$0,44 por transação de cartão
// PIX:           1,09% do valor
// Cartão 1x:     3,19% do valor
// Cartão 2x-6x:  4,49% do valor
// Margem Roleon: 5%

export function calcFees(ticketPrice: number, qty: number = 1, method: 'pix' | 'card' = 'pix') {
  const subtotal = ticketPrice * qty;

  if (method === 'pix') {
    // total = subtotal * 1.0609 + 0.55
    // (5% Roleon + 1,09% Pagar.me + R$0,55 processamento)
    const roleonFee  = subtotal * 0.05;
    const pagarmeFee = subtotal * 0.0109 + 0.55;
    const total      = subtotal + roleonFee + pagarmeFee;
    return { subtotal, roleonFee, pagarmeFee, total };
  } else {
    // Cartão 1x: total = subtotal * 1.0819 + 0.99
    // (5% Roleon + 3,19% Pagar.me + R$0,55 processamento + R$0,44 antifraude)
    const roleonFee  = subtotal * 0.05;
    const pagarmeFee = subtotal * 0.0319 + 0.99;
    const total      = subtotal + roleonFee + pagarmeFee;
    return { subtotal, roleonFee, pagarmeFee, total };
  }
}
