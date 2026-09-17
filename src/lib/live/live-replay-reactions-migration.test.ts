import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260915210000_live4c_replay_reactions.sql',
)
const sql = readFileSync(migrationPath, 'utf8')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

describe('LIVE 4C replay reactions migration', () => {
  it('fails before DDL when reaction rows already exist', () => {
    const preflight = 'if exists ( select 1 from public.live_replay_reactions limit 1 )'
    const exception = "raise exception 'live4c_replay_reactions_not_empty'"
    const firstDdl = sql.indexOf('alter table')

    expect(sql.startsWith('begin;')).toBe(true)
    expect(sql).toContain(preflight)
    expect(sql).toContain(exception)
    expect(sql.indexOf(preflight)).toBeLessThan(firstDdl)
    expect(sql.indexOf(exception)).toBeLessThan(firstDdl)
    expect(sql).toMatch(/commit;$/)
  })

  it('verifies the historical constraints before changing them', () => {
    expect(sql).toContain("conname = 'live_replay_reactions_pkey'")
    expect(sql).toContain("conname = 'live_replay_reactions_reaction_check'")
    expect(sql).toContain("conname = 'organization_units_org_id_unique'")
    expect(sql).toContain("to_regprocedure('public.cms_touch_updated_at()')")
  })

  it('enforces one active reaction per actor with exact keys', () => {
    expect(sql).toContain('drop constraint live_replay_reactions_pkey')
    expect(sql).toContain('drop constraint live_replay_reactions_reaction_check')
    expect(sql).toContain("reaction in ('amen', 'receive', 'glory', 'thanks')")
    expect(sql).toContain('primary key (cms_live_id, actor_key)')
  })

  it('adds the hierarchical organization boundary to cms_lives', () => {
    expect(sql).toContain('add column organization_id uuid')
    expect(sql).toContain('add column organization_unit_id uuid')
    expect(sql).toContain('constraint cms_lives_replay_unit_pair_check')
    expect(sql).toContain('foreign key (organization_id, organization_unit_id)')
    expect(sql).toContain('references public.organization_units(organization_id, id)')
    expect(sql).toContain('on public.cms_lives(organization_id, organization_unit_id)')
  })

  it('creates default-enabled server-owned settings with timestamp maintenance', () => {
    expect(sql).toContain('create table public.live_replay_reaction_settings')
    expect(sql).toContain('enabled boolean not null default true')
    expect(sql).toContain('updated_by uuid references public.profiles(id) on delete set null')
    expect(sql).toContain('trg_live_replay_reaction_settings_touch_updated_at')
    expect(sql).toContain('execute function public.cms_touch_updated_at()')
  })

  it('keeps direct-client access closed', () => {
    expect(sql).toContain('alter table public.live_replay_reactions enable row level security')
    expect(sql).toContain('alter table public.live_replay_reaction_settings enable row level security')
    expect(sql).toContain('alter table public.live_replay_reaction_settings force row level security')
    expect(sql).toContain('alter table public.live_replay_reactions force row level security')
    expect(sql).toContain('revoke all on table public.live_replay_reactions from public, anon, authenticated')
    expect(sql).toContain('revoke all on table public.live_replay_reaction_settings from public, anon, authenticated')
    expect(sql).toContain('grant all on table public.live_replay_reaction_settings to service_role')
    expect(sql).toContain('grant all on table public.live_replay_reactions to service_role')
    expect(sql).not.toContain('create policy')
  })

  it('contains no data rewrite or destructive table command', () => {
    expect(sql).not.toMatch(/\b(drop table|truncate|delete from|insert into|update public\.)\b/)
  })
})
