'use client'
import { useEffect, useState } from 'react'
import { Users, Loader2, Database } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

/** Suivi de la progression des étudiants (lecture) — academy_enrollments. */
export default function AdminAcademieEtudiants() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/admin/academy/enrollments', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.demo) setDemo(true)
        else if (j.ok) setRows(j.data || [])
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Académie des Élus" title={<>Suivi des <span className="text-cinematic-gold">Étudiants</span></>}
          description="Progression des étudiants inscrits à l'Académie (modules complétés, niveaux validés, XP)." />

        {demo && (
          <div className="card-cinematic p-4 mb-5 flex items-center gap-3">
            <Database className="w-4 h-4 text-gold" />
            <p className="font-inter text-sm text-pearl/60">Connectez Supabase et poussez la migration <code className="text-gold/80">academy</code> pour suivre les étudiants en temps réel.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-gold/40" />
            <p className="font-inter text-sm text-pearl/50">Aucun étudiant inscrit pour le moment.</p>
          </div>
        ) : (
          <div className="card-cinematic overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                <th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Modules</th><th className="px-4 py-3">Niveaux</th><th className="px-4 py-3">XP</th><th className="px-4 py-3">Dernière activité</th>
              </tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.03]">
                    <td className="px-4 py-3 text-pearl/80 font-mono text-xs">{e.matricule || e.student_id?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3 text-pearl/60">{e.modules_completes ?? 0} / 120</td>
                    <td className="px-4 py-3 text-pearl/60">{e.niveaux_valides ?? 0} / 6</td>
                    <td className="px-4 py-3 text-gold/80">{e.xp_total ?? 0}</td>
                    <td className="px-4 py-3 text-pearl/40">{e.updated_at ? new Date(e.updated_at).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
