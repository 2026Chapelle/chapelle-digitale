import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function AdminAnalyticsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-7">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Skeleton className="xl:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  )
}
