import type { EditorialRecommendation, EditorialRecommendationStatus } from './contracts'

export interface EditorialCalendarWindow {
  start: string
  end: string
}

export interface EditorialCalendarItem {
  recommendationId: string
  status: Extract<EditorialRecommendationStatus, 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED'>
  contentKind: string
  targetChannel: string
  scheduledFor: string
  title: string
  notes: string | null
  batchId: string | null
  priorityBand: EditorialRecommendation['priorityBand']
}

export interface EditorialCalendarReadModel {
  window: EditorialCalendarWindow | null
  items: EditorialCalendarItem[]
}

export interface EditorialCalendarSource {
  id: string
  status: EditorialRecommendationStatus
  contentKind: string
  targetChannel: string
  scheduledFor: string | null
  windowStart: string
  windowEnd: string
  title?: string | null
  notes?: string | null
  batchId?: string | null
  priorityBand?: EditorialRecommendation['priorityBand']
}

function statusRank(status: EditorialCalendarItem['status']): number {
  if (status === 'ACCEPTED') return 1
  if (status === 'SCHEDULED') return 2
  return 3
}

function isVisibleInWindow(item: EditorialCalendarSource, window: EditorialCalendarWindow): boolean {
  const date = item.scheduledFor
  if (!date) return false
  return date >= window.start && date <= window.end
}

export function buildEditorialCalendarReadModel(
  recommendations: ReadonlyArray<EditorialCalendarSource>,
  window: EditorialCalendarWindow | null = null,
): EditorialCalendarReadModel {
  const items = recommendations
    .filter((item) => item.status === 'ACCEPTED' || item.status === 'SCHEDULED' || item.status === 'COMPLETED')
    .filter((item) => (window ? isVisibleInWindow(item, window) : true))
    .map((item) => ({
      recommendationId: item.id,
      status: item.status as EditorialCalendarItem['status'],
      contentKind: item.contentKind,
      targetChannel: item.targetChannel,
      scheduledFor: item.scheduledFor ?? item.windowStart,
      title: item.title ?? item.contentKind,
      notes: item.notes ?? null,
      batchId: item.batchId ?? null,
      priorityBand: item.priorityBand ?? 'NORMALE',
    }))
    .sort((a, b) => {
      if (a.scheduledFor !== b.scheduledFor) {
        return a.scheduledFor.localeCompare(b.scheduledFor)
      }
      return statusRank(a.status) - statusRank(b.status)
    })

  return { window, items }
}

