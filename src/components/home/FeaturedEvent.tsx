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
    <section aria-labelledby="featured-event-heading" className="relative isolate overflow-hidden border-y border-[#D4AF37]/[.08] bg-[#0b0913]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(155,87,35,0.12),transparent_47%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_10%,rgba(77,4,111,0.34),transparent_65%)]" />
      <div className="container-cinematic relative max-w-7xl py-12 sm:py-16 lg:py-20">
        <p className="mb-7 font-inter text-[10px] font-semibold uppercase tracking-[.26em] text-[#F5E6A7] lg:sr-only">
          {labels.featured}
        </p>
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12 xl:gap-14">
          <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#D4AF37]/55 bg-[#151020] p-1.5 shadow-[0_25px_75px_rgba(0,0,0,0.3)] sm:p-2">
            {event.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_url}
                alt={`Affiche : ${event.title}`}
                loading="lazy"
                className="block h-auto w-full rounded-[13px] object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-[13px] bg-gradient-to-br from-[#26183c] to-[#0b0c14]">
                <CalendarDays aria-hidden="true" className="h-14 w-14 text-[#D4AF37]/50" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center py-1 lg:py-4">
            <p className="mb-5 font-inter text-[11px] font-semibold uppercase tracking-[.22em] text-[#F5E6A7]">
              {event.is_online ? labels.online : (event.location || labels.inPerson)}
              <span className="px-2" aria-hidden="true">·</span>
              {labels.brand}
            </p>
            <h2 id="featured-event-heading" className="font-cinzel text-[2rem] font-semibold leading-[1.08] text-white sm:text-[2.7rem] lg:text-[clamp(1.9rem,2.35vw,2.9rem)]">
              {event.title}
            </h2>
            <div aria-hidden="true" className="my-7 h-px w-36 bg-gradient-to-r from-[#D4AF37]/80 to-transparent" />
            <p className="font-inter text-sm font-semibold leading-6 text-[#F5E6A7] sm:text-lg">
              {eventDate} · {labels.timezone}
            </p>
            {event.description && (
              <p className="mt-5 max-w-prose font-inter text-sm leading-7 text-white/75 sm:text-base">
                {event.description}
              </p>
            )}
            <div className="mt-8">
              {safeHref ? (
                <Link href={safeHref} className="inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl border border-[#D4AF37]/55 bg-[#D4AF37]/[.07] px-7 py-3 font-inter text-base font-semibold text-[#F5E6A7] transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/[.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5E6A7] motion-reduce:transition-none sm:w-auto">
                  {event.cta_label || labels.discover}
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
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