'use client'

import { useState } from 'react'
import { BackButton } from '../../../components/BackButton'

// ── Ícones ────────────────────────────────────────────────────────────────────

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: '#6E6E73',
  marginBottom: 8,
  textTransform: 'uppercase',
}

// ── Dados do FAQ ──────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'Como funciona o PIX?',
    a: 'O pagamento via PIX é processado na hora. Assim que confirmado, seu ingresso é gerado automaticamente e enviado para o seu e-mail.',
  },
  {
    q: 'Posso cancelar meu ingresso?',
    a: 'Cancelamentos são aceitos em até 7 dias após a compra e com no mínimo 48 horas de antecedência do evento. Entre em contato pelo e-mail contato@roleon.com.br.',
  },
  {
    q: 'Quanto tempo leva o reembolso?',
    a: 'Após a aprovação do cancelamento, o reembolso é realizado em até 7 dias úteis.',
  },
  {
    q: 'Onde fica meu ingresso?',
    a: 'Seus ingressos ficam disponíveis na aba Ingressos, acessível pelo menu inferior do app.',
  },
  {
    q: 'Como funciona a taxa do Roleon?',
    a: 'O Roleon cobra uma taxa de 5% sobre o valor do ingresso. Essa taxa já está incluída no preço exibido.',
  },
  {
    q: 'Não recebi o e-mail do ingresso. O que faço?',
    a: 'Verifique a pasta de spam. Se não encontrar, acesse seus ingressos diretamente pelo app em Perfil > Ingressos.',
  },
  {
    q: 'O pagamento PIX não foi confirmado. E agora?',
    a: 'Aguarde até 5 minutos. Se não confirmar, o valor será estornado automaticamente em até 1 dia útil.',
  },
]

// ── Componente ────────────────────────────────────────────────────────────────

export default function AjudaPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <div style={{
      minHeight: '100dvh', background: '#F9F9F9',
      fontFamily: "'Noto Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
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
          Ajuda
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Fale conosco */}
        <div>
          <a
            href="mailto:contato@roleon.com.br"
            style={{
              textDecoration: 'none',
              background: '#fff',
              border: '0.5px solid #E5E5EA',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              width: '100%',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Fale conosco</span>
              <span style={{ fontSize: 13, color: '#6E6E73' }}>Entre em contato pelo e-mail</span>
              <span style={{ fontSize: 13, color: '#0EA5A0', fontWeight: 500 }}>contato@roleon.com.br</span>
            </div>
            <div style={{ paddingTop: 2 }}>
              <IconChevronRight />
            </div>
          </a>
        </div>

        {/* FAQ */}
        <div>
          <div style={sectionLabelStyle}>PERGUNTAS FREQUENTES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqs.map((item, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '0.5px solid #E5E5EA',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => toggle(i)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Noto Sans', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 15, color: '#1A1A1A', fontWeight: 500, flex: 1 }}>{item.q}</span>
                  <IconChevronDown open={openIndex === i} />
                </button>

                {openIndex === i && (
                  <div style={{
                    padding: '12px 16px 14px',
                    fontSize: 14,
                    color: '#3A3A3A',
                    lineHeight: 1.6,
                    borderTop: '0.5px solid #F0F0F0',
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Rodapé */}
      <div style={{
        textAlign: 'center',
        fontSize: 12,
        color: '#6E6E73',
        padding: '32px 0',
      }}>
        Roleon v1.0.0
      </div>

    </div>
  )
}
