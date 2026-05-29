'use client'
import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'
import type { CieerImage } from '@/lib/images'

type Overlay = 'none' | 'subtle' | 'cinematic' | 'heavy'

interface PremiumImageProps extends Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'> {
  /** Image entry from the catalog (or any equivalent shape). */
  image: CieerImage
  /** Prefer the curated remote photo if it's been set. */
  preferRemote?: boolean
  /**
   * Cinematic dark overlay applied on top of the image.
   *  - none:      raw image
   *  - subtle:    light vignette (use for inline cards)
   *  - cinematic: gold halo + dark gradient (default — for hero/poster surfaces)
   *  - heavy:     deep darkening for text-overlay surfaces
   */
  overlay?: Overlay
  /** Optional gold accent border that lights up on hover (use inside Link). */
  ringOnHover?: boolean
  /** Outer wrapper class. */
  className?: string
  /** Class applied to the inner <img>. */
  imageClassName?: string
  /** Render `fill` instead of explicit width/height. Use inside a sized parent. */
  fill?: boolean
}

const OVERLAY_GRADIENT: Record<Overlay, string> = {
  none: 'transparent',
  subtle:
    'linear-gradient(180deg, transparent 40%, rgba(5,3,8,0.45) 100%)',
  cinematic:
    'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.18) 0%, transparent 55%), ' +
    'linear-gradient(180deg, rgba(5,3,8,0.35) 0%, rgba(5,3,8,0.55) 60%, rgba(5,3,8,0.85) 100%)',
  heavy:
    'linear-gradient(180deg, rgba(5,3,8,0.55) 0%, rgba(5,3,8,0.75) 50%, rgba(5,3,8,0.95) 100%)',
}

/**
 * PremiumImage — `next/image` with the cinematic dark royal treatment baked in.
 *
 * Usage (fill, inside an aspect-ratio parent):
 *   <div className="relative aspect-video">
 *     <PremiumImage image={HERO_IMAGES.cathedral} fill priority />
 *   </div>
 *
 * Usage (sized):
 *   <PremiumImage image={PLATFORM_IMAGES.cier} overlay="subtle" />
 */
export function PremiumImage({
  image,
  preferRemote = false,
  overlay = 'cinematic',
  ringOnHover = false,
  className,
  imageClassName,
  fill = false,
  ...rest
}: PremiumImageProps) {
  const src = preferRemote && image.srcRemote ? image.srcRemote : image.src

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        ringOnHover && 'group transition-shadow duration-500',
        className
      )}
      style={
        ringOnHover
          ? {
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }
          : undefined
      }
    >
      {/* Fallback gradient (instant paint while image loads) */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background: `
            radial-gradient(circle at 30% 30%, ${image.palette.primary}30 0%, transparent 60%),
            radial-gradient(circle at 70% 70%, ${image.palette.secondary ?? image.palette.primary}25 0%, transparent 60%),
            #0a0613
          `,
        }}
      />

      {fill ? (
        <Image
          src={src}
          alt={image.alt}
          fill
          className={cn('object-cover', imageClassName)}
          sizes={rest.sizes ?? '(max-width: 768px) 100vw, 50vw'}
          {...rest}
        />
      ) : (
        <Image
          src={src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className={cn('w-full h-full object-cover', imageClassName)}
          sizes={rest.sizes ?? '(max-width: 768px) 100vw, 50vw'}
          {...rest}
        />
      )}

      {/* Cinematic overlay */}
      {overlay !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{ background: OVERLAY_GRADIENT[overlay] }}
        />
      )}

      {/* Hover gold ring */}
      {ringOnHover && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          aria-hidden
          style={{
            boxShadow:
              '0 0 0 1px rgba(212,175,55,0.45) inset, 0 0 32px rgba(212,175,55,0.18) inset',
          }}
        />
      )}
    </div>
  )
}
