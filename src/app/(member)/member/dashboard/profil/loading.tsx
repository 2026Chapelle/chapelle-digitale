import { Skeleton } from '@/components/ui/Skeleton'

export default function ProfilLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Skeleton className="h-44 mb-8" rounded="rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
            <Skeleton className="h-56" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    </div>
  )
}
