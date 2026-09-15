'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Check,
  MessageSquare,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'

interface TeachingCommentAdmin {
  id: string
  teaching_id: string
  user_id?: string | null
  display_name: string
  body: string
  status: 'pending' | 'published' | 'rejected'
  created_at: string
  moderated_at?: string | null
  cms_teachings?: {
    title?: string | null
    slug?: string | null
  } | null
}

const endpoint =
  '/api/admin/submissions/cms_teaching_comments'

export default function TeachingCommentsAdminPage() {
  const [rows, setRows] =
    useState<TeachingCommentAdmin[]>([])

  const [loading, setLoading] =
    useState(true)

  const [filter, setFilter] =
    useState<
      'all' |
      'pending' |
      'published' |
      'rejected'
    >('pending')

  const load =
    useCallback(
      async () => {
        setLoading(true)

        try {
          const response =
            await fetch(
              endpoint,
              {
                credentials:
                  'same-origin',
                cache:
                  'no-store',
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
            setRows(
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
      },
      [],
    )

  useEffect(() => {
    void load()
  }, [load])

  async function patch(
    id: string,
    changes:
      Record<string, unknown>,
  ) {
    const response =
      await fetch(
        endpoint,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          credentials:
            'same-origin',
          body:
            JSON.stringify({
              id,
              ...changes,
            }),
        },
      )

    if (response.ok) {
      await load()
    }
  }

  async function remove(
    id: string,
  ) {
    if (
      !window.confirm(
        'Supprimer définitivement ce commentaire ?',
      )
    ) {
      return
    }

    const response =
      await fetch(
        endpoint,
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json',
          },
          credentials:
            'same-origin',
          body:
            JSON.stringify({
              id,
            }),
        },
      )

    if (response.ok) {
      await load()
    }
  }

  const visible =
    filter === 'all'
      ? rows
      : rows.filter(
          (row) =>
            row.status === filter,
        )

  const pendingCount =
    rows.filter(
      (row) =>
        row.status === 'pending',
    ).length

  return (
    <div className="pt-28 lg:pt-32 space-y-7">
      <PageHeader
        eyebrow="École du Royaume"
        title={
          <>
            Commentaires{' '}
            <span className="text-cinematic-gold">
              enseignements
            </span>
          </>
        }
        description={`${pendingCount} commentaire(s) en attente de modération.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['pending', 'En attente'],
            ['published', 'Publiés'],
            ['rejected', 'Rejetés'],
            ['all', 'Tous'],
          ] as const
        ).map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFilter(value)
              }
              className={`rounded-xl border px-3 py-2 text-xs font-inter transition-colors ${
                filter === value
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/10 bg-white/[0.025] text-pearl/50 hover:text-pearl'
              }`}
            >
              {label}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() =>
            void load()
          }
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-inter text-pearl/50 hover:text-pearl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="card-cinematic p-8 text-sm text-pearl/40">
          Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div className="card-cinematic p-10 text-center">
          <MessageSquare className="w-7 h-7 text-gold/35 mx-auto mb-3" />

          <p className="text-sm font-inter text-pearl/40">
            Aucun commentaire dans cette catégorie.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(
            (comment) => (
              <article
                key={comment.id}
                className="card-cinematic p-5 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold/55 mb-2">
                      {comment.cms_teachings
                        ?.title ||
                        'Enseignement'}
                    </p>

                    <h2 className="font-inter font-semibold text-pearl">
                      {comment.display_name}
                    </h2>

                    <p className="mt-1 text-xs font-inter text-pearl/30">
                      {new Date(
                        comment.created_at,
                      ).toLocaleString(
                        'fr-FR',
                      )}
                    </p>
                  </div>

                  <span className="self-start rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-pearl/50">
                    {comment.status}
                  </span>
                </div>

                <p className="mt-5 whitespace-pre-wrap text-sm font-inter leading-7 text-pearl/65">
                  {comment.body}
                </p>

                <div className="mt-5 pt-4 border-t border-white/[0.07] flex flex-wrap gap-2">
                  {comment.status !==
                    'published' && (
                    <button
                      type="button"
                      onClick={() =>
                        void patch(
                          comment.id,
                          {
                            status:
                              'published',
                            moderated_at:
                              new Date()
                                .toISOString(),
                          },
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-inter text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Publier
                    </button>
                  )}

                  {comment.status !==
                    'rejected' && (
                    <button
                      type="button"
                      onClick={() =>
                        void patch(
                          comment.id,
                          {
                            status:
                              'rejected',
                            moderated_at:
                              new Date()
                                .toISOString(),
                          },
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-inter text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeter
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      void remove(
                        comment.id,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-inter text-pearl/40 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  )
}