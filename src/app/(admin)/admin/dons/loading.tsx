import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function AdminDonsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Skeleton className="lg:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}
