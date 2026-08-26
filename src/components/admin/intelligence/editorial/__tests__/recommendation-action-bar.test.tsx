import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecommendationActionBar } from '../RecommendationActionBar'

describe('recommendation action bar', () => {
  it('renders a readable disabled primary action when write access is unavailable', () => {
    const html = renderToStaticMarkup(<RecommendationActionBar canWrite={false} />)

    expect(html).toContain('Accepter')
    expect(html).toContain('disabled:opacity-100')
    expect(html).toContain('bg-cinematic-gold/10')
    expect(html).toContain('text-cinematic-gold/80')
  })
})
