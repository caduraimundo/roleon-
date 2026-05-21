import { BackButton } from '../../components/BackButton'

export default function TermosPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F9F9F9',
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
          Termos de Uso
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
          1. Sobre o Roleon
        </h2>
        <p style={{ margin: '0 0 24px' }}>
          O Roleon é uma plataforma de descoberta de eventos e venda de ingressos operada por Carlos Eduardo, MEI,
          com atuação em Ouro Preto e Mariana, MG. Ao usar o Roleon, você concorda com estes Termos.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          2. Compra de ingressos
        </h2>
        <p style={{ margin: '0 0 24px' }}>
          A compra é finalizada mediante pagamento via PIX ou cartão de crédito, processado pela Pagar.me.
          O ingresso é enviado por e-mail após a confirmação do pagamento. Cada ingresso é individual e intransferível.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          3. Política de reembolso
        </h2>
        <ul style={{ margin: '0 0 24px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>
            <strong>Arrependimento:</strong> você pode solicitar cancelamento em até 7 dias após a compra, desde que
            faltem no mínimo 48 horas para o evento, conforme o Código de Defesa do Consumidor.
          </li>
          <li>
            <strong>Evento cancelado:</strong> reembolso integral em até 10 dias úteis.
          </li>
          <li>
            <strong>Evento adiado:</strong> o ingresso vale para a nova data. Reembolso apenas via suporte em{' '}
            <a href="mailto:contato@roleon.com.br" style={{ color: '#0EA5A0', textDecoration: 'none' }}>
              contato@roleon.com.br
            </a>.
          </li>
          <li>
            A taxa de serviço do Roleon não é reembolsada em nenhuma hipótese, exceto em caso de cancelamento
            do evento pelo organizador.
          </li>
        </ul>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          4. Responsabilidades
        </h2>
        <p style={{ margin: '0 0 24px' }}>
          O Roleon é intermediário entre o comprador e o produtor do evento. A realização, qualidade e segurança
          do evento são de responsabilidade exclusiva do produtor. O Roleon não se responsabiliza por alterações
          de programação, atrasos ou cancelamentos não comunicados com antecedência.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          5. Conta de usuário
        </h2>
        <p style={{ margin: '0 0 24px' }}>
          Você é responsável pela segurança do acesso à sua conta. Não compartilhe seus ingressos digitais
          antes do evento.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
          6. Foro
        </h2>
        <p style={{ margin: '0 0 28px' }}>
          Fica eleito o foro da Comarca de Ouro Preto, MG, para dirimir quaisquer controvérsias
          oriundas destes Termos.
        </p>

        <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>
          Dúvidas:{' '}
          <a href="mailto:contato@roleon.com.br" style={{ color: '#0EA5A0', textDecoration: 'none' }}>
            contato@roleon.com.br
          </a>
        </p>

      </div>
    </div>
  )
}
