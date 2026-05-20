import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Noto Sans',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf',
      fontWeight: 700,
    },
  ],
})

const s = StyleSheet.create({
  page: {
    backgroundColor: '#F9F9F9',
    padding: 36,
    fontFamily: 'Noto Sans',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },

  // Cabeçalho
  header: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0EA5A0',
    letterSpacing: 3,
  },

  // Divisor
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },

  // Seção de informações do evento
  infoSection: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1A1A1A',
    lineHeight: 1.35,
    marginBottom: 14,
  },
  infoGroup: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: '#6E6E73',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1A1A1A',
  },

  // Seção de detalhes (tipo + valor lado a lado)
  detailSection: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
  },
  detailItem: {
    flex: 1,
  },

  // Seção do QR Code
  qrSection: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  qrImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  ticketNumber: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: 3,
  },
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#6E6E73',
    textAlign: 'center',
  },
})

interface TicketPDFProps {
  eventTitle: string
  eventDate: string
  locationName: string
  ticketTypeName: string
  pricePaid: number
  ticketNumber: string
  qrCodeUrl: string
}

export function TicketPDF({
  eventTitle,
  eventDate,
  locationName,
  ticketTypeName,
  pricePaid,
  ticketNumber,
  qrCodeUrl,
}: TicketPDFProps) {
  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(pricePaid)

  return (
    <Document>
      <Page size="A5" style={s.page}>
        <View style={s.card}>

          {/* Cabeçalho */}
          <View style={s.header}>
            <Text style={s.headerText}>ROLEON</Text>
          </View>

          <View style={s.divider} />

          {/* Informações do evento */}
          <View style={s.infoSection}>
            <Text style={s.eventTitle}>{eventTitle}</Text>

            <View style={s.infoGroup}>
              <Text style={s.infoLabel}>Data e horário</Text>
              <Text style={s.infoValue}>{eventDate}</Text>
            </View>

            <View style={s.infoGroup}>
              <Text style={s.infoLabel}>Local</Text>
              <Text style={s.infoValue}>{locationName}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Tipo do ingresso e valor pago */}
          <View style={s.detailSection}>
            <View style={s.detailItem}>
              <Text style={s.infoLabel}>Tipo do ingresso</Text>
              <Text style={s.infoValue}>{ticketTypeName}</Text>
            </View>
            <View style={s.detailItem}>
              <Text style={s.infoLabel}>Valor pago</Text>
              <Text style={s.infoValue}>{priceFormatted}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* QR Code */}
          <View style={s.qrSection}>
            <Image src={qrCodeUrl} style={s.qrImage} />
            <Text style={s.ticketNumber}>#{ticketNumber.toUpperCase()}</Text>
            <View style={s.footer}>
              <Text style={s.footerText}>
                Apresente este QR Code na entrada do evento
              </Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  )
}
