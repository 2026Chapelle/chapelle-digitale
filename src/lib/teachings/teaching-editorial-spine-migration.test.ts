import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260911090000_teaching_editorial_spine.sql'),
  'utf8',
)

const sql = migration
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

describe('LOT ENSEIGNEMENTS 1 — teaching editorial spine migration', () => {
  it('creates teaching series and seasons without reusing podcast containers', () => {
    expect(sql).toContain('create table if not exists public.cms_teaching_series')
    expect(sql).toContain('create table if not exists public.cms_teaching_seasons')

    expect(sql).not.toContain(
      'references public.cms_podcast_series(id)',
    )

    expect(sql).not.toContain(
      'references public.cms_podcast_seasons(id)',
    )
  })

  it('extends teachings with optional hierarchy, access and featured fields', () => {
    expect(sql).toContain('add column if not exists series_id uuid')
    expect(sql).toContain('add column if not exists season_id uuid')
    expect(sql).toContain(
      "add column if not exists access_level text not null default 'public'",
    )
    expect(sql).toContain(
      'add column if not exists is_featured boolean not null default false',
    )
  })

  it('uses canonical public/member/premium values', () => {
    expect(sql).toContain(
      "check (access_level in ('public', 'member', 'premium'))",
    )
  })

  it('never cascades deletion from a teaching container into cms_teachings', () => {
    expect(sql).toContain(
      'foreign key (series_id) references public.cms_teaching_series(id) on delete set null',
    )

    expect(sql).toContain(
      'foreign key (season_id) references public.cms_teaching_seasons(id) on delete set null',
    )
  })

  it('enforces season/series consistency', () => {
    expect(sql).toContain('cms_validate_teaching_hierarchy')
    expect(sql).toContain('teaching_series_season_mismatch')
  })

  it('fails closed for direct teaching reads', () => {
    expect(sql).toContain('create policy cms_teachings_read')
    expect(sql).toContain("status = 'published' and access_level = 'public'")
  })

  it('keeps writes server-side', () => {
    expect(sql).toContain(
      'grant select, insert, update, delete on public.cms_teaching_series to service_role',
    )

    expect(sql).toContain(
      'grant select, insert, update, delete on public.cms_teaching_seasons to service_role',
    )

    expect(sql).toContain(
      'revoke all on function public.cms_validate_teaching_hierarchy() from public, anon, authenticated',
    )
  })

  it('revokes direct writes from public roles', () => {
    expect(sql).toContain(
      'revoke insert, update, delete, truncate, references, trigger on public.cms_teaching_series from public, anon, authenticated',
    )

    expect(sql).toContain(
      'revoke insert, update, delete, truncate, references, trigger on public.cms_teaching_seasons from public, anon, authenticated',
    )
  })

  it('keeps hierarchy coherent when a season is moved to another series', () => {
    expect(sql).toContain(
      'create or replace function public.cms_sync_teaching_season_series()',
    )

    expect(sql).toContain(
      'update public.cms_teachings set series_id = new.series_id where season_id = new.id',
    )

    expect(sql).toContain(
      'after update of series_id on public.cms_teaching_seasons',
    )
  })

  it('prevents direct execution of teaching hierarchy trigger functions', () => {
    expect(sql).toContain(
      'revoke all on function public.cms_validate_teaching_hierarchy() from public, anon, authenticated',
    )

    expect(sql).toContain(
      'revoke all on function public.cms_sync_teaching_season_series() from public, anon, authenticated',
    )
  })})