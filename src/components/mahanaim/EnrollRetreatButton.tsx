'use client'

import {
  useState,
} from 'react'

type Props = {
  slug: string
  label: string
  initiallyEnrolled?: boolean
}

type State =
  | 'idle'
  | 'loading'
  | 'enrolled'
  | 'error'

export default function EnrollRetreatButton({
  slug,
  label,
  initiallyEnrolled = false,
}: Props) {
  const [
    state,
    setState,
  ] =
    useState<State>(
      initiallyEnrolled
        ? 'enrolled'
        : 'idle',
    )

  async function enroll() {
    if (
      state === 'loading' ||
      state === 'enrolled'
    ) {
      return
    }

    setState('loading')

    try {
      const response =
        await fetch(
          `/api/member/mahanaim/retreats/${encodeURIComponent(slug)}/enroll`,
          {
            method: 'POST',
            cache: 'no-store',
            credentials:
              'same-origin',
          },
        )

      const payload =
        await response
          .json()
          .catch(
            () => null,
          )

      if (
        !response.ok ||
        payload?.ok !== true
      ) {
        setState('error')
        return
      }

      setState('enrolled')
    } catch {
      setState('error')
    }
  }

  if (state === 'enrolled') {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-center font-semibold text-emerald-200"
      >
        Inscription confirmée
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={enroll}
        disabled={
          state === 'loading'
        }
        className="w-full rounded-xl bg-amber-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70"
      >
        {state === 'loading'
          ? 'INSCRIPTION EN COURS...'
          : label}
      </button>

      {state === 'error' ? (
        <p
          role="alert"
          className="text-center text-sm text-red-300"
        >
          L’inscription n’a pas pu être confirmée. Réessaie dans un instant.
        </p>
      ) : null}
    </div>
  )
}