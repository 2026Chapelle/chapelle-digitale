import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function AdminParametresLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-96" />
          <div className="lg:col-span-3 space-y-5">
            <Skeleton className="h-72" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    </div>
  )
}
