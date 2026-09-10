import {
  existsSync,
  readFileSync,
} from 'node:fs'

import {
  resolve,
} from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

function source(
  path: string,
) {
  const absolute =
    resolve(
      process.cwd(),
      path,
    )

  return existsSync(absolute)
    ? readFileSync(
        absolute,
        'utf8',
      )
    : ''
}

const page =
  source(
    'src/app/(admin)/admin/live/page.tsx',
  )

const component =
  source(
    'src/components/admin/live/LiveAdminSupervision.tsx',
  )

const compact =
  component.replace(
    /\s+/g,
    ' ',
  )

describe('LIVE 4A.6 admin supervision UI', () => {
  it('replaces static statistics with the real supervision component', () => {
    expect(page).toContain(
      "import LiveAdminSupervision from '@/components/admin/live/LiveAdminSupervision'",
    )

    expect(page).toContain(
      "{ key: 'stats', label: 'Supervision' }",
    )

    expect(page).toContain(
      '<LiveAdminSupervision />',
    )

    expect(page).not.toContain(
      "label: 'Vues totales'",
    )

    expect(page).not.toContain(
      "label: 'Spectateurs peak'",
    )

    expect(page).not.toContain(
      "label: 'Lives ce mois'",
    )

    expect(page).not.toContain(
      "label: 'Pays atteints'",
    )

    expect(page).not.toContain(
      "label: 'Replays vus'",
    )
  })

  it('removes fake subscriber zero placeholders from streaming destinations', () => {
    expect(page).not.toContain(
      "abonnes: '0'",
    )

    expect(page).not.toContain(
      '{canal.abonnes} abonnés',
    )
  })

  it('polls only the private admin supervision endpoint every 15 seconds', () => {
    expect(component).toContain(
      '/api/admin/live/supervision',
    )

    expect(component).toContain(
      '15_000',
    )

    expect(
      compact,
    ).toContain(
      "document.visibilityState === 'visible'",
    )

    expect(component).toContain(
      'visibilitychange',
    )
  })

  it('renders the real presence aggregates without identities', () => {
    expect(component).toContain(
      'activeTotal',
    )

    expect(component).toContain(
      'activeMembers',
    )

    expect(component).toContain(
      'activeGuests',
    )

    expect(component).toContain(
      'joinedTotal',
    )

    expect(component).not.toContain(
      'guest_session_hash',
    )

    expect(component).not.toContain(
      'user_id',
    )
  })

  it('renders successful share actions as actions rather than people', () => {
    expect(component).toContain(
      'totalActions',
    )

    expect(component).toContain(
      'nativeShare',
    )

    expect(component).toContain(
      'copyLink',
    )

    expect(component).toContain(
      'actions réussies',
    )

    expect(component).not.toContain(
      'personnes ayant partagé',
    )
  })

  it('distinguishes offline and unavailable from real zero', () => {
    expect(component).toContain(
      'Aucun direct en cours',
    )

    expect(component).toContain(
      'Présence momentanément indisponible',
    )

    expect(component).toContain(
      'Partage momentanément indisponible',
    )

    expect(component).toContain(
      'La supervision s’activera automatiquement',
    )
  })

  it('renders aggregate reactions as anonymous activity without identities', () => {
    expect(component).toContain(
      'reactions',
    )

    expect(component).toContain(
      'Réactions',
    )

    expect(component).not.toContain(
      'member_id',
    )

    expect(component).not.toContain(
      'guest_id',
    )

    expect(component).not.toContain(
      'user_id',
    )
  })})