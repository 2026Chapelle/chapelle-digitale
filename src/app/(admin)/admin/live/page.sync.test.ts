import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

describe('LIVE & REPLAY V1 — administration', () => {
  it('mounts the YouTube sync panel next to the live supervision', () => {
    const page = read('src/app/(admin)/admin/live/page.tsx')
    expect(page).toContain("import YouTubeSyncPanel from '@/components/admin/live/YouTubeSyncPanel'")
    expect(page).toContain('<LiveAdminSupervision />')
    expect(page).toContain('<YouTubeSyncPanel />')
  })

  it('shows the five lifecycle states and a secured manual relaunch', () => {
    const panel = read('src/components/admin/live/YouTubeSyncPanel.tsx')
    for (const label of ['Live programmé', 'En direct', 'Replay en attente', 'Replay disponible', 'Erreur de synchronisation']) expect(panel).toContain(label)
    expect(panel).toContain("fetch('/api/admin/live/sync', { method: 'POST'")
    expect(panel).toContain("credentials: 'same-origin'")
  })

  it('offers the replay_pending status in the lives CMS without removing existing statuses', () => {
    const lives = read('src/app/(admin)/admin/lives/page.tsx')
    for (const value of ['draft', 'scheduled', 'live', 'replay_pending', 'ended', 'published', 'cancelled']) expect(lives).toContain(`value: '${value}'`)
  })

  it('keeps replay_pending and cancelled out of the public statuses (cmsList + RLS policy)', () => {
    expect(read('src/lib/cms.ts')).toContain("cms_lives: ['scheduled', 'live', 'ended', 'published']")
    expect(read('supabase/migrations/20260530100000_cms_core.sql')).toContain("using (status in ('scheduled','live','ended','published'))")
  })
})
