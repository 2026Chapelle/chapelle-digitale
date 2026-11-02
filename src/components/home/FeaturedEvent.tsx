'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { EventRegisterButton } from '@/components/conversion/EventRegisterButton'
import type { FeaturedHomeEvent } from '@/lib/home/featured-event'

const abidjan = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Abidjan',
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

const labels = {
  featured: '\u00c9v\u00e9nement \u00e0 la une',
  online: 'RENCONTRE EN LIGNE',
  inPerson: '\u00c9V\u00c9NEMENT \u00c0 LA UNE',
  brand: 'CITADELLE',
  timezone: 'Heure de C\u00f4te d\u2019Ivoire',
  details: 'Voir les \u00e9v\u00e9nements',
  discover: 'D\u00e9couvrir l\u2019\u00e9v\u00e9nement',
  register: "Je m'inscris",
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
  const start = Date.parse(event.starts_at)
  const end = Date.parse(event.ends_at ?? event.starts_at)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (now !== null && end <= now) return null

  const explicitHref = event.cta_href?.trim()
  const safeHref = explicitHref && (/^\/(?!\/)/.test(explicitHref) || /^https:\/\//i.test(explicitHref))
    ? explicitHref : null
  const eventDate = abidjan.format(new Date(start))

  return (
    <section aria-labelledby="featured-event-heading" className="relative isolate overflow-hidden border-y border-white/[.06] bg-[#0b0c14]">
      <div className="container-cinematic relative max-w-5xl py-10 md:py-14">
        <p className="mb-5 font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75 lg:sr-only">
          {labels.featured}
        </p>
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#0b0c14] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-2">
            {event.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_url}
                alt={`Affiche : ${event.title}`}
                loading="lazy"
                className="block h-auto w-full rounded-xl object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-[#0b0c14]">
                <CalendarDays aria-hidden="true" className="h-12 w-12 text-[#D4AF37]/50" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center py-1">
            <p className="mb-3 font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75">
              {event.is_online ? labels.online : (event.location || labels.inPerson)}
              <span className="px-2" aria-hidden="true">·</span>
              {labels.brand}
            </p>
            <h2 id="featured-event-heading" className="font-cinzel text-2xl leading-tight text-white md:text-3xl">
              {event.title}
            </h2>
            <div aria-hidden="true" className="my-5 h-px w-24 bg-gradient-to-r from-[#D4AF37]/60 to-transparent" />
            <p className="font-inter text-sm font-medium leading-6 text-[#F5E6A7] md:text-base">
              {eventDate} · {labels.timezone}
            </p>
            {event.description && (
              <p className="mt-4 max-w-prose font-inter text-sm leading-relaxed text-white/60">
                {event.description}
              </p>
            )}
            <div className="mt-6 [&>button]:min-h-[48px] [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
              {safeHref ? (
                <Link href={safeHref} className="btn-gold-cinematic inline-flex min-h-[48px] w-full items-center justify-center gap-2 sm:w-auto">
                  {event.cta_label || labels.discover}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : (
                <EventRegisterButton eventId={event.id} eventTitre={event.title} eventDate={event.starts_at} label={event.cta_label || labels.register} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
