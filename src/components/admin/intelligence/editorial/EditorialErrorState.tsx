import React from 'react'

export type EditorialErrorKind = 'connector-unavailable' | 'partial-source' | 'empty-history' | 'refresh-failure' | 'permission-denied' | 'no-capacity' | 'no-recommendation'

const labels: Record<EditorialErrorKind, string> = {
  'connector-unavailable': 'Connecteur indisponible',
  'partial-source': 'Source partielle',
  'empty-history': 'Historique vide',
  'refresh-failure': 'Actualisation impossible',
  'permission-denied': 'Lecture ou écriture non autorisée',
  'no-capacity': 'Aucune capacité éditoriale disponible',
  'no-recommendation': 'Aucune recommandation pour cette période',
}

type Props = { kind: EditorialErrorKind; detail?: string; compact?: boolean }

export function EditorialErrorState({ kind, detail, compact = false }: Props) {
  return <div role="status" className={(compact ? 'p-3 ' : 'p-5 ') + 'rounded-lg border border-amber-500/25 bg-amber-500/5 text-sm text-amber-100'}><div className="font-medium">{labels[kind]}</div><div className="mt-1 text-xs text-amber-100/65">{detail ?? 'Aucune donnée fictive ne remplace cette information.'}</div></div>
}
