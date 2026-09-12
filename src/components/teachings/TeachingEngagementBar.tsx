'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  Check,
  HeartHandshake,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react'

import toast from 'react-hot-toast'

import ShareButtons from '@/components/ui/ShareButtons'

interface TeachingEngagementBarProps {
  slug: string
  title: string
  scripture?: string | null
  defaultName?: string | null
  defaultEmail?: string | null
}

export function TeachingEngagementBar({
  slug,
  title,
  scripture,
  defaultName,
  defaultEmail,
}: TeachingEngagementBarProps) {
  const [url, setUrl] =
    useState(`/enseignements/${slug}`)

  const [shareOpen, setShareOpen] =
    useState(false)

  const [prayerOpen, setPrayerOpen] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  const [name, setName] =
    useState(defaultName || '')

  const [email, setEmail] =
    useState(defaultEmail || '')

  const [subject, setSubject] =
    useState(
      scripture
        ? `Suite à l'enseignement — ${scripture}`
        : `Suite à l'enseignement — ${title}`,
    )

  const [description, setDescription] =
    useState('')

  const [submitting, setSubmitting] =
    useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(window.location.href)
    }
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Lien copié')
      window.setTimeout(
        () => setCopied(false),
        2000,
      )
    } catch {
      toast.error(
        'Impossible de copier le lien.',
      )
    }
  }

  async function nativeShare() {
    if (
      typeof navigator !== 'undefined' &&
      navigator.share
    ) {
      try {
        await navigator.share({
          title,
          text: scripture
            ? `${title} — ${scripture}`
            : title,
          url,
        })
        return
      } catch {
        return
      }
    }

    setShareOpen(
      (current) => !current,
    )
  }

  async function submitPrayer(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    if (subject.trim().length < 3) {
      toast.error(
        'Précisez le sujet de prière.',
      )
      return
    }

    if (description.trim().length < 10) {
      toast.error(
        'Décrivez votre demande en quelques mots.',
      )
      return
    }

    setSubmitting(true)

    try {
      const response =
        await fetch(
          '/api/prieres',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              nom:
                name.trim() || null,

              email:
                email.trim() || null,

              sujet:
                subject.trim(),

              description:
                description.trim(),

              categorie:
                'spirituel',

              urgent: false,

              anonyme:
                !name.trim(),

              // Une demande provenant d'un
              // enseignement reste pastorale
              // et PRIVEE par défaut.
              is_public: false,
            }),
          },
        )

      const payload =
        await response
          .json()
          .catch(() => ({}))

      if (
        !response.ok ||
        payload?.success !== true
      ) {
        throw new Error(
          payload?.error ||
            'PRAYER_SUBMISSION_FAILED',
        )
      }

      setPrayerOpen(false)
      setDescription('')

      toast.success(
        'Votre demande de prière a été reçue.',
      )
    } catch {
      toast.error(
        'La demande n’a pas pu être envoyée. Réessayez.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const actionClass =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-inter text-pearl/70 transition-all hover:border-gold/30 hover:bg-gold/[0.07] hover:text-gold'

  return (
    <>
      <section
        aria-label="Actions de l’enseignement"
        className="mt-4 mb-10 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 md:px-5"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={nativeShare}
            className={actionClass}
          >
            <Share2 className="h-4 w-4" />
            Partager
          </button>

          <button
            type="button"
            onClick={copyLink}
            className={actionClass}
          >
            {copied ? (
              <Check className="h-4 w-4 text-gold" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}

            {copied
              ? 'Lien copié'
              : 'Copier le lien'}
          </button>

          <a
            href="#commentaires"
            className={actionClass}
          >
            <MessageCircle className="h-4 w-4" />
            Commenter
          </a>
          <button
            type="button"
            onClick={() =>
              setPrayerOpen(true)
            }
            className={`${actionClass} border-gold/20 bg-gold/[0.055] text-gold`}
          >
            <HeartHandshake className="h-4 w-4" />
            Demander la prière
          </button>
        </div>

        {shareOpen && (
          <div className="mt-4 border-t border-white/[0.07] pt-4">
            <ShareButtons
              url={url}
              title={title}
              text={
                scripture ||
                'Enseignement sur Citadelle'
              }
            />
          </div>
        )}
      </section>

      {prayerOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teaching-prayer-title"
          onClick={() =>
            setPrayerOpen(false)
          }
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c0b10] shadow-2xl p-6 md:p-7"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-5 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold/65 mb-2">
                  Accompagnement spirituel
                </p>

                <h2
                  id="teaching-prayer-title"
                  className="font-cinzel text-xl md:text-2xl font-bold text-pearl"
                >
                  Demander la prière
                </h2>

                <p className="mt-2 text-sm font-inter text-pearl/50 leading-relaxed">
                  Cette demande reste privée et est transmise au Centre de prière de Citadelle.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPrayerOpen(false)
                }
                aria-label="Fermer"
                className="rounded-full border border-white/10 p-2 text-pearl/40 hover:text-pearl"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={submitPrayer}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block mb-1.5 text-xs font-inter text-pearl/50">
                    Nom
                  </span>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                    className="input-royal w-full"
                    placeholder="Votre nom"
                  />
                </label>

                <label className="block">
                  <span className="block mb-1.5 text-xs font-inter text-pearl/50">
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    className="input-royal w-full"
                    placeholder="vous@exemple.com"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block mb-1.5 text-xs font-inter text-pearl/50">
                  Sujet de prière
                </span>

                <input
                  value={subject}
                  onChange={(event) =>
                    setSubject(
                      event.target.value,
                    )
                  }
                  className="input-royal w-full"
                  required
                />
              </label>

              <label className="block">
                <span className="block mb-1.5 text-xs font-inter text-pearl/50">
                  Votre demande
                </span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  className="input-royal w-full min-h-36 resize-y"
                  placeholder="Expliquez simplement ce pour quoi vous souhaitez être soutenu dans la prière…"
                  required
                />
              </label>

              <div className="rounded-xl border border-gold/10 bg-gold/[0.035] px-4 py-3">
                <p className="text-xs font-inter text-pearl/50 leading-relaxed">
                  Confidentialité : cette demande n’est pas publiée sur le mur de prière. Elle est destinée à l’accompagnement pastoral et à l’intercession.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setPrayerOpen(false)
                  }
                  className="px-5 py-2.5 rounded-xl text-sm font-inter text-pearl/50 hover:text-pearl"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold-cinematic px-5 py-2.5 text-sm disabled:opacity-50"
                >
                  {submitting
                    ? 'Envoi…'
                    : 'Envoyer ma demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}