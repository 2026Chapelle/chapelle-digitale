import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260926040000_live4c_cms_lives_service_role_select.sql',
  ),
  'utf8',
)
  .toLowerCase()
  .replace(/\s+/g, ' ')

describe('LIVE 4C cms_lives service_role ACL migration', () => {
  it('grants only SELECT on cms_lives to service_role', () => {
    expect(sql).toContain(
      'grant select on table public.cms_lives to service_role',
    )

    expect(sql).not.toMatch(
      /grant\s+(all|insert|update|delete|truncate)\s+on\s+(?:table\s+)?public\.cms_lives/,
    )
  })

  it('contains no schema or data mutation', () => {
    expect(sql).not.toMatch(
      /\b(insert|update|delete|truncate|alter|drop|create)\b/,
    )
  })
})
