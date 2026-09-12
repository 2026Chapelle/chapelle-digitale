'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  MessageCircle,
  Send,
  ShieldCheck,
} from 'lucide-react'

import toast from 'react-hot-toast'

interface TeachingComment {
  id: string
  display_name: string
  body: string
  created_at: string
}

interface TeachingCommentsProps {
  teachingId: string
  authenticated: boolean
}

function formatDate(
  value: string,
) {
  try {
    return new Date(
      value,
    ).toLocaleDateString(
      'fr-FR',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    )
  } catch {
    return ''
  }
}

export function TeachingComments({
  teachingId,
  authenticated,
}: TeachingCommentsProps) {
  const [comments, setComments] =
    useState<TeachingComment[]>([])

  const [body, setBody] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  async function loadComments() {
    setLoading(true)

    try {
      const response =
        await fetch(
          `/api/enseignements/${teachingId}/comments`,
          {
            credentials:
              'same-origin',
            cache: 'no-store',
          },
        )

      const payload =
        await response
          .json()
          .catch(() => ({}))

      if (
        response.ok &&
        payload?.ok
      ) {
        setComments(
          Array.isArray(
            payload.data,
          )
            ? payload.data
            : [],
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadComments()
  }, [teachingId])

  async function submitComment(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    const clean =
      body.trim()

    if (clean.length < 2) {
      toast.error(
        'Écrivez votre commentaire.',
      )
      return
    }

    if (clean.length > 2000) {
      toast.error(
        'Votre commentaire est trop long.',
      )
      return
    }

    setSubmitting(true)

    try {
      const response =
        await fetch(
          `/api/enseignements/${teachingId}/comments`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            credentials:
              'same-origin',
            body:
              JSON.stringify({
                body: clean,
              }),
          },
        )

      const payload =
        await response
          .json()
          .catch(() => ({}))

      if (
        !response.ok ||
        !payload?.ok
      ) {
        throw new Error(
          payload?.message ||
            'COMMENT_FAILED',
        )
      }

      setBody('')

      toast.success(
        'Commentaire envoyé. Il sera visible après validation.',
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ''

      toast.error(
        message &&
        message !==
          'COMMENT_FAILED'
          ? message
          : 'Le commentaire n’a pas pu être envoyé.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="commentaires"
      className="mt-10 scroll-mt-28"
      aria-labelledby="comments-title"
    >
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/60 mb-2">
            Communauté
          </p>

          <h2
            id="comments-title"
            className="font-cinzel text-xl md:text-2xl font-bold text-pearl"
          >
            Commentaires
          </h2>
        </div>

        <span className="text-xs font-inter text-pearl/35">
          {comments.length}
          {' '}
          publié
          {comments.length > 1
            ? 's'
            : ''}
        </span>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 md:p-6">
        {authenticated ? (
          <form
            onSubmit={submitComment}
            className="mb-7"
          >
            <label
              htmlFor="teaching-comment"
              className="block text-sm font-inter text-pearl/65 mb-2"
            >
              Partagez ce que cet enseignement vous inspire
            </label>

            <textarea
              id="teaching-comment"
              value={body}
              onChange={(event) =>
                setBody(
                  event.target.value,
                )
              }
              maxLength={2000}
              className="input-royal w-full min-h-28 resize-y"
              placeholder="Votre commentaire…"
            />

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-inter text-pearl/35">
                <ShieldCheck className="w-3.5 h-3.5" />
                Les commentaires sont modérés avant publication.
              </p>

              <button
                type="submit"
                disabled={
                  submitting ||
                  body.trim().length < 2
                }
                className="btn-gold-cinematic px-4 py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />

                {submitting
                  ? 'Envoi…'
                  : 'Publier mon commentaire'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-7 rounded-xl border border-gold/10 bg-gold/[0.035] px-4 py-4">
            <p className="text-sm font-inter text-pearl/60">
              Connectez-vous pour laisser un commentaire.
            </p>

            <Link
              href="/login"
              className="inline-flex mt-2 text-sm font-inter text-gold hover:text-gold/80"
            >
              Se connecter
            </Link>
          </div>
        )}

        <div className="border-t border-white/[0.07] pt-6">
          {loading ? (
            <p className="text-sm font-inter text-pearl/35">
              Chargement des commentaires…
            </p>
          ) : comments.length === 0 ? (
            <div className="py-5 text-center">
              <MessageCircle className="w-6 h-6 text-gold/35 mx-auto mb-2" />

              <p className="text-sm font-inter text-pearl/40">
                Aucun commentaire publié pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {comments.map(
                (comment) => (
                  <article
                    key={comment.id}
                    className="border-b border-white/[0.06] pb-5 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <strong className="font-inter text-sm font-semibold text-pearl/80">
                        {comment.display_name}
                      </strong>

                      <time className="text-[11px] font-inter text-pearl/30">
                        {formatDate(
                          comment.created_at,
                        )}
                      </time>
                    </div>

                    <p className="whitespace-pre-wrap text-sm md:text-[15px] font-inter leading-7 text-pearl/60">
                      {comment.body}
                    </p>
                  </article>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}