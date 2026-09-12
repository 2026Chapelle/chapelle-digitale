import { readFileSync } from "node:fs";
import fs from 'node:fs'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const root =
  process.cwd()

function read(
  file: string,
) {
  return fs.readFileSync(
    path.join(root, file),
    'utf8',
  )
}

const migration =
  read(
    'supabase/migrations/20260911231000_teaching_comments.sql',
  )

const api =
  read(
    'src/app/api/enseignements/[id]/comments/route.ts',
  )

const component =
  read(
    'src/components/teachings/TeachingComments.tsx',
  )

const detail =
  read(
    'src/app/(public)/enseignements/[slug]/page.tsx',
  )

const adminApi =
  read(
    'src/app/api/admin/submissions/[resource]/route.ts',
  )

const adminNav =
  read(
    'src/lib/navigation/admin-nav.ts',
  )

describe(
  'teaching comments foundation',
  () => {
  // SERVER_ONLY_COMMENT_ACCESS_CONTRACT
  it("keeps teaching comments behind the server access layer", () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260912050000_teaching_comments_server_only_access.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "drop policy if exists cms_teaching_comments_read",
    );
    expect(migration).toContain(
      "revoke all privileges",
    );
    expect(migration).toContain(
      "from anon, authenticated",
    );
    expect(migration).toContain(
      "grant all privileges",
    );
    expect(migration).toContain(
      "to service_role",
    );

    expect(migration).not.toMatch(
      /grant\s+select[\s\S]*to\s+(anon|authenticated)/i,
    );
  });

    it(
      'creates a dedicated comment table linked to teachings',
      () => {
        expect(migration).toContain(
          'cms_teaching_comments',
        )

        expect(migration).toContain(
          'references public.cms_teachings(id)',
        )
      },
    )

    it(
      'uses pending published rejected moderation',
      () => {
        expect(migration).toContain(
          "'pending'",
        )

        expect(migration).toContain(
          "'published'",
        )

        expect(migration).toContain(
          "'rejected'",
        )
      },
    )

    it(
      'only exposes published rows through RLS',
      () => {
        expect(migration).toContain(
          "status = 'published'",
        )

        expect(migration).toContain(
          'revoke insert, update, delete',
        )
      },
    )

    it(
      'requires verified identity for submissions',
      () => {
        expect(api).toContain(
          'getVerifiedRouteProfile',
        )

        expect(api).toContain(
          "status: 'pending'",
        )
      },
    )

    it(
      'rate limits comment submission',
      () => {
        expect(api).toContain(
          'rateLimit(',
        )

        expect(api).toContain(
          'clientIp(request)',
        )
      },
    )

    it(
      'checks teaching access before exposing comments',
      () => {
        expect(api).toContain(
          'getTeachingDelivery',
        )

        expect(api).toContain(
          'hasTeachingsPremiumAccess',
        )
      },
    )

    it(
      'mounts comments on the reading page',
      () => {
        expect(detail).toContain(
          '<TeachingComments',
        )

        expect(component).toContain(
          'id="commentaires"',
        )
      },
    )

    it(
      'reuses the guarded admin submissions API',
      () => {
        expect(adminApi).toContain(
          "'cms_teaching_comments'",
        )
      },
    )

    it(
      'adds moderation to admin navigation',
      () => {
        expect(adminNav).toContain(
          '/admin/teaching-comments',
        )
      },
    )
  },
)