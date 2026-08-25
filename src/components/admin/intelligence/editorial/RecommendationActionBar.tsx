import React from 'react'

type Props = {
  canWrite?: boolean
  onAccept?: () => void
  onModify?: () => void
  onSchedule?: () => void
  onReject?: () => void
}

export function RecommendationActionBar({ canWrite = false, onAccept, onModify, onSchedule, onReject }: Props) {
  const action = (label: string, handler?: () => void, primary = false) => (
    <button type="button" onClick={handler} disabled={!canWrite} className={(primary ? 'bg-cinematic-gold text-black ' : 'border border-pearl/10 text-pearl/70 ') + 'rounded-md px-2.5 py-1.5 text-xs font-medium hover:text-pearl disabled:cursor-not-allowed disabled:opacity-35'}>
      {label}
    </button>
  )
  return <div className="flex flex-wrap gap-2">{action('Accepter', onAccept, true)}{action('Modifier', onModify)}{action('Planifier', onSchedule)}{action('Rejeter', onReject)}</div>
}
