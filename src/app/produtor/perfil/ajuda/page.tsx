'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: '#6E6E73',
  marginBottom: 8,
  textTransform: 'uppercase',
}

const faqs = [
  {
    q: 'Como funciona o processo de aprovação de eventos?',
    a: 'Após cadastrar um evento, ele fica com status "Em análise". Nossa equipe revisa em até 48 horas úteis. Você recebe um e-mail quando for aprovado ou se houver alguma pendência.',
  },
  {
    q: 'Quando recebo o repasse das vendas?',
    a: 'O repasse é realizado automaticamente 3 dias úteis após a data do evento, direto na conta bancária cadastrada. Você acompanha o status em Vendas e Repasses no painel.',
  },
  {
    q: 'Como funciona a taxa de 4%?',
    a: 'A taxa de 4% é paga pelo comprador e já está embutida no preço do ingresso. Você anuncia o valor cheio e recebe exatamente esse valor no repasse - a taxa não sai do seu bolso.',
  },
  {
    q: 'Posso cancelar um evento após a aprovação?',
    a: 'Sim. Acesse o evento no painel e use a opção Cancelar. Os compradores são notificados automaticamente por e-mail e o reembolso é processado em até 7 dias úteis.',
  },
  {
    q: 'Como funciona o check-in?',
    a: 'Acesse a opção de check-in pelo painel do produtor e aponte a câmera para o QR Code do ingresso do participante. O sistema valida na hora e registra a presença.',
  },
  {
    q: 'Quais documentos preciso para verificar minha conta?',
    a: 'A verificação é feita pela nossa equipe com base nos dados de CPF informados no cadastro. Não é necessário enviar documentos adicionais - o processo é automático. Em caso de divergência, entraremos em contato.',
  },
  {
    q: 'Posso editar um evento depois que foi publicado?',
    a: 'Sim, com restrições. Data, local e lotes com ingressos já vendidos não podem ser alterados sem cancelar o evento. Informações como descrição e imagem podem ser editadas normalmente.',
  },
]

export default function AjudaProdutorPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const router = useRouter()

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <div style={{
      minHeight: '100dvh', background: '#F7F7F7',
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
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute', left: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: '#F7F7F7', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4.5L6.5 9L11 13.5" stroke="#1A1A1A" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 700, color: '#1A1A1A',
        }}>
          Ajuda
        </div>
      </div>

      {/* Conteudo */}
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ paddingTop: 2, flexShrink: 0 }}>
              <path d="M6 4l4 4-4 4" stroke="#C8C8C8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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

      {/* Rodape */}
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
