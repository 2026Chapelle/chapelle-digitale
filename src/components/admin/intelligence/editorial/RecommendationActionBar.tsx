import React from 'react'

type Props = {
  canWrite?: boolean
  onAccept?: () => void
  onModify?: () => void
  onSchedule?: () => void
  onReject?: () => void
}

export function RecommendationActionBar({ canWrite = false, onAccept, onModify, onSchedule, onReject }: Props) {
  const action = (label: string, handler?: () => void, primary = false) => {
    const activeClasses = primary
      ? 'bg-cinematic-gold text-black hover:bg-cinematic-gold/90'
      : 'border border-pearl/10 text-pearl/70 hover:border-pearl/20 hover:bg-pearl/5 hover:text-pearl'
    const disabledClasses = primary
      ? 'border border-cinematic-gold/25 bg-cinematic-gold/10 text-cinematic-gold/80'
      : 'border border-pearl/10 bg-white/[0.03] text-pearl/50'

    return (
      <button
        type="button"
        onClick={handler}
        disabled={!canWrite}
        className={
          `${primary ? 'font-semibold ' : ''}rounded-md px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-100 disabled:shadow-none ` +
          (canWrite ? activeClasses : disabledClasses)
        }
      >
        {label}
      </button>
    )
  }

  return <div className="flex flex-wrap gap-2">{action('Accepter', onAccept, true)}{action('Modifier', onModify)}{action('Planifier', onSchedule)}{action('Rejeter', onReject)}</div>
}
