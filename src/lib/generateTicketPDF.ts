import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFileSync } from 'fs'
import { join } from 'path'

interface TicketPDFData {
  eventTitle: string
  eventDate: string
  locationName: string
  ticketTypeName: string
  pricePaid: number
  ticketNumber: string
  qrCodeUrl: string
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
  const { eventTitle, eventDate, locationName, ticketTypeName, pricePaid, ticketNumber, qrCodeUrl } = data

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([420, 595])
  const { width, height } = page.getSize()

  let fontRegular, fontBold
  try {
    const regularBytes = readFileSync(join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'))
    const boldBytes = readFileSync(join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'))
    fontRegular = await pdfDoc.embedFont(regularBytes)
    fontBold = await pdfDoc.embedFont(boldBytes)
  } catch {
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  }

  const teal = rgb(0.055, 0.643, 0.627)
  const dark = rgb(0.102, 0.102, 0.102)
  const gray = rgb(0.431, 0.431, 0.451)
  const dividerColor = rgb(0.898, 0.898, 0.898)
  const white = rgb(1, 1, 1)
  const bgColor = rgb(0.976, 0.976, 0.976)

  // Fundo
  page.drawRectangle({ x: 0, y: 0, width, height, color: bgColor })

  // Card branco
  const margin = 20
  const cardX = margin
  const cardY = margin
  const cardW = width - margin * 2
  const cardH = height - margin * 2
  page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: white })

  // Header ROLEON
  const headerH = 48
  const headerY = cardY + cardH - headerH
  const headerText = 'ROLEON'
  const headerFontSize = 18
  const headerTextW = fontBold.widthOfTextAtSize(headerText, headerFontSize)
  page.drawText(headerText, {
    x: cardX + (cardW - headerTextW) / 2,
    y: headerY + 15,
    size: headerFontSize,
    font: fontBold,
    color: teal,

  })

  // Divisor header
  let cursorY = headerY - 1
  page.drawRectangle({ x: cardX, y: cursorY, width: cardW, height: 1, color: dividerColor })
  cursorY -= 20

  // Título do evento
  const titleLines = wrapText(eventTitle, fontBold, 14, cardW - 48)
  for (const line of titleLines) {
    page.drawText(line, { x: cardX + 24, y: cursorY, size: 14, font: fontBold, color: dark })
    cursorY -= 20
  }
  cursorY -= 6

  // Data e horário
  page.drawText('Data e horario', { x: cardX + 24, y: cursorY, size: 9, font: fontRegular, color: gray })
  cursorY -= 13
  page.drawText(eventDate, { x: cardX + 24, y: cursorY, size: 10, font: fontBold, color: dark })
  cursorY -= 16

  // Local
  page.drawText('Local', { x: cardX + 24, y: cursorY, size: 9, font: fontRegular, color: gray })
  cursorY -= 13
  const localLines = wrapText(locationName, fontBold, 10, cardW - 48)
  for (const line of localLines) {
    page.drawText(line, { x: cardX + 24, y: cursorY, size: 10, font: fontBold, color: dark })
    cursorY -= 14
  }
  cursorY -= 10

  // Divisor
  page.drawRectangle({ x: cardX, y: cursorY, width: cardW, height: 1, color: dividerColor })
  cursorY -= 20

  // Tipo e valor lado a lado
  const halfW = cardW / 2
  page.drawText('Tipo do ingresso', { x: cardX + 24, y: cursorY, size: 9, font: fontRegular, color: gray })
  page.drawText('Valor pago', { x: cardX + halfW, y: cursorY, size: 9, font: fontRegular, color: gray })
  cursorY -= 13
  page.drawText(ticketTypeName, { x: cardX + 24, y: cursorY, size: 10, font: fontBold, color: dark })
  const priceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pricePaid)
  page.drawText(priceStr, { x: cardX + halfW, y: cursorY, size: 10, font: fontBold, color: dark })
  cursorY -= 16

  // Divisor
  page.drawRectangle({ x: cardX, y: cursorY, width: cardW, height: 1, color: dividerColor })
  cursorY -= 20

  // QR Code
  try {
    const qrRes = await fetch(qrCodeUrl)
    const qrBytes = await qrRes.arrayBuffer()
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBytes))
    const qrSize = 130
    const qrX = cardX + (cardW - qrSize) / 2
    cursorY -= 8
    page.drawImage(qrImage, { x: qrX, y: cursorY - qrSize, width: qrSize, height: qrSize })
    cursorY -= qrSize + 28
  } catch {
    cursorY -= 20
  }

  // Número do ingresso
  const numText = `#${ticketNumber.toUpperCase()}`
  const numW = fontBold.widthOfTextAtSize(numText, 13)
  page.drawText(numText, {
    x: cardX + (cardW - numW) / 2,
    y: cursorY,
    size: 13,
    font: fontBold,
    color: dark,

  })
  cursorY -= 18

  // Divisor rodapé
  page.drawRectangle({ x: cardX, y: cursorY, width: cardW, height: 1, color: dividerColor })
  cursorY -= 14

  // Texto rodapé
  const footerText = 'Apresente este QR Code na entrada do evento'
  const footerW = fontRegular.widthOfTextAtSize(footerText, 9)
  page.drawText(footerText, {
    x: cardX + (cardW - footerW) / 2,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: gray,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
