import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/(public)/live/page.tsx"),
  "utf8"
)

describe("live back navigation consistency", () => {
  it("reloads the current live page when restored from bfcache", () => {
    expect(source).toContain("const handleLivePageShow = (event: PageTransitionEvent) => {")
    expect(source).toContain("if (event.persisted)")
    expect(source).toContain("window.location.reload()")
    expect(source).toContain("window.addEventListener('pageshow', handleLivePageShow)")
    expect(source).toContain("window.removeEventListener('pageshow', handleLivePageShow)")
  })

  it("preserves live refresh and keeps the offline layout compact", () => {
    expect(source).toContain("visibilitychange")
    expect(source).toContain("/api/live/canonical")
    expect(source).toContain("LIVE_POLL_INTERVAL_MS = 15_000")
    expect(source).toContain("min-h-[420px] sm:min-h-[470px] xl:min-h-[520px]")
    expect(source).toContain("grid grid-cols-1 lg:grid-cols-2 items-start gap-4 lg:gap-6")
    expect(source).toContain("container-royal mt-5 sm:mt-6 space-y-4 sm:space-y-5")
    expect(source).toContain('<a href="/evenements"')
    expect(source).toContain('data-live-agenda-link="true"')
  })
})