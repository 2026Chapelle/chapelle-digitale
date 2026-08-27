import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OpportunitiesView } from '../OpportunitiesView'

describe('opportunities view', () => {
  it('renders filters and non-blocking error states without breaking the page', () => {
    const html = renderToStaticMarkup(
      <OpportunitiesView
        filters={['Créer', 'Décliner', 'Promouvoir', 'SEO', 'sous-exploité', 'à surveiller']}
        opportunities={[{ id: 'opp_01', title: 'Article à réutiliser', family: 'Décliner', status: 'FORTE' }]}
        connectorStates={[{ key: 'youtube', truthState: 'PARTIAL' }, { key: 'meta', truthState: 'UNAVAILABLE' }]}
      />,
    )

    expect(html).toContain('Créer')
    expect(html).toContain('Décliner')
    expect(html).toContain('Promouvoir')
    expect(html).toContain('SEO')
    expect(html).toContain('PARTIAL')
    expect(html).toContain('UNAVAILABLE')
    expect(html).toContain('à surveiller')
  })
})
