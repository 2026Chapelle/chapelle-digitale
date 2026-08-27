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
      ? 'border border-[#D4AF37] bg-[#D4AF37] text-[#050505] shadow-[0_0_18px_rgba(212,175,55,0.28)] hover:bg-[#F5E6A7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]'
      : 'border border-pearl/10 text-pearl/70 hover:border-pearl/20 hover:bg-pearl/5 hover:text-pearl'
    const disabledClasses = primary
      ? 'border border-gold/50 bg-gold/15 text-gold-light'
      : 'border border-pearl/10 bg-white/[0.03] text-pearl/50'

    return (
      <button
        type="button"
        onClick={handler}
        disabled={!canWrite}
        style={!canWrite && primary ? { color: '#F5E6A7' } : undefined}
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
