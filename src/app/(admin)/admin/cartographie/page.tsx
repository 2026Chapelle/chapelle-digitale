'use client'
import { useEffect, useState } from 'react'
import { Loader2, Globe, MapPin, Users, Crown, Home, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { flagOf } from '@/lib/flags'

interface Ville { ville: string; membres: number; responsables: number }
interface PaysNode { pays: string; membres: number; responsables: number; familles: number; villes: Ville[] }
interface Data {
  nations: PaysNode[]
  totaux: { nations: number; villes: number; membres: number; responsables: number; familles: number }
}

export default function AdminCartographiePage() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/cartographie', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.demo) setDemo(true)
        else if (j.ok) setD(j)
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Stratégie · expansion"
          title={<>Cartographie du <span className="text-cinematic-gold">Royaume</span></>}
          description="Présence territoriale réelle : nations, villes, familles de la Chapelle et responsables."
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !d || d.nations.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune présence territoriale enregistrée pour le moment.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi icon={Globe} color="#22C55E" value={d.totaux.nations} label="Nations" />
              <Kpi icon={MapPin} color="#0EA5E9" value={d.totaux.villes} label="Villes" />
              <Kpi icon={Home} color="#F59E0B" value={d.totaux.familles} label="Familles / cellules" />
              <Kpi icon={Crown} color="#D4AF37" value={d.totaux.responsables} label="Responsables" />
            </div>

            <div className="card-cinematic p-5">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-gold" /> Territoires du Royaume</h2>
              <div className="space-y-2">
                {d.nations.map((n) => (
                  <div key={n.pays} className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                    <button onClick={() => setOpen(open === n.pays ? null : n.pays)} className="w-full flex items-center gap-3 p-3.5 text-left">
                      <span className="text-2xl">{flagOf(n.pays)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-cinzel text-sm font-bold text-pearl">{n.pays}</p>
                        <p className="font-inter text-[11px] text-pearl/40">
                          {n.membres} membre{n.membres > 1 ? 's' : ''} · {n.villes.filter((v) => v.ville !== 'Non renseignée').length} ville(s)
                          {n.responsables ? ` · ${n.responsables} resp.` : ''}{n.familles ? ` · ${n.familles} famille(s)` : ''}
                        </p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-pearl/40 transition-transform ${open === n.pays ? 'rotate-180' : ''}`} />
                    </button>
                    {open === n.pays && (
                      <div className="px-3.5 pb-3 border-t border-white/5 pt-3 space-y-1.5">
                        {n.villes.map((v) => (
                          <div key={v.ville} className="flex items-center justify-between text-xs font-inter">
                            <span className="text-pearl/65 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-pearl/30" /> {v.ville}</span>
                            <span className="text-pearl/40">{v.membres} membre{v.membres > 1 ? 's' : ''}{v.responsables ? ` · ${v.responsables} resp.` : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <div className="card-cinematic p-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="font-cinzel text-2xl font-black text-pearl leading-none">{value.toLocaleString('fr-FR')}</div>
      <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{label}</div>
    </div>
  )
}
