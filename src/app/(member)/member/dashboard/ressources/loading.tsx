import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function RessourcesLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <Skeleton className="h-12 mb-5" rounded="rounded-xl" />
        <div className="flex flex-wrap gap-2 mb-8">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8 w-24" rounded="rounded-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    </div>
  )
}
