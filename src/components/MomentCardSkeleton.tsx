export default function MomentCardSkeleton() {
  return (
    <div
      className="rounded-3xl overflow-hidden animate-pulse"
      style={{
        background: 'white',
        boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.05)',
        border: '1px solid rgba(226,232,240,0.7)',
      }}
    >
      <div className="p-5">

        {/* Top row: avatar + name + social line + emoji placeholder */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-200 rounded w-1/3" />
            <div className="h-2 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 shrink-0" />
        </div>

        {/* Title */}
        <div className="mb-3 space-y-1.5">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
        </div>

        {/* Destination + spots badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="h-3 bg-slate-100 rounded w-2/5" />
          <div className="h-5 bg-slate-100 rounded-full w-20" />
        </div>

        {/* Participant avatars */}
        <div className="flex items-center gap-1 mb-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-slate-200" style={{ marginLeft: i === 1 ? 0 : -6 }} />
          ))}
        </div>

        {/* Timestamp */}
        <div className="h-2 bg-slate-100 rounded w-1/3 mb-4" />

        {/* Action buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
          <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
        </div>

      </div>
    </div>
  )
}
