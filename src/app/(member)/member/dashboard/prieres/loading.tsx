export default function PrieresLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-40 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded-lg w-2/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded-lg w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-3 rounded-lg w-4/5" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
