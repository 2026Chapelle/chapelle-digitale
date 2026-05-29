import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="flex flex-wrap gap-2 mb-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-24" rounded="rounded-full" />)}
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    </div>
  )
}
