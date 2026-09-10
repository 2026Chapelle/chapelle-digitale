import {
  expect,
  test,
} from '@playwright/test'

import {
  LIVE4B_TEST_VIDEO_ID,
  installLocalLiveReactionRoutes,
} from './browser-fixtures'

test.describe(
  'LIVE 4B reaction browser resilience',
  () => {
    test.beforeEach(
      async ({
        page,
        baseURL,
      }) => {
        if (!baseURL) {
          throw new Error(
            'BLOCKED: local browser base URL unavailable',
          )
        }

        await installLocalLiveReactionRoutes(
          page,
          baseURL,
        )
      },
    )

    test(
      'public reaction controls are keyboard reachable and expose the five canonical labels',
      async ({ page }) => {
        await page.goto('/live')

        const reactionSection =
          page.locator(
            '[data-live-reaction-controls="true"]',
          )

        await expect(
          reactionSection,
        ).toBeVisible()

        const controls =
          reactionSection.locator(
            'button[aria-label^="Réagir :"]',
          )

        await expect(
          controls,
        ).toHaveCount(5)

        const labels =
          [
            /Réagir : Prière/i,
            /Réagir : Feu/i,
            /Réagir : Amour/i,
            /Réagir : Louange/i,
            /Réagir : Royaume/i,
          ]

        for (
          const label of labels
        ) {
          await expect(
            reactionSection.getByRole(
              'button',
              {
                name: label,
              },
            ),
          ).toBeVisible()
        }

        await controls
          .first()
          .focus()

        await expect(
          controls.first(),
        ).toBeFocused()
      },
    )

    test(
      'uses the existing iframe node with deterministic test video identity and observable progress',
      async ({ page }) => {
        await page.goto('/live')

        const iframe =
          page.locator(
            `iframe[src*="/embed/${LIVE4B_TEST_VIDEO_ID}"]`,
          )

        await expect(
          iframe,
        ).toHaveCount(1)

        const playerFrame =
          page.frameLocator(
            `iframe[src*="/embed/${LIVE4B_TEST_VIDEO_ID}"]`,
          )

        const body =
          playerFrame.locator('body')

        await expect(
          body,
        ).toHaveAttribute(
          'data-live4b-player-id',
          LIVE4B_TEST_VIDEO_ID,
        )

        await expect
          .poll(
            async () => {
              const value =
                await body.getAttribute(
                  'data-live4b-playback-progress',
                )

              return Number(
                value ?? '0',
              )
            },
          )
          .toBeGreaterThan(0)
      },
    )

    test(
      'hidden visibility lifecycle leaves no reaction catch-up animation',
      async ({ page }) => {
        await page.goto('/live')

        await page.evaluate(() => {
          Object.defineProperty(
            document,
            'visibilityState',
            {
              configurable: true,
              get: () => 'hidden',
            },
          )

          Object.defineProperty(
            document,
            'hidden',
            {
              configurable: true,
              get: () => true,
            },
          )

          document.dispatchEvent(
            new Event(
              'visibilitychange',
            ),
          )
        })

        await expect(
          page.locator(
            '[data-live-reaction-animation]',
          ),
        ).toHaveCount(0)

        await page.evaluate(() => {
          Object.defineProperty(
            document,
            'visibilityState',
            {
              configurable: true,
              get: () => 'visible',
            },
          )

          Object.defineProperty(
            document,
            'hidden',
            {
              configurable: true,
              get: () => false,
            },
          )

          document.dispatchEvent(
            new Event(
              'visibilitychange',
            ),
          )
        })

        await expect(
          page.locator(
            '[data-live-reaction-animation]',
          ),
        ).toHaveCount(0)
      },
    )

    test(
      'reduced motion keeps reaction animations suppressed',
      async ({ page }) => {
        await page.emulateMedia({
          reducedMotion:
            'reduce',
        })

        await page.goto('/live')

        await expect(
          page.locator(
            '[data-live-reaction-animation]',
          ),
        ).toHaveCount(0)
      },
    )
  },
)