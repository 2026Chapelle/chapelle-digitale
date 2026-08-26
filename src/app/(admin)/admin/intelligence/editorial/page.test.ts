import { expect, it } from 'vitest'
import { parseEditorialResponse } from '@/lib/intelligence/editorial/response-parser'

it('returns a French error for an empty refresh response', async () => {
  await expect(parseEditorialResponse(new Response('', { status: 500 }))).rejects.toThrow('Actualisation éditoriale impossible.')
})
