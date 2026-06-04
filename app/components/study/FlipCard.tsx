'use client'

import type { ReactNode } from 'react'

type FlipCardProps = {
  flipped: boolean
  onFlip: () => void
  front: ReactNode
  back: ReactNode
  /** Extra classes on the outer interactive surface (border, shadow). */
  className?: string
}

/**
 * 3D flip: front and back are both in the DOM; toggling `flipped` rotates the inner layer.
 */
export function FlipCard({ flipped, onFlip, front, back, className = '' }: FlipCardProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className={`group relative block w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-offset-stone-950 ${className}`}
    >
      <div
        className="relative min-h-[min(55vh,420px)] w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg transition-colors group-hover:border-amber-300/80 dark:border-stone-700 dark:bg-stone-900/60 dark:group-hover:border-amber-700/50"
        style={{ perspective: '1400px' }}
      >
        <div
          className="relative min-h-[min(48vh,360px)] w-full origin-center transition-transform duration-500 ease-in-out will-change-transform [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div
            className="absolute inset-0 flex flex-col justify-center overflow-y-auto rounded-3xl p-6 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
            style={{ transform: 'rotateY(0deg)' }}
          >
            {front}
          </div>
          <div
            className="absolute inset-0 flex flex-col justify-center overflow-y-auto rounded-3xl p-6 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            {back}
          </div>
        </div>
      </div>
    </button>
  )
}
