import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function MessagesLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[640px]">
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
