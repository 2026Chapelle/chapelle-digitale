import { chromium } from '@playwright/test'

const base = process.env.CITADELLE_TEST_BASE_URL || 'http://127.0.0.1:3111'
const expected = (process.env.CITADELLE_EXPECT_LIVE_STATE || '').toUpperCase()

if (!['UPCOMING', 'LIVE', 'OFFLINE'].includes(expected)) {
  console.error('EVENT_TEST_CONFIG=FAIL')
  console.error('Expected CITADELLE_EXPECT_LIVE_STATE=UPCOMING|LIVE|OFFLINE')
  process.exit(2)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

const pageErrors = []
const consoleErrors = []

page.on('pageerror', err => pageErrors.push(err.message))
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

let failed = false

const result = (name, pass) => {
  console.log(`${name}=${pass ? 'PASS' : 'FAIL'}`)
  if (!pass) failed = true
}

try {
  const response = await page.goto(base + '/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })

  result('HOME_HTTP_200', response?.status() === 200)

  await page.waitForTimeout(5000)

  const bodyText = await page.locator('body').innerText()

  if (expected === 'UPCOMING') {
    const label = bodyText.includes('PROCHAIN RENDEZ-VOUS')
    const title =
      bodyText.includes('REVIENS À LA MAISON') ||
      bodyText.includes('LE PÈRE T’ATTEND ENCORE')

    const cta = bodyText.includes('Voir le rendez-vous')

    const liveLink = page.locator('a[href="/live"]', {
      hasText: /Voir le rendez-vous/i,
    })

    const linkVisible = await liveLink.count() > 0
      ? await liveLink.first().isVisible().catch(() => false)
      : false

    const eventCard = page.locator('article').filter({
      hasText: /PROCHAIN RENDEZ-VOUS/i,
    })

    let imageVisible = false

    if (await eventCard.count()) {
      const img = eventCard.first().locator('img')
      if (await img.count()) {
        const src = await img.first().getAttribute('src')
        imageVisible =
          Boolean(src) &&
          await img.first().isVisible().catch(() => false)
      }
    }

    result('TODAY_EVENT_UPCOMING_BROWSER', label && title && cta)
    result('TODAY_EVENT_UPCOMING_TITLE', title)
    result('TODAY_EVENT_UPCOMING_CTA', cta)
    result('TODAY_EVENT_UPCOMING_IMAGE', imageVisible)
    result('TODAY_EVENT_UPCOMING_LINK', linkVisible)
    result('TODAY_EVENT_UPCOMING_PAGEERRORS', pageErrors.length === 0)
  }

  if (expected === 'LIVE') {
    const label = bodyText.includes('EN DIRECT')
    const cta = bodyText.includes('Rejoindre maintenant')

    const liveLink = page.locator('a[href="/live"]', {
      hasText: /Rejoindre maintenant/i,
    })

    const linkVisible = await liveLink.count() > 0
      ? await liveLink.first().isVisible().catch(() => false)
      : false

    const eventCard = page.locator('article').filter({
      hasText: /EN DIRECT/i,
    })

    let imageVisible = false

    if (await eventCard.count()) {
      const img = eventCard.first().locator('img')
      if (await img.count()) {
        const src = await img.first().getAttribute('src')
        imageVisible =
          Boolean(src) &&
          await img.first().isVisible().catch(() => false)
      }
    }

    result('TODAY_EVENT_LIVE_BROWSER', label && cta)
    result('TODAY_EVENT_LIVE_LABEL', label)
    result('TODAY_EVENT_LIVE_CTA', cta)
    result('TODAY_EVENT_LIVE_IMAGE', imageVisible)
    result('TODAY_EVENT_LIVE_LINK', linkVisible)
    result('TODAY_EVENT_LIVE_PAGEERRORS', pageErrors.length === 0)
  }

  if (expected === 'OFFLINE') {
    const eventLabelPresent =
      bodyText.includes('PROCHAIN RENDEZ-VOUS') ||
      bodyText.includes('EN DIRECT')

    const mainVisible = await page.locator('main').count()
      ? await page.locator('main').first().isVisible().catch(() => false)
      : true

    result('TODAY_EVENT_OFFLINE_BROWSER', !eventLabelPresent)
    result('TODAY_EVENT_OFFLINE_HIDDEN', !eventLabelPresent)
    result('TODAY_LAYOUT_OFFLINE_STABLE', mainVisible && pageErrors.length === 0)
  }

  console.log(`EVENT_PAGEERROR_COUNT=${pageErrors.length}`)
  console.log(`EVENT_CONSOLE_ERROR_COUNT=${consoleErrors.length}`)

} catch (error) {
  console.error('EVENT_TEST_EXCEPTION=' + String(error))
  failed = true
} finally {
  await browser.close()
}

process.exit(failed ? 1 : 0)