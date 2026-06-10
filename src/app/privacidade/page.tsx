import { BackButton } from '../../components/BackButton'

export default function PrivacidadePage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F7F7F7',
      fontFamily: "'Noto Sans', sans-serif",
      color: '#1A1A1A',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 56,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 16, paddingRight: 16,
        background: '#fff',
        borderBottom: '0.5px solid #EFEFEF',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 16 }}>
          <BackButton />
        </div>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Politica de Privacidade
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '32px 20px 80px',
        fontSize: 15,
        lineHeight: 1.75,
        color: '#1A1A1A',
      }}>

        <p style={{ fontSize: 12, color: '#6E6E73', marginTop: 0, marginBottom: 28 }}>
          Última atualização: maio de 2026
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          1. Quem somos
        </h2>
        <p style={{ margin: '0 0 24px' }}>
          O Roleon é operado por Carlos Eduardo, MEI, Ouro Preto/MG. Dúvidas sobre privacidade:{' '}
          <a href="mailto:privacidade@roleon.com.br" style={{ color: '#0EA5A0', textDecoration: 'none' }}>
            privacidade@roleon.com.br
          </a>.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          2. Dados que coletamos
        </h2>
        <ul style={{ margin: '0 0 24px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Nome, e-mail e foto de perfil (via login com Google)</li>
          <li>CPF (obrigatório para compra de ingressos)</li>
          <li>Dados de pagamento (processados pela Pagar.me - o Roleon não armazena número de cartão)</li>
          <li>Localização aproximada (para exibir eventos próximos, somente com sua permissão)</li>
          <li>Histórico de compras e eventos salvos</li>
        </ul>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          3. Por que coletamos
        </h2>
        <ul style={{ margin: '0 0 24px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Processar pagamentos e emitir ingressos</li>
          <li>Enviar o ingresso por e-mail</li>
          <li>Exibir eventos relevantes por localização</li>
          <li>Cumprir obrigações legais e fiscais</li>
        </ul>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          4. Com quem compartilhamos
        </h2>
        <ul style={{ margin: '0 0 8px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><strong>Pagar.me:</strong> processamento de pagamentos</li>
          <li><strong>Supabase:</strong> armazenamento seguro dos dados</li>
          <li><strong>Resend:</strong> envio de e-mails transacionais</li>
          <li><strong>Google:</strong> autenticação via OAuth</li>
        </ul>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#3A3A3A' }}>
          Não vendemos seus dados para terceiros.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          5. Por quanto tempo guardamos
        </h2>
        <p style={{ margin: '0 0 24px' }}>
          Dados de conta: enquanto você tiver conta ativa. Dados fiscais (CPF, transações): 5 anos
          conforme obrigação legal.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          6. Seus direitos (LGPD)
        </h2>
        <p style={{ margin: '0 0 28px' }}>
          Você tem direito a acessar, corrigir, excluir e exportar seus dados. Solicitações:{' '}
          <a href="mailto:privacidade@roleon.com.br" style={{ color: '#0EA5A0', textDecoration: 'none' }}>
            privacidade@roleon.com.br
          </a>.
        </p>

      </div>
    </div>
  )
}
