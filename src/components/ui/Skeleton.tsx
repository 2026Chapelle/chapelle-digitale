import { cn } from '@/lib/utils'

/**
 * Cinematic skeleton block with subtle gold-tinted shimmer.
 * Used inside Next.js `loading.tsx` files for streaming SSR placeholders.
 */
export function Skeleton({
  className,
  rounded = 'rounded-2xl',
}: {
  className?: string
  rounded?: string
}) {
  return (
    <div
      className={cn('relative overflow-hidden animate-pulse', rounded, className)}
      style={{
        background:
          'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(255,255,255,0.025) 50%, rgba(75,0,130,0.06) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
      aria-hidden
    />
  )
}

/**
 * Skeleton header that mirrors the cinematic PageHeader rhythm
 * (eyebrow + title + description) so streamed pages don't shift on hydrate.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-3">
      <Skeleton className="h-3 w-32" rounded="rounded" />
      <Skeleton className="h-9 sm:h-11 w-72 max-w-full" rounded="rounded-xl" />
      <Skeleton className="h-4 w-96 max-w-full" rounded="rounded" />
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-28', className)} />
}
