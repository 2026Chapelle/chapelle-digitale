'use client'

import {
  useEffect,
  useState,
  type RefObject,
} from 'react'

import type {
  LiveReplayPlayerHandle,
} from '@/components/live/LiveReplayPlayer'

import {
  normalizeLiveCultNoteBody,
  normalizePositionSeconds,
  normalizeScriptureReference,
  type LiveCultNote,
  type LiveCultNoteKind,
  type LiveCultNoteWrite,
} from '@/lib/live/live-cult-notes'

import {
  createLocalCultNote,
  createServerCultNote,
  deleteLocalCultNote,
  deleteServerCultNote,
  getAuthenticatedCultNoteScope,
  getServerCultNotes,
  mergeCultNotes,
  readLocalCultNotes,
  updateLocalCultNote,
  updateServerCultNote,
  writeLocalCultNotes,
  type CultNoteLocalScope,
} from '@/lib/live/live-cult-notes-client'

type Props = {
  cmsLiveId: string
  playerRef: RefObject<
    LiveReplayPlayerHandle | null
  >
  serverSync?: boolean
}

const KINDS: Array<{
  value: LiveCultNoteKind
  label: string
}> = [
  {
    value: 'note',
    label: 'Note',
  },
  {
    value: 'received_word',
    label: 'Parole reçue',
  },
  {
    value: 'scripture',
    label: 'Verset',
  },
  {
    value: 'decision',
    label: 'Décision',
  },
  {
    value: 'meditation',
    label: 'À méditer',
  },
]

function isMemberScope(
  scope: CultNoteLocalScope,
): scope is `member:${string}` {
  return scope.startsWith(
    'member:',
  )
}

function formatPosition(
  seconds: number,
) {
  const total =
    Math.max(
      0,
      Math.floor(seconds),
    )

  const hours =
    Math.floor(total / 3600)

  const minutes =
    Math.floor(
      (total % 3600) / 60,
    )

  const secs =
    total % 60

  if (hours > 0) {
    return [
      hours,
      String(minutes)
        .padStart(2, '0'),
      String(secs)
        .padStart(2, '0'),
    ].join(':')
  }

  return [
    minutes,
    String(secs)
      .padStart(2, '0'),
  ].join(':')
}

function syncWarningText() {
  return (
    'La note reste enregistrée sur cet appareil. ' +
    'La synchronisation pourra être retentée plus tard.'
  )
}

export default function LiveCultNotebook({
  cmsLiveId,
  playerRef,
  serverSync = false,
}: Props) {
  const [scope, setScope] =
    useState<CultNoteLocalScope>(
      'guest',
    )

  const [notes, setNotes] =
    useState<LiveCultNote[]>([])

  const [kind, setKind] =
    useState<LiveCultNoteKind>(
      'note',
    )

  const [body, setBody] =
    useState('')

  const [
    scriptureReference,
    setScriptureReference,
  ] = useState('')

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  )

  const [ready, setReady] =
    useState(false)

  const [warning, setWarning] =
    useState<string | null>(
      null,
    )

  const memberMode =
    serverSync &&
    isMemberScope(scope)

  useEffect(() => {
    let cancelled = false

    async function openNotebook() {
      setReady(false)
      setWarning(null)

      const authenticatedScope =
        serverSync
          ? await getAuthenticatedCultNoteScope()
          : null

      if (cancelled) {
        return
      }

      const nextScope:
        CultNoteLocalScope =
          authenticatedScope ??
          'guest'

      setScope(nextScope)

      const local =
        readLocalCultNotes(
          nextScope,
          cmsLiveId,
        )

      setNotes(local)

      if (
        serverSync &&
        authenticatedScope
      ) {
        const result =
          await getServerCultNotes(
            cmsLiveId,
          )

        if (cancelled) {
          return
        }

        if (result.ok) {
          const merged =
            mergeCultNotes(
              local,
              result.notes,
            )

          writeLocalCultNotes(
            nextScope,
            cmsLiveId,
            merged,
          )

          setNotes(merged)
        }
        else {
          setWarning(
            syncWarningText(),
          )
        }
      }

      if (!cancelled) {
        setReady(true)
      }
    }

    void openNotebook()

    return () => {
      cancelled = true
    }
  }, [
    cmsLiveId,
    serverSync,
  ])

  function refreshLocal(
    nextScope = scope,
  ) {
    setNotes(
      readLocalCultNotes(
        nextScope,
        cmsLiveId,
      ),
    )
  }

  function resetEditor() {
    setEditingId(null)
    setKind('note')
    setBody('')
    setScriptureReference('')
  }

  function beginEdit(
    note: LiveCultNote,
  ) {
    setWarning(null)
    setEditingId(note.id)
    setKind(note.kind)
    setBody(note.body)

    setScriptureReference(
      note.scriptureReference ??
        '',
    )
  }

  async function saveNote() {
    setWarning(null)

    const normalizedBody =
      normalizeLiveCultNoteBody(
        body,
      )

    if (!normalizedBody) {
      setWarning(
        'Écris une note avant de l’enregistrer.',
      )
      return
    }

    const reference =
      normalizeScriptureReference(
        scriptureReference,
      )

    if (editingId) {
      const local =
        updateLocalCultNote(
          scope,
          cmsLiveId,
          editingId,
          {
            kind,
            body:
              normalizedBody,
            scriptureReference:
              reference,
          },
        )

      if (!local) {
        setWarning(
          'Cette note est introuvable sur cet appareil.',
        )
        return
      }

      refreshLocal()

      if (memberMode) {
        const result =
          await updateServerCultNote({
            id: editingId,
            cmsLiveId,
            kind,
            body:
              normalizedBody,
            scriptureReference:
              reference,
          })

        if (!result.ok) {
          setWarning(
            syncWarningText(),
          )
        }
        else {
          const merged =
            mergeCultNotes(
              readLocalCultNotes(
                scope,
                cmsLiveId,
              ),
              [result.note],
            )

          writeLocalCultNotes(
            scope,
            cmsLiveId,
            merged,
          )

          setNotes(merged)
        }
      }

      resetEditor()
      return
    }

    const position =
      normalizePositionSeconds(
        playerRef.current
          ?.getCurrentPosition() ??
          null,
      )

    const write:
      LiveCultNoteWrite = {
        id:
          crypto.randomUUID(),
        cmsLiveId,
        kind,
        body: normalizedBody,
        positionSeconds:
          position,
        scriptureReference:
          reference,
      }

    createLocalCultNote(
      scope,
      write,
    )

    refreshLocal()
    resetEditor()

    if (memberMode) {
      void createServerCultNote(
        write,
      ).then(result => {
        if (!result.ok) {
          setWarning(
            syncWarningText(),
          )
          return
        }

        const merged =
          mergeCultNotes(
            readLocalCultNotes(
              scope,
              cmsLiveId,
            ),
            [result.note],
          )

        writeLocalCultNotes(
          scope,
          cmsLiveId,
          merged,
        )

        setNotes(merged)
      })
    }
  }

  async function removeNote(
    note: LiveCultNote,
  ) {
    setWarning(null)

    if (memberMode) {
      const result =
        await deleteServerCultNote(
          cmsLiveId,
          note.id,
        )

      if (!result.ok) {
        setWarning(
          'Suppression non synchronisée. La note a été conservée.',
        )
        return
      }
    }

    deleteLocalCultNote(
      scope,
      cmsLiveId,
      note.id,
    )

    refreshLocal()

    if (
      editingId ===
      note.id
    ) {
      resetEditor()
    }
  }

  function goToPosition(
    positionSeconds:
      number | null,
  ) {
    if (
      positionSeconds === null
    ) {
      return
    }

    const moved =
      playerRef.current
        ?.seekTo(
          positionSeconds,
        ) ?? false

    if (!moved) {
      setWarning(
        'Le lecteur n’est pas encore prêt pour revenir à ce moment.',
      )
    }
  }

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
      aria-label="Mon Carnet du Culte"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Espace privé
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            Mon Carnet du Culte
          </h3>

          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Note ce que tu reçois pendant le replay. Le moment du message est enregistré automatiquement avec ta note.
          </p>
        </div>

        <div className="text-xs text-white/45 sm:text-right">
          {memberMode
            ? 'Synchronisé avec ton espace membre.'
            : 'Enregistré uniquement sur cet appareil.'}
        </div>
      </div>

      {warning && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
        >
          {warning}
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <label className="grid gap-1.5 text-sm text-white/70">
          Type de note

          <select
            value={kind}
            onChange={event =>
              setKind(
                event.target
                  .value as
                  LiveCultNoteKind,
              )
            }
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-amber-300/50"
          >
            {KINDS.map(
              option => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm text-white/70">
          Ma note

          <textarea
            value={body}
            onChange={event =>
              setBody(
                event.target.value,
              )
            }
            maxLength={10000}
            rows={4}
            placeholder="Écris ce que tu reçois, comprends ou décides pendant ce culte…"
            className="resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-white/70">
          Référence biblique

          <input
            value={
              scriptureReference
            }
            onChange={event =>
              setScriptureReference(
                event.target.value,
              )
            }
            maxLength={200}
            placeholder="Ex. Jean 3:16"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none placeholder:text-white/30 focus:border-amber-300/50"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void saveNote()
            }
            disabled={!ready}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingId
              ? 'Enregistrer les modifications'
              : 'Enregistrer'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={
                resetEditor
              }
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/5"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        {!ready ? (
          <p className="text-sm text-white/45">
            Ouverture du carnet…
          </p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-white/45">
            Ton carnet est encore vide. Ta première note apparaîtra ici.
          </p>
        ) : (
          <div className="grid gap-3">
            {notes.map(note => {
              const label =
                KINDS.find(
                  option =>
                    option.value ===
                    note.kind,
                )?.label ??
                'Note'

              return (
                <article
                  key={note.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/65">
                      {label}
                    </span>

                    {note.positionSeconds !==
                      null && (
                      <button
                        type="button"
                        onClick={() =>
                          goToPosition(
                            note.positionSeconds,
                          )
                        }
                        className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-300/15"
                      >
                        Revenir à{' '}
                        {formatPosition(
                          note.positionSeconds,
                        )}
                      </button>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">
                    {note.body}
                  </p>

                  {note.scriptureReference && (
                    <p className="mt-2 text-xs text-amber-200/75">
                      {
                        note.scriptureReference
                      }
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        beginEdit(
                          note,
                        )
                      }
                      className="text-xs font-medium text-white/60 transition hover:text-white"
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void removeNote(
                          note,
                        )
                      }
                      className="text-xs font-medium text-red-300/70 transition hover:text-red-200"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}