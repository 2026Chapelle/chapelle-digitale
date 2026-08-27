import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecommendationActionBar } from '../RecommendationActionBar'

describe('recommendation action bar', () => {
  it('renders a readable disabled primary action when write access is unavailable', () => {
    const html = renderToStaticMarkup(<RecommendationActionBar canWrite={false} />)

    expect(html).toContain('Accepter')
    expect(html).toContain('disabled:opacity-100')
    expect(html).toContain('bg-gold/15')
    expect(html).toContain('border-gold/50')
    expect(html).toContain('text-gold-light')
    expect(html).toContain('color:#F5E6A7')
  })

  it('renders the writable accept action as a high-contrast gold primary CTA', () => {
    const html = renderToStaticMarkup(<RecommendationActionBar canWrite />)

    expect(html).not.toContain('cinematic-gold')
    expect(html).toContain('bg-[#D4AF37]')
    expect(html).toContain('text-[#050505]')
    expect(html).toContain('border-[#D4AF37]')
    expect(html).toContain('focus-visible:ring-[#D4AF37]')
  })
})
