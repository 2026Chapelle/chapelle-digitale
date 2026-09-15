import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  readFileSync,
} from 'node:fs'

import {
  resolve,
} from 'node:path'

import {
  decideTeachingAccess,
  hasTeachingsPremiumAccess,
  mergePublicTeachingContent,
  TEACHINGS_PREMIUM_ENTITLEMENT_KEY,
} from './teaching-access'

describe(
  'ENSEIGNEMENTS-SEC â€” access contract',
  () => {
    it(
      'reuses the canonical public/member/premium matrix',
      () => {
        expect(
          decideTeachingAccess(
            'public',
            {
              authenticated: false,
              isMember: false,
              isAdmin: false,
              hasPremiumEntitlement: false,
            },
          ),
        ).toEqual({
          allowed: true,
          reason: 'ok',
        })

        expect(
          decideTeachingAccess(
            'member',
            {
              authenticated: false,
              isMember: false,
              isAdmin: false,
              hasPremiumEntitlement: false,
            },
          ),
        ).toEqual({
          allowed: false,
          reason: 'auth_required',
        })

        expect(
          decideTeachingAccess(
            'member',
            {
              authenticated: true,
              isMember: false,
              isAdmin: false,
              hasPremiumEntitlement: false,
            },
          ),
        ).toEqual({
          allowed: false,
          reason: 'member_only',
        })

        expect(
          decideTeachingAccess(
            'premium',
            {
              authenticated: true,
              isMember: true,
              isAdmin: false,
              hasPremiumEntitlement: false,
            },
          ),
        ).toEqual({
          allowed: false,
          reason: 'premium_denied',
        })

        expect(
          decideTeachingAccess(
            'premium',
            {
              authenticated: true,
              isMember: true,
              isAdmin: false,
              hasPremiumEntitlement: true,
            },
          ),
        ).toEqual({
          allowed: true,
          reason: 'ok',
        })
      },
    )

    it(
      'requires real membership before premium entitlement',
      () => {
        expect(
          decideTeachingAccess(
            'premium',
            {
              authenticated: true,
              isMember: false,
              isAdmin: false,
              hasPremiumEntitlement: true,
            },
          ),
        ).toEqual({
          allowed: false,
          reason: 'member_only',
        })
      },
    )

    it(
      'keeps admin preview allowed',
      () => {
        expect(
          decideTeachingAccess(
            'premium',
            {
              authenticated: false,
              isMember: false,
              isAdmin: true,
              hasPremiumEntitlement: false,
            },
          ),
        ).toEqual({
          allowed: true,
          reason: 'ok',
        })
      },
    )

    it(
      'uses teachings_premium through canonical has_entitlement',
      async () => {
        expect(
          TEACHINGS_PREMIUM_ENTITLEMENT_KEY,
        ).toBe(
          'teachings_premium',
        )

        const rpc =
          vi.fn().mockResolvedValue({
            data: true,
            error: null,
          })

        const allowed =
          await hasTeachingsPremiumAccess(
            { rpc },
            'user-123',
          )

        expect(allowed).toBe(true)

        expect(rpc).toHaveBeenCalledWith(
          'has_entitlement',
          {
            p_user: 'user-123',
            p_key: 'teachings_premium',
          },
        )
      },
    )

    it(
      'fails closed when entitlement lookup fails',
      async () => {
        const errorClient = {
          rpc:
            vi.fn().mockResolvedValue({
              data: null,
              error: new Error(
                'rpc failed',
              ),
            }),
        }

        await expect(
          hasTeachingsPremiumAccess(
            errorClient,
            'user-123',
          ),
        ).resolves.toBe(false)

        const malformedClient = {
          rpc:
            vi.fn().mockResolvedValue({
              data: 'true',
              error: null,
            }),
        }

        await expect(
          hasTeachingsPremiumAccess(
            malformedClient,
            'user-123',
          ),
        ).resolves.toBe(false)

        await expect(
          hasTeachingsPremiumAccess(
            malformedClient,
            null,
          ),
        ).resolves.toBe(false)
      },
    )

    it(
      'never merges protected description body or media into public catalog',
      () => {
        const result =
          mergePublicTeachingContent(
            [
              {
                id: 'public-1',
                title: 'Public',
                access_level: 'public',
              },
              {
                id: 'member-1',
                title: 'Member',
                access_level: 'member',
              },
              {
                id: 'premium-1',
                title: 'Premium',
                access_level: 'premium',
              },
            ],
            [
              {
                id: 'public-1',
                description: 'public description',
                body: 'public body',
                video_url: 'https://example.com/public-video',
                audio_url: 'https://example.com/public-audio',
              },
              {
                id: 'member-1',
                description: 'MUST NOT LEAK DESCRIPTION',
                body: 'MUST NOT LEAK BODY',
                video_url: 'https://example.com/member-video',
                audio_url: 'https://example.com/member-audio',
              },
              {
                id: 'premium-1',
                description: 'MUST NOT LEAK PREMIUM DESCRIPTION',
                body: 'MUST NOT LEAK PREMIUM BODY',
                video_url: 'https://example.com/premium-video',
                audio_url: 'https://example.com/premium-audio',
              },
            ],
          )

        expect(
          result[0].description,
        ).toBe(
          'public description',
        )

        expect(
          result[0].body,
        ).toBe(
          'public body',
        )

        expect(
          result[1].description,
        ).toBeNull()

        expect(
          result[1].body,
        ).toBeNull()

        expect(
          result[1].video_url,
        ).toBeNull()

        expect(
          result[1].audio_url,
        ).toBeNull()

        expect(
          result[2].description,
        ).toBeNull()

        expect(
          result[2].body,
        ).toBeNull()

        expect(
          result[2].video_url,
        ).toBeNull()

        expect(
          result[2].audio_url,
        ).toBeNull()
      },
    )

    it(
      'public page no longer uses generic cmsList for teachings',
      () => {
        const source =
          readFileSync(
            resolve(
              process.cwd(),
              'src/app/(public)/enseignements/page.tsx',
            ),
            'utf8',
          )

        expect(source).toContain(
          'listPublishedTeachingLibrary',
        )

        expect(source).not.toContain(
          "cmsList<CmsTeaching>('cms_teachings'",
        )
      },
    )

    it(
      'server catalog never includes sensitive fields in metadata select',
      () => {
        const source =
          readFileSync(
            resolve(
              process.cwd(),
              'src/lib/teachings/teaching-access-server.ts',
            ),
            'utf8',
          )

        const metadataMatch =
          source.match(
            /const METADATA_SELECT\s*=\s*[\r\n\s]*'([^']+)'/,
          )

        expect(
          metadataMatch,
        ).not.toBeNull()

        const metadataSelect =
          metadataMatch?.[1] || ''

        expect(
          metadataSelect,
        ).not.toContain(
          'description',
        )

        expect(
          metadataSelect,
        ).not.toContain(
          'body',
        )

        expect(
          metadataSelect,
        ).not.toContain(
          'video_url',
        )

        expect(
          metadataSelect,
        ).not.toContain(
          'audio_url',
        )
      },
    )

    it(
      'sensitive public content query is explicitly restricted to public access',
      () => {
        const source =
          readFileSync(
            resolve(
              process.cwd(),
              'src/lib/teachings/teaching-access-server.ts',
            ),
            'utf8',
          )
            .replace(
              /\s+/g,
              ' ',
            )
            .trim()

        expect(source).toContain(
          ".select(PUBLIC_CONTENT_SELECT) .eq('status', 'published') .eq('access_level', 'public')",
        )
      },
    )

    it(
      'secure API accepts no client supplied access or content payload',
      () => {
        const source =
          readFileSync(
            resolve(
              process.cwd(),
              'src/app/api/enseignements/[id]/access/route.ts',
            ),
            'utf8',
          )

        expect(source).toContain(
          'getTeachingDelivery',
        )

        expect(source).toContain(
          'hasTeachingsPremiumAccess',
        )

        expect(source).toContain(
          'isMemberStatus',
        )

        expect(source).not.toContain(
          'req.json()',
        )
      },
    )
  },
)