'use client'

import {
  motion,
} from 'framer-motion'

import {
  REACTION_SYMBOLS,
} from '@/lib/live/live-reactions'

import {
  useLiveReactions,
} from './LiveReactionsProvider'

function horizontalPosition(
  eventId: string,
): number {
  let hash = 0

  for (
    let index = 0;
    index < eventId.length;
    index += 1
  ) {
    hash = (
      (hash * 31) +
      eventId.charCodeAt(index)
    ) >>> 0
  }

  return 8 + (hash % 84)
}

export default function LiveReactionAnimationLayer() {
  const {
    animations,
  } = useLiveReactions()

  return (
    <div
      data-live-reaction-animation-layer="true"
      aria-hidden="true"
      className="pointer-events-none grid h-20 grid-rows-2 gap-1 overflow-hidden rounded-2xl border border-gold/10 bg-gold/[0.02]"
    >
      {([0, 1] as const).map(
        rail => (
          <div
            key={rail}
            className="relative overflow-hidden"
          >
            {animations
              .filter(
                item =>
                  item.rail === rail,
              )
              .map(
                item => (
                  <motion.span
                    key={
                      item.event.eventId
                    }
                    initial={{
                      opacity: 0,
                      y: 14,
                      scale: 0.7,
                    }}
                    animate={{
                      opacity: 1,
                      y: -5,
                      scale: 1.15,
                    }}
                    transition={{
                      duration: 1.6,
                      ease: 'easeOut',
                    }}
                    className="absolute bottom-1 text-xl sm:text-2xl"
                    style={{
                      left:
                        `${horizontalPosition(item.event.eventId)}%`,
                    }}
                  >
                    {
                      REACTION_SYMBOLS[
                        item.event.reaction
                      ]
                    }
                  </motion.span>
                ),
              )}
          </div>
        ),
      )}
    </div>
  )
}