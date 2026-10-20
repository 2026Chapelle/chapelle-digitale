import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GroupSpaceView } from './GroupSpace'

const data = {
  group: { id: 'group-1', nom: 'Les Batisseurs', description: null },
  posts: [],
  permissions: { manage: false },
  viewer_id: 'member-1',
}

function render(extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    React.createElement(GroupSpaceView, {
      data,
      meetings: [],
      loading: false,
      error: null,
      meetingError: null,
      ...extra,
    } as any),
  )
}

describe('group space interface', () => {
  it('shows loading without private content', () => {
    const html = render({ loading: true, data: null })
    expect(html).toContain('Chargement')
    expect(html).not.toContain('Les Batisseurs')
  })

  it('shows access failure and a path back to groups', () => {
    const html = render({ data: null, error: 'Accès refusé.' })
    expect(html).toContain('Accès refusé.')
    expect(html).toContain('/member/dashboard/groupes')
  })

  it('shows the group and all five sections', () => {
    const html = render()
    for (const label of [
      'Les Batisseurs', 'Rencontres', 'Sujets de prière',
      'Annonces', 'Ressources', 'Témoignages',
    ]) expect(html).toContain(label)
  })

  it('provides an explicit empty meeting state', () => {
    expect(render()).toContain('Aucune rencontre programmée')
  })

  it('distinguishes meeting failure from an empty schedule', () => {
    const html = render({ meetingError: 'Rencontres indisponibles.' })
    expect(html).toContain('Rencontres indisponibles.')
    expect(html).not.toContain('Aucune rencontre programmée')
  })

  it('shows a Google Meet link with explicit Abidjan time', () => {
    const html = render({
      meetings: [{
        id: 'meeting-1', titre: 'Prière ensemble',
        date_reunion: '2099-01-01T19:00:00Z',
        statut: 'planifiee', type: 'virtuelle',
        lien_visio: 'https://meet.google.com/abc-defg-hij',
      }],
    })
    expect(html).toContain('https://meet.google.com/abc-defg-hij')
    expect(html).toContain('Abidjan')
    expect(html).toContain('noopener noreferrer')
  })

  it('never renders an unsafe meeting link', () => {
    const html = render({
      meetings: [{
        id: 'meeting-1', titre: 'Prière ensemble',
        date_reunion: '2099-01-01T19:00:00Z',
        statut: 'planifiee', type: 'virtuelle',
        lien_visio: 'javascript:alert(1)',
      }],
    })
    expect(html).not.toContain('javascript:')
    expect(html).toContain('Lien de rencontre indisponible')
  })

  it('does not render post text as HTML', () => {
    const html = render({
      data: {
        ...data,
        posts: [{
          id: 'post-1', author_id: 'other', kind: 'annonce',
          title: 'Annonce', body: '<script>alert(1)</script>',
          state: 'publie', visibility: 'groupe',
        }],
      },
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})