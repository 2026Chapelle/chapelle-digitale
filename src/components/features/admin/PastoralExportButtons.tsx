'use client'
/**
 * PastoralExportButtons (V2.5-B.2-C, Partie C — Phase 1) — export/partage CLIENT-SIDE
 * d'une réponse de l'assistant pastoral. 100 % lecture seule, aucune requête serveur,
 * aucun envoi réel : copie presse-papiers, téléchargement CSV (Blob), email pré-rempli
 * (mailto:), WhatsApp pré-rempli (wa.me), impression (→ PDF via le navigateur).
 * Aucune dépendance nouvelle. Aucune donnée inventée : on n'exporte que la réponse reçue.
 */
import { useState } from 'react'
import { Copy, Download, Mail, MessageCircle, Printer, Check } from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'
import type { AssistantResponse } from '@/lib/pastoral/assistant-report'

const ORIGIN = () => (typeof window !== 'undefined' ? window.location.origin : '')

/** Texte lisible (résumé partageable) — jamais de PII (ni tel ni email : non présents dans la réponse). */
function toPlainText(r: AssistantResponse): string {
  const lines: string[] = [r.title, '', r.summary]
  if (r.findings.length) { lines.push('', 'Constats :'); r.findings.forEach((f) => lines.push(`- ${f}`)) }
  if (r.people.length) {
    lines.push('', `Personnes concernées (${r.people.length}${r.peopleTotal > r.people.length ? ` sur ${r.peopleTotal}` : ''}) :`)
    r.people.forEach((p) => lines.push(`- ${p.name} — ${p.status} — ${p.reason}`))
  }
  if (r.suggestions.length) { lines.push('', 'Suggestions :'); r.suggestions.forEach((s) => lines.push(`- ${s}`)) }
  lines.push('', r.dataBasis)
  return lines.join('\n')
}

/** CSV des personnes concernées (échappement RFC-4180 minimal). */
function toCSV(r: AssistantResponse): string {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['nom', 'statut', 'raison', 'fiche']
  const rows = r.people.map((p) => [p.name, p.status, p.reason, `${ORIGIN()}${p.href}`].map(esc).join(','))
  return [header.map(esc).join(','), ...rows].join('\r\n')
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function PastoralExportButtons({ response }: { response: AssistantResponse }) {
  const [copied, setCopied] = useState(false)

  const text = toPlainText(response)
  const slug = response.intent.replace(/_/g, '-')
  const mailHref = `mailto:?subject=${encodeURIComponent(response.title)}&body=${encodeURIComponent(text)}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`

  async function onCopy() {
    const ok = await copyToClipboard(text)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  const btn = 'inline-flex items-center gap-1.5 text-xs font-inter px-3 py-1.5 rounded-full border text-pearl/60 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-gold transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1" data-print-hide>
      <button type="button" onClick={onCopy} className={btn}>
        {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#22C55E' }} /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copié' : 'Copier le résumé'}
      </button>
      <button type="button" onClick={() => download(`rapport-pastoral-${slug}.csv`, toCSV(response), 'text/csv;charset=utf-8')} className={btn} disabled={response.people.length === 0} style={response.people.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
        <Download className="w-3.5 h-3.5" /> CSV
      </button>
      <a href={mailHref} className={btn}><Mail className="w-3.5 h-3.5" /> Préparer un email</a>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className={btn}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
      <button type="button" onClick={() => window.print()} className={btn}><Printer className="w-3.5 h-3.5" /> Imprimer</button>
    </div>
  )
}
