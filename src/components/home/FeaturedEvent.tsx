'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { EventRegisterButton } from '@/components/conversion/EventRegisterButton'
import type { FeaturedHomeEvent } from '@/lib/home/featured-event'

const abidjan = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Abidjan', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

function remaining(start: string, now: number): string | null {
  const diff = Date.parse(start) - now
  if (!Number.isFinite(diff) || diff <= 0) return null
  const totalMinutes = Math.ceil(diff / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return `${days}j ${hours}h ${minutes}min`
}

export function FeaturedEvent({ event }: { event: FeaturedHomeEvent | null }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!event) return
    const update = () => setNow(Date.now())
    update()
    const interval = window.setInterval(update, 60_000)
    return () => window.clearInterval(interval)
  }, [event])
  if (!event || !event.starts_at) return null
  const end = Date.parse(event.ends_at ?? event.starts_at)
  // A CMS change, or an event reaching its end, must stop the promotion.
  if (now !== null && (Number.isNaN(end) || end <= now)) return null
  const countdown = now === null ? null : remaining(event.starts_at, now)
  const explicitHref = event.cta_href?.trim()
  const safeHref = explicitHref && (/^\/(?!\/)/.test(explicitHref) || /^https:\/\//i.test(explicitHref)) ? explicitHref : null
  const eventDate = abidjan.format(new Date(event.starts_at))
  return (
    <section aria-labelledby="featured-event-heading" className="border-b border-white/[.06] bg-[#0b0c14]">
      <div className="container-cinematic max-w-5xl py-16 md:py-20">
        <p className="font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37] mb-3">Événement à la une</p>
        <div className="home-motion-card grid md:grid-cols-2 overflow-hidden rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#1b1630] to-[#0b0c14]">
          <div className="bg-black/30 min-h-52 md:min-h-80 flex items-center justify-center">
            {event.cover_url ? (
              // Event covers are fully CMS-controlled and retain their original composition.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.cover_url} alt={`Affiche : ${event.title}`} loading="lazy" className="w-full h-auto max-h-[520px] object-contain" />
            ) : <CalendarDays aria-hidden="true" className="h-16 w-16 text-[#D4AF37]/40" />}
          </div>
          <div className="flex flex-col justify-center p-6 md:p-10">
            <h2 id="featured-event-heading" className="font-cinzel text-2xl md:text-3xl text-white">{event.title}</h2>
            {event.description && <p className="font-inter text-sm text-white/65 mt-4 line-clamp-4">{event.description}</p>}
            <p className="font-inter text-sm text-[#F5E6A7] mt-5 flex gap-2 items-center"><CalendarDays className="w-4 h-4 shrink-0" />{eventDate} (heure d’Abidjan)</p>
            {(event.is_online || event.location) && <p className="font-inter text-sm text-white/65 mt-3 flex gap-2 items-center"><MapPin className="w-4 h-4 shrink-0" />{event.location || 'En ligne'}</p>}
            {countdown && <p role="timer" className="font-inter text-sm text-[#D4AF37] mt-5">Début dans : {countdown}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-7">
              {safeHref ? (
                <Link href={safeHref} className="btn-gold-cinematic inline-flex items-center gap-2 min-h-[48px] px-6">{event.cta_label || 'Découvrir l’événement'}<ArrowRight className="w-4 h-4" /></Link>
              ) : <EventRegisterButton eventId={event.id} eventTitre={event.title} eventDate={event.starts_at} label={event.cta_label || "Je m'inscris"} />}
              <Link href="/evenements" className="font-inter text-sm text-[#F5E6A7] hover:underline">Voir tous les événements</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}