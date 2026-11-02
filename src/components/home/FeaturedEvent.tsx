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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(212,175,55,0.07),transparent_55%)]" />
      <div className="container-cinematic relative max-w-6xl py-10 md:py-14">
        <p className="mb-5 font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75 lg:sr-only">
          {labels.featured}
        </p>
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-12">
          <div className="relative min-w-0">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-4 rounded-[28px] bg-[radial-gradient(ellipse_at_50%_50%,rgba(212,175,55,0.14),transparent_70%)]" />
            <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-[#0b0c14] p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(212,175,55,0.12),0_0_60px_rgba(212,175,55,0.10)] ring-1 ring-inset ring-[#F5E6A7]/10 sm:p-2">
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
          </div>

          <div className="flex min-w-0 flex-col justify-center py-1">
            <p className="mb-3 break-words font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75">
              {event.is_online ? labels.online : (event.location || labels.inPerson)}
              <span className="px-2" aria-hidden="true">·</span>
              {labels.brand}
            </p>
            <h2 id="featured-event-heading" className="break-words font-cinzel text-2xl leading-tight text-white md:text-3xl">
              {event.title}
            </h2>
            <div aria-hidden="true" className="my-5 flex items-center gap-2">
              <span className="h-px w-20 bg-gradient-to-r from-[#D4AF37]/70 to-[#D4AF37]/10" />
              <span className="h-1 w-1 rotate-45 bg-[#D4AF37]/70" />
            </div>
            <p className="break-words font-inter text-sm font-medium leading-6 text-[#F5E6A7]">
              {eventDate} · {labels.timezone}
            </p>
            {event.description && (
              <p className="mt-5 max-w-prose whitespace-pre-line break-words font-inter text-sm leading-relaxed text-white/70">
                {event.description}
              </p>
            )}
            <div className="mt-7 [&>button]:min-h-[48px] [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
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
