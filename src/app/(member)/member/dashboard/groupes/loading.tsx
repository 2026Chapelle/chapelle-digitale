import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function GroupesLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <Skeleton className="h-12 w-72 mb-6" rounded="rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-44" />
            <Skeleton className="h-72" />
            <Skeleton className="h-56" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-72" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    </div>
  )
}
