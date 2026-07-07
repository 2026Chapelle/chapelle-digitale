'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PrayerGuideForm } from '@/components/features/admin/PrayerGuideForm'

export default function EditPrayerGuidePage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [guide, setGuide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/admin/prayer-guides/${id}`, { credentials: 'same-origin' })
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok || j?.ok !== true) setError(j?.message || 'Prière introuvable.')
        else setGuide(j.data?.guide || null)
      } catch { if (!cancelled) setError('Chargement impossible.') }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Link href="/admin/prieres-guides" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Prières &amp; Guides
        </Link>
        <PageHeader eyebrow="Contenu spirituel" title={<>Modifier la <span className="text-cinematic-gold">prière</span></>} description="Éditer une prière/guide de la bibliothèque." />
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
          ) : error ? (
            <div className="card-royal p-3 text-sm text-danger font-inter">{error}</div>
          ) : guide ? (
            <PrayerGuideForm initial={guide} id={id} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
