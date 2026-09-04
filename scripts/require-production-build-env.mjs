#!/usr/bin/env node
/** Refuse un artefact navigateur de production sans configuration Supabase publique valide. */
const EXPECTED_PROJECT_REF = 'nvyuyffywnuollaxguen'
const PLACEHOLDER = /placeholder|remplacer|replace|change.?me|your[_ -]?|example/i

function fail(code) {
  console.error(`[production-build-env] REFUS: ${code}`)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!url) fail('NEXT_PUBLIC_SUPABASE_URL_MISSING')
if (!anonKey) fail('NEXT_PUBLIC_SUPABASE_ANON_KEY_MISSING')
if (PLACEHOLDER.test(url)) fail('NEXT_PUBLIC_SUPABASE_URL_PLACEHOLDER')
if (PLACEHOLDER.test(anonKey)) fail('NEXT_PUBLIC_SUPABASE_ANON_KEY_PLACEHOLDER')

let host = ''
try {
  host = new URL(url).hostname.toLowerCase()
} catch {
  fail('NEXT_PUBLIC_SUPABASE_URL_INVALID')
}
if (host !== `${EXPECTED_PROJECT_REF}.supabase.co`) fail('SUPABASE_PROJECT_REF_MISMATCH')

console.log('[production-build-env] OK: public Supabase build configuration validated.')
