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

const componentPath =
  resolve(
    process.cwd(),
    'src/components/live/LiveCultNotebook.tsx',
  )

const source =
  existsSync(componentPath)
    ? readFileSync(
        componentPath,
        'utf8',
      )
    : ''

describe(
  'LIVE 4C Mon Carnet du Culte UI contract',
  () => {
    it(
      'shows the notebook title',
      () => {
        expect(source).toContain(
          'Mon Carnet',
        )
      },
    )

    it(
      'explains guest local-only persistence',
      () => {
        expect(source).toContain(
          'Enregistré uniquement sur cet appareil.',
        )
      },
    )

    it(
      'shows received word kind',
      () => {
        expect(source).toContain(
          'Parole reçue',
        )
      },
    )

    it(
      'shows decision kind',
      () => {
        expect(source).toContain(
          'Décision',
        )
      },
    )

    it(
      'shows meditation kind',
      () => {
        expect(source).toContain(
          'À méditer',
        )
      },
    )

    it(
      'shows scripture reference field',
      () => {
        expect(source).toContain(
          'Référence biblique',
        )
      },
    )

    it(
      'shows create action',
      () => {
        expect(source).toContain(
          'Enregistrer',
        )
      },
    )

    it(
      'shows edit action',
      () => {
        expect(source).toContain(
          'Modifier',
        )
      },
    )

    it(
      'shows delete action',
      () => {
        expect(source).toContain(
          'Supprimer',
        )
      },
    )

    it(
      'does not expose pastoral sending in V1',
      () => {
        expect(source).not.toContain(
          'Envoyer au pasteur',
        )
      },
    )

    it(
      'does not expose prayer transformation in V1',
      () => {
        expect(source).not.toContain(
          'Demande de prière',
        )
      },
    )
  },
)