import { PageHeaderSkeleton, Skeleton, CardSkeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10">
        <PageHeaderSkeleton />

        {/* Welcome banner */}
        <Skeleton className="h-44 mb-6" rounded="rounded-3xl" />

        {/* Verse + quick wins */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="md:col-span-1 h-44" />
          <Skeleton className="md:col-span-2 h-44" />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Two column main */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-72" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-44" />
            <Skeleton className="h-56" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    </div>
  )
}
