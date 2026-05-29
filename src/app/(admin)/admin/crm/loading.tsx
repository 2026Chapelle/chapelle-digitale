import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function CrmLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  )
}
