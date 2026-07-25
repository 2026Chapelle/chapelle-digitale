import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function HorsLigneLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeaderSkeleton />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24" rounded="rounded-xl" />
        <Skeleton className="h-24" rounded="rounded-xl" />
      </div>
      <div className="mt-8 space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" rounded="rounded-2xl" />)}
      </div>
    </div>
  )
}
