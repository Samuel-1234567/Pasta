'use client'

import type { ReactNode } from 'react'

/** Renders card text with markdown-style images `![alt](url)` as <img>. */
export function CardFaceContent({ text, className }: { text: string; className?: string }) {
  const s = String(text ?? '')
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of s.matchAll(re)) {
    const idx = m.index ?? 0
    const full = m[0] ?? ''
    const alt = m[1] ?? ''
    const src = (m[2] ?? '').trim()
    if (idx > last) {
      nodes.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap">
          {s.slice(last, idx)}
        </span>,
      )
    }
    if (src) {
      nodes.push(
        <img
          key={`img-${key++}`}
          src={src}
          alt={alt}
          loading="lazy"
          className="mt-2 max-h-48 w-full max-w-full rounded-lg border border-stone-200 object-contain dark:border-stone-700"
        />,
      )
    }
    last = idx + full.length
  }
  if (last < s.length) {
    nodes.push(
      <span key={`t-${key++}`} className="whitespace-pre-wrap">
        {s.slice(last)}
      </span>,
    )
  }

  if (nodes.length === 0) {
    return <span className={className}>{s || '—'}</span>
  }

  return <div className={className}>{nodes}</div>
}
