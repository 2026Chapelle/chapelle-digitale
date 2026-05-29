import { Skeleton } from '@/components/ui/Skeleton'

export default function LivesLoading() {
  return (
    <div className="min-h-screen pt-20 pb-8 bg-abyss">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 space-y-6">
        <div className="flex flex-wrap gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-36" rounded="rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video" rounded="rounded-3xl" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-[640px]" />
        </div>
      </div>
    </div>
  )
}
