import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorialWorkspaceShell, weekPreviewAcceptClasses } from '../EditorialWorkspaceShell'

describe('editorial workspace shell', () => {
  it('renders only the three canonical views and the two primary action buttons', () => {
    const html = renderToStaticMarkup(
      <EditorialWorkspaceShell
        organizationId="org_01"
        activeView="today"
        summary={{
          priorities: [],
          weeklyRecommendations: [],
          opportunities: [],
          calendarRecommendations: [],
          totalOpportunities: 0,
          weeklyCapacity: 10,
          watchlist: [],
        }}
      />,
    )

    expect(html).toContain('Aujourd’hui')
    expect(html).toContain('Calendrier')
    expect(html).toContain('Opportunités')
    expect(html).toContain('Actualiser maintenant')
    expect(html.match(/Préparer ma semaine/g)?.length).toBe(1)
    expect(html).not.toContain('Dashboard')
    expect(html).not.toContain('Settings')
  })

  it('uses real gold utilities for both week-preview acceptance controls', () => {
    expect(weekPreviewAcceptClasses).not.toContain('cinematic-gold')
    expect(weekPreviewAcceptClasses).toContain('border-[#D4AF37]')
    expect(weekPreviewAcceptClasses).toContain('bg-[#D4AF37]')
    expect(weekPreviewAcceptClasses).toContain('text-[#050505]')
    expect(weekPreviewAcceptClasses).toContain('hover:bg-[#F5E6A7]')
    expect(weekPreviewAcceptClasses).toContain('focus-visible:ring-[#D4AF37]')
  })
})
