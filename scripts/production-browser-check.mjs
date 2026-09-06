import { chromium } from '@playwright/test'
console.log('BROWSER_CHECK_START')

const base = process.env.CITADELLE_TEST_BASE_URL || 'http://127.0.0.1:3111'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()
const pageErrors = []
const consoleErrors = []
const relevantConsoleErrors = []
page.on('pageerror', error => pageErrors.push(error.message))
page.on('console', message => { if (message.type() === 'error') { consoleErrors.push(message.text()); if (!message.text().includes('status of 401')) relevantConsoleErrors.push(message.text()) } })
const bodyHas = async (text) => (await page.locator('body').innerText()).includes(text)
const homeCheck = async () => (await bodyHas('Citadelle')) && (await bodyHas('Aujourd'))

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 20000 })
const homeInitial = await homeCheck()
await page.waitForTimeout(5000)
const homeAfter5s = await homeCheck()
await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 })
const homeRefresh = await homeCheck()
await page.waitForTimeout(5000)
const homeAfterRefresh5s = await homeCheck()

await page.goto(base + '/podcast', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(4000)
const podcastText = await page.locator('body').innerText()
const podcastLatest = podcastText.includes("Quand l'Invisible Traverse le Visible")
const podcastImages = await page.locator('img').count()

await page.goto(base + '/formations', { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(4000)
const formationsText = await page.locator('body').innerText()
const formationVisitor = formationsText.includes('Parcours Visiteur')
const formationEmpty = formationsText.includes('Aucune formation publiée pour le moment')

console.log('HOME_ANON_INITIAL_RENDER=' + (homeInitial ? 'PASS' : 'FAIL'))
console.log('HOME_ANON_AFTER_5S=' + (homeAfter5s ? 'PASS' : 'FAIL'))
console.log('HOME_ANON_HARD_REFRESH=' + (homeRefresh ? 'PASS' : 'FAIL'))
console.log('HOME_ANON_AFTER_REFRESH_5S=' + (homeAfterRefresh5s ? 'PASS' : 'FAIL'))
console.log('HOME_PAGEERROR_COUNT=' + pageErrors.length)
console.log('HOME_RELEVANT_CONSOLE_ERROR_COUNT=' + relevantConsoleErrors.length)
console.log('PODCAST_BROWSER_RENDER=' + (podcastLatest ? 'PASS' : 'FAIL'))
console.log('PODCAST_LATEST_VISIBLE=' + (podcastLatest ? 'PASS' : 'FAIL'))
console.log('PODCAST_COVER_BROWSER=' + (podcastImages > 0 ? 'PASS' : 'FAIL'))
console.log('PODCAST_PAGEERROR_COUNT=' + pageErrors.length)
console.log('FORMATIONS_BROWSER_RENDER=' + (formationVisitor && !formationEmpty ? 'PASS' : 'FAIL'))
console.log('VISITOR_FORMATION_BROWSER=' + (formationVisitor ? 'PASS' : 'FAIL'))
console.log('FORMATIONS_EMPTY_STATE_VISIBLE=' + (formationEmpty ? 'YES' : 'NO'))
console.log('FORMATIONS_PAGEERROR_COUNT=' + pageErrors.length)
if (consoleErrors.length) console.log('BROWSER_CONSOLE_ERRORS=' + JSON.stringify(consoleErrors))
await browser.close()
if (!homeInitial || !homeAfter5s || !homeRefresh || !homeAfterRefresh5s || !podcastLatest || !formationVisitor || formationEmpty || pageErrors.length || relevantConsoleErrors.length) process.exitCode = 1
