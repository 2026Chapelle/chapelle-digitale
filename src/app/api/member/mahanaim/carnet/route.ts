import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getMemberRetreatBySlug } from '@/lib/mahanaim/member-retreats-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RETREAT_SLUG = 'chambre-haute-2026'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The built-in PDF font uses WinAnsi. Normalize unsupported punctuation without
// changing the underlying meaning of scripture, meditation or prayer content.
function pdfText(s: string): string {
  return s.replace(/\r/g, '').replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...').replace(/\u00a0/g, ' ')
    .replace(/[\u2022\u25cf]/g, '-').replace(/\u0152/g, 'OE').replace(/\u0153/g, 'oe')
    .replace(/[^\x0A\x20-\x7E\xA0-\xFF]/g, '')
}

export async function GET(request: NextRequest) {
  const dayId = request.nextUrl.searchParams.get('dayId')
  if (!dayId || !UUID.test(dayId)) return NextResponse.json({ error: 'Journée invalide.' }, { status: 400 })

  const result = await getMemberRetreatBySlug(RETREAT_SLUG)
  if (result.status === 'identity_required') return NextResponse.json({ error: 'Connexion nécessaire.' }, { status: 401 })
  if (result.status === 'unavailable') return NextResponse.json({ error: 'Service indisponible.' }, { status: 503 })
  if (result.status !== 'ok' || !result.retreat.enrolled) return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 403 })

  const day = result.retreat.days.find(item => item.id === dayId)
  if (!day || !day.isUnlocked || !day.content) return NextResponse.json({ error: 'Carnet non disponible.' }, { status: 404 })

  try {
    const pdf = await PDFDocument.create()
    pdf.setTitle(`MAHANAÏM - Jour ${day.dayNumber} - ${day.title}`)
    pdf.setAuthor('CITADELLE - MAHANAÏM')
    const body = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const W = 595.28, H = 841.89, margin = 50, right = W - margin
    let page = pdf.addPage([W, H])
    let y = H - 65
    const ink = rgb(.13, .16, .25), gold = rgb(.60, .41, .13)

    function newPage() { page = pdf.addPage([W, H]); y = H - 55 }
    function line(text: string, size = 11, heading = false) {
      const font = heading ? bold : body
      const maxW = right - margin
      const lh = size * 1.5
      for (const para of pdfText(text).split('\n')) {
        const words = para.split(/\s+/).filter(Boolean)
        let current = ''
        function emit() {
          if (y < 60) newPage()
          page.drawText(current, { x: margin, y, size, font, color: heading ? gold : ink })
          y -= lh
        }
        if (words.length === 0) { y -= lh; continue }
        for (const word of words) {
          // Split extremely long words/URLs instead of overflowing page bounds.
          let rest = word
          while (rest && font.widthOfTextAtSize(rest, size) > maxW) {
            let n = 1
            while (n < rest.length && font.widthOfTextAtSize(rest.slice(0, n + 1), size) <= maxW) n++
            if (current) { emit(); current = '' }
            current = rest.slice(0, n); emit(); current = ''
            rest = rest.slice(n)
          }
          if (!rest) continue
          const next = current ? `${current} ${rest}` : rest
          if (font.widthOfTextAtSize(next, size) > maxW && current) { emit(); current = rest }
          else current = next
        }
        if (current) emit()
      }
    }
    function section(label: string, value: string | null | undefined) {
      if (!value?.trim()) return
      y -= 10; line(label.toUpperCase(), 12, true); y -= 4; line(value)
    }

    line('CITADELLE  |  MAHANAÏM', 14, true)
    y -= 12
    line(`CARNET SPIRITUEL - JOUR ${day.dayNumber}`, 20, true)
    line(day.title, 15, true)
    line(day.dayDate, 10)
    section('Référence biblique', day.scriptureReference)
    section('Texte biblique', day.content.scriptureText)
    section('Objectif', day.content.objective)
    section('Méditation', day.content.meditation)
    section('Prières', day.content.prayers.map((p, i) => `${i + 1}. ${p}`).join('\n'))
    section('Déclarations prophétiques', day.content.declarations.map((p, i) => `${i + 1}. ${p}`).join('\n'))
    section('Action pratique', day.content.action)
    y -= 14; line('MES NOTES ET SUJETS DE PRIÈRE', 12, true)
    for (let i = 0; i < 9; i++) {
      if (y < 65) newPage()
      page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: .4, color: rgb(.75, .76, .80) })
      y -= 25
    }

    const bytes = await pdf.save()
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mahanaim-jour-${day.dayNumber}.pdf"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[mahanaim/carnet] pdf_generation_failed', error)
    return NextResponse.json({ error: 'Création du carnet indisponible.' }, { status: 500 })
  }
}
