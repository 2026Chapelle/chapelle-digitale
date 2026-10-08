export const RETREAT_DAY_CONTENT_FIELDS = [
  'title',
  'scripture_reference',
  'scripture_text',
  'meditation',
  'objective',
  'prayers',
  'declarations',
  'action',
] as const

export type RetreatDayContent = {
  id: string
  retreat_id: string
  day_number: number
  day_date: string
  title: string
  scripture_reference: string | null
  scripture_text: string | null
  meditation: string | null
  objective: string | null
  prayers: string[]
  declarations: string[]
  action: string | null
  status: string
}

export function getMissingRetreatDayFields(day: Partial<RetreatDayContent>): string[] {
  const labels: Record<(typeof RETREAT_DAY_CONTENT_FIELDS)[number], string> = {
    title: 'Titre',
    scripture_reference: 'Référence biblique',
    scripture_text: 'Texte biblique',
    meditation: 'Méditation',
    objective: 'Objectif',
    prayers: 'Prières',
    declarations: 'Déclarations prophétiques',
    action: 'Action pratique',
  }

  return RETREAT_DAY_CONTENT_FIELDS.filter((field) => {
    const value = day[field]
    return Array.isArray(value) ? value.length === 0 : typeof value !== 'string' || value.trim().length === 0
  }).map((field) => labels[field])
}
