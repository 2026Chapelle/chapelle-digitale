import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function AdminLiveLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <Skeleton className="h-44 mb-8" rounded="rounded-3xl" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    </div>
  )
}
