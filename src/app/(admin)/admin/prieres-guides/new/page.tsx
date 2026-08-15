'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PrayerGuideForm } from '@/components/features/admin/PrayerGuideForm'

export default function NewPrayerGuidePage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Link href="/admin/prieres-guides" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Prières &amp; Guides
        </Link>
        <PageHeader eyebrow="Contenu spirituel" title={<>Nouvelle <span className="text-cinematic-gold">prière</span></>} description="Créer une prière/guide de la bibliothèque." />
        <div className="mt-6"><PrayerGuideForm /></div>
      </div>
    </div>
  )
}
