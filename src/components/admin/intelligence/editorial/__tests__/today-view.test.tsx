import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TodayView } from '../TodayView'

describe('today view', () => {
  it('renders at most five priorities and exposes the evidence drawer trigger', () => {
    const html = renderToStaticMarkup(
      <TodayView
        priorities={[
          { id: '1', title: 'Article du jour', band: 'FORTE' },
          { id: '2', title: 'Podcast à republier', band: 'FORTE' },
          { id: '3', title: 'Short YouTube', band: 'NORMALE' },
          { id: '4', title: 'WhatsApp rappel', band: 'NORMALE' },
          { id: '5', title: 'Facebook promotion', band: 'A_SURVEILLER' },
          { id: '6', title: 'Over-capacity item', band: 'A_SURVEILLER' },
        ]}
        watchlist={[]}
        onPrepareWeek={() => undefined}
      />,
    )

    expect(html.match(/priority-row/g)?.length).toBe(5)
    expect(html).toContain('Pourquoi ?')
    expect(html).toContain('Accepter')
    expect(html).toContain('Modifier')
    expect(html).toContain('Planifier')
    expect(html).toContain('Rejeter')
  })
})
