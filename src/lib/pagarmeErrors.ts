export function mapPagarmeError(acquirerCode: string | null | undefined): string {
  const map: Record<string, string> = {
    '1000': 'Pagamento não aprovado. Tente outro cartão.',
    '1001': 'Cartão vencido. Verifique a data de validade.',
    '1002': 'Transação recusada por suspeita de fraude.',
    '1004': 'Cartão com restrição. Entre em contato com seu banco.',
    '1011': 'Número do cartão inválido.',
    '1016': 'Saldo insuficiente.',
    '1017': 'Senha inválida.',
    '1019': 'Transação não permitida para este cartão.',
    '1021': 'Limite do cartão excedido.',
    '1025': 'Cartão bloqueado. Entre em contato com seu banco.',
    '1032': 'Cartão cancelado (perdido ou roubado).',
    '1045': 'Código de segurança inválido. Verifique o CVV.',
    '2000': 'Pagamento não aprovado. Tente outro cartão.',
    '2001': 'Cartão vencido. Verifique a data de validade.',
    '2002': 'Transação recusada por suspeita de fraude.',
    '2004': 'Cartão com restrição. Entre em contato com seu banco.',
    '2008': 'Cartão cancelado (reportado como perdido).',
    '2009': 'Cartão cancelado (reportado como roubado).',
  }
  return map[acquirerCode ?? '']
    ?? 'Pagamento recusado. Tente novamente ou use outro cartão.'
}
