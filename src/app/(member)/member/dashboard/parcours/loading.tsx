import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function ParcoursLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-44" rounded="rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-44" />
          </div>
          <div className="lg:col-span-2 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
