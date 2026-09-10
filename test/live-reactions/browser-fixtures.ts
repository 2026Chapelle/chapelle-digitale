import path from 'node:path'

import type {
  BrowserContext,
  Page,
  Route,
} from '@playwright/test'

export const LIVE4B_TEST_VIDEO_ID =
  'ABCDEFGHIJK'

export const LIVE4B_TEST_CMS_ID =
  '11111111-1111-4111-8111-111111111111'

export const LIVE4B_TEST_EVENT_ID =
  '22222222-2222-4222-8222-222222222222'

export type BrowserHarnessPaths = {
  baseUrl: string
  artifactRoot: string
  memberStorageState?: string
}

function isPathInside(
  candidate: string,
  parent: string,
): boolean {
  const relative =
    path.relative(
      parent,
      candidate,
    )

  return (
    relative === '' ||
    (
      relative !== '..' &&
      !relative.startsWith(
        `..${path.sep}`,
      ) &&
      !path.isAbsolute(relative)
    )
  )
}

function resolveLotRoot(
  repoRoot: string,
): string {
  return path.resolve(
    repoRoot,
    '..',
    '..',
  )
}

export function isLoopbackBrowserBaseUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(value)

    if (url.protocol !== 'http:') {
      return false
    }

    if (
      url.username ||
      url.password
    ) {
      return false
    }

    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]'
    )
  } catch {
    return false
  }
}

export function isAuthorizedArtifactRoot(
  value: string,
  repoRoot: string,
): boolean {
  if (!value.trim()) {
    return false
  }

  const candidate =
    path.resolve(value)

  const lotRoot =
    resolveLotRoot(repoRoot)

  const reportsRoot =
    path.join(
      lotRoot,
      'reports',
    )

  const tmpRoot =
    path.join(
      lotRoot,
      'tmp',
    )

  return (
    isPathInside(
      candidate,
      reportsRoot,
    ) ||
    isPathInside(
      candidate,
      tmpRoot,
    )
  )
}

export function isAuthorizedMemberStorageState(
  value: string,
  repoRoot: string,
): boolean {
  if (!value.trim()) {
    return false
  }

  const candidate =
    path.resolve(value)

  const lotTmp =
    path.join(
      resolveLotRoot(repoRoot),
      'tmp',
    )

  return (
    isPathInside(
      candidate,
      lotTmp,
    ) &&
    path.extname(candidate).toLowerCase() ===
      '.json'
  )
}

export function readBrowserHarnessPaths(
  env: NodeJS.ProcessEnv,
  repoRoot: string,
): BrowserHarnessPaths {
  const baseUrl =
    env.LIVE4B_BROWSER_BASE_URL?.trim() ?? ''

  const artifactRoot =
    env.LIVE4B_ARTIFACT_ROOT?.trim() ?? ''

  const memberStorageState =
    env.LIVE4B_MEMBER_STORAGE_STATE?.trim() ||
    undefined

  if (!baseUrl) {
    throw new Error(
      'BLOCKED: LIVE4B_BROWSER_BASE_URL is required',
    )
  }

  if (!artifactRoot) {
    throw new Error(
      'BLOCKED: LIVE4B_ARTIFACT_ROOT is required',
    )
  }

  if (!isLoopbackBrowserBaseUrl(baseUrl)) {
    throw new Error(
      'BLOCKED: browser base URL must be loopback',
    )
  }

  if (
    !isAuthorizedArtifactRoot(
      artifactRoot,
      repoRoot,
    )
  ) {
    throw new Error(
      'BLOCKED: artifact root is outside authorized LIVE 4B paths',
    )
  }

  if (
    memberStorageState &&
    !isAuthorizedMemberStorageState(
      memberStorageState,
      repoRoot,
    )
  ) {
    throw new Error(
      'BLOCKED: member storage state must live under lot tmp',
    )
  }

  return {
    baseUrl,
    artifactRoot,
    memberStorageState,
  }
}

function testCmsRow() {
  return {
    id: LIVE4B_TEST_CMS_ID,
    title: 'LIVE 4B Browser Test',
    description:
      'Deterministic browser-only fixture',
    youtube_url:
      `https://www.youtube.com/watch?v=${LIVE4B_TEST_VIDEO_ID}`,
    video_url: null,
    cover_url: null,
    platform: 'YouTube',
    is_live: true,
    status: 'live',
    created_at:
      '2026-09-10T12:00:00.000Z',
    scheduled_at:
      '2026-09-10T12:00:00.000Z',
  }
}

async function fulfillCanonical(
  route: Route,
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'cache-control':
        'no-store',
    },
    body: JSON.stringify({
      status: 'LIVE',
      title:
        'LIVE 4B Browser Test',
      youtubeVideoId:
        LIVE4B_TEST_VIDEO_ID,
      thumbnail: null,
    }),
  })
}

async function fulfillReactions(
  route: Route,
): Promise<void> {
  const method =
    route.request().method()

  if (method === 'GET') {
    await route.fulfill({
      status: 200,
      contentType:
        'application/json',
      headers: {
        'cache-control':
          'no-store',
      },
      body: JSON.stringify({
        ok: true,
        live: true,
        liveKey:
          `youtube:${LIVE4B_TEST_VIDEO_ID}`,
        state: 'open',
        uniqueByType: {
          prayer: 1,
          fire: 2,
          heart: 3,
          praise: 4,
          kingdom: 5,
        },
        serverTime:
          new Date().toISOString(),
      }),
    })

    return
  }

  if (method === 'POST') {
    await route.fulfill({
      status: 200,
      contentType:
        'application/json',
      headers: {
        'cache-control':
          'no-store',
      },
      body: JSON.stringify({
        ok: true,
        accepted: true,
        eventId:
          LIVE4B_TEST_EVENT_ID,
        acceptedAt:
          new Date().toISOString(),
        remaining: 3,
      }),
    })

    return
  }

  await route.fulfill({
    status: 405,
    contentType:
      'application/json',
    body: JSON.stringify({
      ok: false,
    }),
  })
}

async function fulfillCmsPublicRest(
  route: Route,
): Promise<void> {
  const request =
    route.request()

  const url =
    new URL(request.url())

  if (
    request.method() !== 'GET' ||
    !url.pathname.endsWith(
      '/rest/v1/cms_lives',
    )
  ) {
    await route.continue()
    return
  }

  await route.fulfill({
    status: 200,
    contentType:
      'application/json',
    headers: {
      'cache-control':
        'no-store',
      'content-range':
        '0-0/1',
    },
    body: JSON.stringify([
      testCmsRow(),
    ]),
  })
}

function deterministicPlayerDocument(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>LIVE 4B deterministic player</title>
<style>
html,body {
  margin:0;
  width:100%;
  height:100%;
  background:#000;
}
body {
  display:flex;
  align-items:center;
  justify-content:center;
}
#live4b-test-video {
  width:100%;
  height:100%;
}
</style>
</head>
<body
  data-live4b-player-id="${LIVE4B_TEST_VIDEO_ID}"
  data-live4b-playback-progress="0"
>
<video
  id="live4b-test-video"
  aria-label="LIVE 4B deterministic test video"
  muted
  playsinline
></video>
<script>
(() => {
  const body = document.body
  let progress = 0

  window.setInterval(() => {
    progress += 0.25
    body.dataset.live4bPlaybackProgress =
      progress.toFixed(2)
  }, 250)
})()
</script>
</body>
</html>`
}

async function fulfillDeterministicPlayer(
  route: Route,
): Promise<void> {
  const url =
    new URL(
      route.request().url(),
    )

  const exactPath =
    `/embed/${LIVE4B_TEST_VIDEO_ID}`

  if (
    url.hostname !==
      'www.youtube.com' ||
    url.pathname !== exactPath
  ) {
    await route.continue()
    return
  }

  await route.fulfill({
    status: 200,
    contentType:
      'text/html; charset=utf-8',
    headers: {
      'cache-control':
        'no-store',
    },
    body:
      deterministicPlayerDocument(),
  })
}

export async function installLocalLiveReactionRoutes(
  page: Page,
  baseUrl: string,
): Promise<void> {
  if (
    !isLoopbackBrowserBaseUrl(
      baseUrl,
    )
  ) {
    throw new Error(
      'BLOCKED: browser fixtures require a loopback app',
    )
  }

  const appOrigin =
    new URL(baseUrl).origin

  await page.route(
    `${appOrigin}/api/live/canonical**`,
    fulfillCanonical,
  )

  await page.route(
    `${appOrigin}/api/live/reactions**`,
    fulfillReactions,
  )

  /*
   * cms_lives is requested by the public browser Supabase client.
   * Intercept that GET only. No real CMS write or production mutation.
   */
  await page.route(
    '**/rest/v1/cms_lives**',
    fulfillCmsPublicRest,
  )

  /*
   * Existing application iframe remains untouched.
   * Only its test-time YouTube request is fulfilled locally by Playwright.
   */
  await page.route(
    `https://www.youtube.com/embed/${LIVE4B_TEST_VIDEO_ID}**`,
    fulfillDeterministicPlayer,
  )
}

export async function clearBrowserReactionState(
  context: BrowserContext,
): Promise<void> {
  await context.clearCookies()
}