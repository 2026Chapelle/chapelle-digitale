import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboard = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/page.tsx'),
  'utf8',
)

describe('member dashboard MA COMMUNAUTÉ contract', () => {
  it('loads group and message summaries from the existing member endpoints', () => {
    const groupFetches =
      dashboard.match(/fetch\('\/api\/member\/groupes'/g) ?? []

    const messageFetches =
      dashboard.match(/fetch\('\/api\/member\/messages'/g) ?? []

    expect(groupFetches).toHaveLength(1)
    expect(messageFetches).toHaveLength(1)

    // Le dashboard ne doit jamais ouvrir une conversation :
    // GET ?with=<uid> marque les messages reçus comme lus.
    expect(dashboard).not.toContain('/api/member/messages?with=')
  })

  it('uses active memberships and prefers the primary group', () => {
    expect(dashboard).toContain(
      "membership.statut === 'actif'",
    )
    expect(dashboard).toContain(
      'membership.is_primary',
    )
    expect(dashboard).toContain(
      'activeMemberships[0]',
    )
    expect(dashboard).toContain(
      'group.id === primaryMembership?.groupe_id',
    )
    expect(dashboard).toContain('communityGroup')
  })

  it('computes pending requests and the total unread message count without mutating messages', () => {
    expect(dashboard).toContain('pendingGroupRequests')
    expect(dashboard).toContain(
      'threads.reduce((total, thread) => total + thread.unread, 0)',
    )
    expect(dashboard).toContain('unreadMessages')
    expect(dashboard).not.toContain("method: 'POST'")
  })

  it('renders a compact MA COMMUNAUTÉ surface with real navigation', () => {
    expect(dashboard).toContain('MA COMMUNAUTÉ')
    expect(dashboard).toContain('communityGroup?.nom')
    expect(dashboard).toContain('pendingGroupRequests > 0')
    expect(dashboard).toContain('unreadMessages')
    expect(dashboard).toContain('/member/dashboard/groupes')
    expect(dashboard).toContain('/member/dashboard/messages')
  })

  it('preserves CONTINUER, MON PROCHAIN PAS and MAINTENANT as independent surfaces', () => {
    expect(dashboard).toContain('CONTINUER')
    expect(dashboard).toContain('MON PROCHAIN PAS')
    expect(dashboard).toContain('EN DIRECT MAINTENANT')
    expect(dashboard).toContain('nextAction.href')
  })
})