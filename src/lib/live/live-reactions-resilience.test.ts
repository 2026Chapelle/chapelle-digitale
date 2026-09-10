import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  isAuthorizedArtifactRoot,
  isAuthorizedMemberStorageState,
  isLoopbackBrowserBaseUrl,
} from '../../../test/live-reactions/browser-fixtures'

const repoRoot =
  path.resolve(process.cwd())

describe(
  'LIVE 4B.9 browser harness resilience guards',
  () => {
    it(
      'accepts only loopback HTTP browser targets',
      () => {
        expect(
          isLoopbackBrowserBaseUrl(
            'http://127.0.0.1:3000',
          ),
        ).toBe(true)

        expect(
          isLoopbackBrowserBaseUrl(
            'http://localhost:3000',
          ),
        ).toBe(true)

        expect(
          isLoopbackBrowserBaseUrl(
            'http://[::1]:3000',
          ),
        ).toBe(true)

        expect(
          isLoopbackBrowserBaseUrl(
            'https://citadelle.chapelleduroyaume.org',
          ),
        ).toBe(false)

        expect(
          isLoopbackBrowserBaseUrl(
            'http://example.com:3000',
          ),
        ).toBe(false)

        expect(
          isLoopbackBrowserBaseUrl(
            'file:///tmp/live',
          ),
        ).toBe(false)
      },
    )

    it(
      'accepts artifacts only below an authorized lot reports or tmp directory',
      () => {
        const reports =
          path.join(
            repoRoot,
            '..',
            '..',
            'reports',
          )

        const tmp =
          path.join(
            repoRoot,
            '..',
            '..',
            'tmp',
            'browser',
          )

        const releaseOut =
          path.join(
            repoRoot,
            'release-out',
          )

        expect(
          isAuthorizedArtifactRoot(
            reports,
            repoRoot,
          ),
        ).toBe(true)

        expect(
          isAuthorizedArtifactRoot(
            tmp,
            repoRoot,
          ),
        ).toBe(true)

        expect(
          isAuthorizedArtifactRoot(
            releaseOut,
            repoRoot,
          ),
        ).toBe(false)

        expect(
          isAuthorizedArtifactRoot(
            repoRoot,
            repoRoot,
          ),
        ).toBe(false)
      },
    )

    it(
      'accepts member storage state only below the lot tmp tree',
      () => {
        const valid =
          path.join(
            repoRoot,
            '..',
            '..',
            'tmp',
            'member-state.json',
          )

        const invalid =
          path.join(
            repoRoot,
            '.auth',
            'member.json',
          )

        expect(
          isAuthorizedMemberStorageState(
            valid,
            repoRoot,
          ),
        ).toBe(true)

        expect(
          isAuthorizedMemberStorageState(
            invalid,
            repoRoot,
          ),
        ).toBe(false)
      },
    )
  },
)