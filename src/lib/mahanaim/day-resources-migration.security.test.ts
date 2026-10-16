import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261016120000_mahanaim_day_resources.sql'),
  'utf8',
).toLowerCase()

describe('Mahanaïm day resources migration security', () => {
  it('creates the API-compatible day-owned resource model with integrity constraints', () => {
    expect(migration).toContain('create table if not exists chapelle.mahanaim_day_resources')
    expect(migration).toContain('day_id uuid not null')
    expect(migration).toContain('references chapelle.mahanaim_retreat_days(id)')
    expect(migration).toContain("resource_type in ('video', 'pdf')")
    expect(migration).toContain("session_type in ('morning', 'evening')")
    expect(migration).toContain('resource_url is not null')
    expect(migration).toContain('storage_path is not null')
    expect(migration).toContain('uq_mahanaim_day_resources_video_session')
    expect(migration).toContain('uq_mahanaim_day_resources_pdf')
  })

  it('is read-only for clients and denies anonymous access by grant', () => {
    expect(migration).toContain('enable row level security')
    expect(migration).toMatch(/revoke all on table chapelle\.mahanaim_day_resources\s+from public, anon, authenticated/)
    expect(migration).toMatch(/grant select on table chapelle\.mahanaim_day_resources to authenticated/)
    expect(migration).not.toMatch(/grant (?:select, )?insert.*to authenticated/)
    expect(migration).not.toMatch(/grant .*update.*to authenticated/)
    expect(migration).not.toMatch(/grant .*delete.*to authenticated/)
  })

  it('limits member reads to an active enrollment and the P0.3 J1–J10 unlock cutoff', () => {
    expect(migration).toContain("'serviteur'::chapelle.role_key")
    expect(migration).toContain('en.member_id = chapelle.current_member_id()')
    expect(migration).toMatch(/en\.status in \('registered', 'active', 'completed'\)/)
    expect(migration).toMatch(/r\.digital_status in \('registration_open', 'active', 'completed'\)/)
    expect(migration).toContain('d.day_number = 1')
    expect(migration).toContain("time '18:00'")
    expect(migration).toContain('at time zone r.timezone')
  })

  it('keeps binary documents private and makes server-role access explicit', () => {
    expect(migration).toMatch(/grant select, insert, update, delete on table chapelle\.mahanaim_day_resources to service_role/)
    expect(migration).not.toContain('storage.objects')
  })
})
