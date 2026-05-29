import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function AdminMembresLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-12 mb-5" rounded="rounded-xl" />
        <Skeleton className="h-[480px]" />
      </div>
    </div>
  )
}
