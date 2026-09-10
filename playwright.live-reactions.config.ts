import path from 'node:path'

import {
  defineConfig,
  devices,
} from '@playwright/test'

import {
  readBrowserHarnessPaths,
} from './test/live-reactions/browser-fixtures'

const repoRoot =
  path.resolve(__dirname)

const paths =
  readBrowserHarnessPaths(
    process.env,
    repoRoot,
  )

export default defineConfig({
  testDir:
    './test/live-reactions',

  workers: 1,

  fullyParallel: false,

  forbidOnly: true,

  retries: 0,

  outputDir:
    path.join(
      paths.artifactRoot,
      'playwright-output',
    ),

  reporter: [
    [
      'list',
    ],
  ],

  use: {
    baseURL:
      paths.baseUrl,

    trace:
      'retain-on-failure',

    screenshot:
      'only-on-failure',

    video:
      'off',

    serviceWorkers:
      'block',
  },

  projects: [
    {
      name:
        'chromium-desktop',

      use: {
        ...devices[
          'Desktop Chrome'
        ],
      },
    },

    {
      name:
        'chromium-mobile-390x844',

      use: {
        browserName:
          'chromium',

        viewport: {
          width: 390,
          height: 844,
        },

        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})