/**
 * Windows temporelles comparables pour la performance 5C.
 */

import type { PerformanceWindow } from './contract'

const DAY_MS = 24 * 60 * 60 * 1000

function assertIso(iso: string): number {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) {
    throw new Error(`invalid_iso:${iso}`)
  }
  return ms
}

function startOfUtcDayIso(ms: number): string {
  const d = new Date(ms)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

function shiftDaysIso(iso: string, days: number): string {
  return new Date(assertIso(iso) + days * DAY_MS).toISOString()
}

function labelForOffset(offsetDays: number): string {
  if (offsetDays === 0) return "Aujourd'hui (UTC)"
  if (offsetDays === 1) return 'Hier (UTC)'
  return `${offsetDays} jours auparavant (UTC)`
}

export interface ComparableWindows {
  current: PerformanceWindow
  previous: PerformanceWindow
  baseline: PerformanceWindow[]
}

/**
 * Construit une fenêtre courante et des fenêtres historiques strictement
 * comparables, même durée, même ancrage intra-journalier.
 */
export function buildComparableWindows(nowIso: string, baselineDays = 7): ComparableWindows {
  const nowMs = assertIso(nowIso)
  const currentStart = startOfUtcDayIso(nowMs)
  const currentSpanMs = nowMs - assertIso(currentStart)
  const current: PerformanceWindow = {
    label: "Aujourd'hui (UTC)",
    sinceIso: currentStart,
    untilIso: nowIso,
    spanMs: currentSpanMs,
    offsetDays: 0,
  }

  const previousUntil = shiftDaysIso(nowIso, -1)
  const previousSince = shiftDaysIso(currentStart, -1)
  const previous: PerformanceWindow = {
    label: 'Hier (UTC)',
    sinceIso: previousSince,
    untilIso: previousUntil,
    spanMs: currentSpanMs,
    offsetDays: 1,
  }

  const baseline: PerformanceWindow[] = []
  for (let offsetDays = 1; offsetDays <= baselineDays; offsetDays += 1) {
    const sinceIso = shiftDaysIso(currentStart, -offsetDays)
    const untilIso = shiftDaysIso(nowIso, -offsetDays)
    baseline.push({
      label: labelForOffset(offsetDays),
      sinceIso,
      untilIso,
      spanMs: currentSpanMs,
      offsetDays,
    })
  }

  return { current, previous, baseline }
}

export function windowSpanMs(window: PerformanceWindow): number {
  return window.spanMs
}
