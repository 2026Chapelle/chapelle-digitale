'use client'
/**
 * Admin — Statistiques « Prières & Guides » (V2.3-C).
 * État vide propre si les tables SQL ne sont pas encore appliquées (sqlReady=false).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loader2, ArrowLeft, Eye, BookOpen, Download, BarChart3 } from 'lucide-react'

interface Stats {
  sqlReady: boolean; totalPublished: number; totalViews: number; totalReads: number; totalDownloads: number
  topViewed: { id: string; title: string; count: number }[]
  topRead: { id: string; title: string; count: number }[]
  topDownloaded: { id: string; title: string; count: number }[]
  byCategory: { category: string; count: number }[]
  recent: { title: string; eventType: string; createdAt: string }[]
}
const EVENT_LABEL: Record<string, string> = { public_view: 'Vue publique', member_open: 'Consultation', member_read: 'Lecture', download: 'Téléchargement' }

function Kpi({ icon: Icon, label, value, color }: any) {
  return (
    <div className="card-royal py-5 px-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel text-2xl font-black text-pearl">{value}</div>
      <div className="text-xs text-pearl/40 font-inter mt-0.5">{label}</div>
    </div>
  )
}
function Top({ title, items }: { title: string; items: { title: string; count: number }[] }) {
  return (
    <div className="card-royal">
      <h3 className="font-cinzel font-bold text-pearl text-sm mb-4">{title}</h3>
      {items.length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucune donnée.</p> : (
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-inter">
              <span className="text-pearl/70 truncate">{i + 1}. {it.title}</span><span className="text-pearl/40 tabular-nums ml-2">{it.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PrayerStatsPage() {
  const [s, setS] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/prayer-guides/stats', { credentials: 'same-origin' })
        const j = await r.json().catch(() => ({}))
        if (j?.ok) setS(j.data)
      } catch { /* noop */ }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Link href="/admin/prieres-guides" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Prières &amp; Guides
        </Link>
        <PageHeader eyebrow="Analytics" title={<>Statistiques <span className="text-cinematic-gold">Prières</span></>} description="Lectures, consultations et téléchargements des prières." />

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12 mt-6"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !s || !s.sqlReady ? (
          <div className="card-royal text-center py-16 mt-6">
            <BarChart3 className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60">Les statistiques seront disponibles après activation SQL.</p>
            <p className="font-inter text-xs text-pearl/40 mt-2">Appliquez <code>docs/sql/citadelle-v23c-prayer-guides-admin-stats.sql</code> dans le Supabase Dashboard.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi icon={BookOpen} label="Prières publiées" value={s.totalPublished} color="#D4AF37" />
              <Kpi icon={Eye} label="Consultations" value={s.totalViews} color="#0EA5E9" />
              <Kpi icon={BookOpen} label="Lectures" value={s.totalReads} color="#22C55E" />
              <Kpi icon={Download} label="Téléchargements" value={s.totalDownloads} color="#F59E0B" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Top title="Top consultées" items={s.topViewed} />
              <Top title="Top lues" items={s.topRead} />
              <Top title="Top téléchargées" items={s.topDownloaded} />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-royal">
                <h3 className="font-cinzel font-bold text-pearl text-sm mb-4">Activité par catégorie</h3>
                {s.byCategory.length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucune donnée.</p> : (
                  <div className="space-y-2">{s.byCategory.map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-xs font-inter"><span className="text-pearl/70">{c.category}</span><span className="text-pearl/40 tabular-nums">{c.count}</span></div>
                  ))}</div>
                )}
              </div>
              <div className="card-royal">
                <h3 className="font-cinzel font-bold text-pearl text-sm mb-4">Activité récente</h3>
                {s.recent.length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucune activité.</p> : (
                  <div className="space-y-2">{s.recent.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-inter">
                      <span className="text-pearl/70 truncate">{r.title}</span>
                      <span className="text-pearl/40 ml-2 whitespace-nowrap">{EVENT_LABEL[r.eventType] || r.eventType}</span>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
