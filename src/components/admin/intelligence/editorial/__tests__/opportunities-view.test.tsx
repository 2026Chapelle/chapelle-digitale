import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OpportunitiesView } from '../OpportunitiesView'

describe('opportunities view', () => {
  it('renders filters and non-blocking error states without breaking the page', () => {
    const html = renderToStaticMarkup(
      <OpportunitiesView
        filters={['CREATE', 'REPURPOSE', 'PROMOTE', 'SEO', 'sous-exploité', 'à surveiller']}
        opportunities={[{ id: 'opp_01', title: 'Article à réutiliser', family: 'REPURPOSE', status: 'FORTE' }]}
        connectorStates={[{ key: 'youtube', truthState: 'PARTIAL' }, { key: 'meta', truthState: 'UNAVAILABLE' }]}
      />,
    )

    expect(html).toContain('CREATE')
    expect(html).toContain('REPURPOSE')
    expect(html).toContain('PROMOTE')
    expect(html).toContain('SEO')
    expect(html).toContain('PARTIAL')
    expect(html).toContain('UNAVAILABLE')
    expect(html).toContain('à surveiller')
  })
})
