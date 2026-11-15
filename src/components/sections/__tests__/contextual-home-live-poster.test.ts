import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/sections/ContextualHome.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')
const liveCard = source.slice(source.indexOf('{hasLive && <article className="today-live-card'), source.indexOf('</article>}', source.indexOf('{hasLive && <article className="today-live-card')))
const rule = (selector: string) => {
  const start = css.indexOf(`${selector} {`)
  return start < 0 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('next-event card poster (« Prochain rendez-vous »)', () => {
  it('shows the whole poster: contain, no crop, no deformation', () => {
    expect(liveCard).toContain('className="today-live-poster"')
    expect(liveCard).toContain('className="today-live-poster-image"')
    expect(liveCard).not.toContain('object-cover')
    expect(rule('.today-live-poster-image')).toContain('object-fit: contain')
  })

  it('keeps the main poster sharp and static (blur and hover motion only on the backdrop)', () => {
    expect(rule('.today-live-poster-image')).toContain('filter: none')
    expect(rule('.today-live-poster-image')).toContain('transform: none')
    expect(liveCard).not.toMatch(/today-live-poster-image[^"]*home-motion-image/)
    expect(rule('.today-live-poster-backdrop')).toContain('filter: blur(')
    expect(css).toContain('.today-live-card:hover .today-live-poster-backdrop')
  })

  it('makes the blurred backdrop decorative for assistive technologies and keeps the title as alt text', () => {
    expect(liveCard).toMatch(/alt="" aria-hidden="true"[^>]*className="today-live-poster-backdrop"/)
    expect(liveCard).toMatch(/alt=\{liveState\.title\}[^>]*className="today-live-poster-image"/)
  })

  it('harmonises the frame with the existing card background and adapts per breakpoint', () => {
    expect(rule('.today-live-poster')).toContain('background: #0b0c14')
    expect(rule('.today-live-poster-image')).toContain('max-height: 340px')
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.today-live-poster \{ height: 100%; min-height: 220px; \}/)
  })

  it('touches no other home card style', () => {
    expect(rule('.today-primary-image')).toContain('aspect-ratio: 16 / 9')
    expect(css).toContain('.today-primary-image img { display: block; width: 100%; height: 100%; object-fit: contain; }')
    expect(css).toContain('.today-support-card > div:last-child { flex: 1; }')
  })
})
