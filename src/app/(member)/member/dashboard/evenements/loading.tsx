import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function EvenementsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <Skeleton className="h-16 mb-6" rounded="rounded-2xl" />
        <Skeleton className="h-[420px] mb-6" rounded="rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    </div>
  )
}
