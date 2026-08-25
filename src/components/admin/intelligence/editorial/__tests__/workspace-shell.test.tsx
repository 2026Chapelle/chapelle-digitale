import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorialWorkspaceShell } from '../EditorialWorkspaceShell'

describe('editorial workspace shell', () => {
  it('renders only the three canonical views and the two primary action buttons', () => {
    const html = renderToStaticMarkup(
      <EditorialWorkspaceShell
        organizationId="org_01"
        activeView="today"
        summary={{
          priorities: [],
          weeklyRecommendations: [],
          watchlist: [],
        }}
      />,
    )

    expect(html).toContain('Aujourd’hui')
    expect(html).toContain('Calendrier')
    expect(html).toContain('Opportunités')
    expect(html).toContain('Actualiser maintenant')
    expect(html).toContain('Préparer ma semaine')
    expect(html).not.toContain('Dashboard')
    expect(html).not.toContain('Settings')
  })
})
