import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function EngagementLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-44" />
            <Skeleton className="h-72" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    </div>
  )
}
