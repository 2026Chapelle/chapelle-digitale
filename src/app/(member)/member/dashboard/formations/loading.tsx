export default function FormationsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-36" style={{ background: 'rgba(255,255,255,0.03)' }} />
            <div className="p-4 space-y-2">
              <div className="h-4 rounded-lg w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-2 rounded-full mt-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
