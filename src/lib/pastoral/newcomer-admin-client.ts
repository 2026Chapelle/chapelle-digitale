/**
 * Lot 2-A — factory serveur : repository + scope canonique via supabaseAdmin.
 * Importable uniquement depuis des route handlers / modules server-only.
 * Ne jamais importer depuis un composant client.
 */

import 'server-only'

import { supabaseAdmin } from '@/lib/supabase'
import { createNewcomerIntakesRepository } from './newcomer-intakes-repository'
import type { NewcomerDbClient } from './newcomer-intakes-repository'
import {
  resolveCanonicalOrganizationId,
  resolveNewcomerAdminOrganizationId,
  resolvePublicNewcomerOrganizationId,
  type OrgLookupClient,
} from './newcomer-tenant-scope'

export function getNewcomerAdminDb(): NewcomerDbClient {
  return supabaseAdmin as unknown as NewcomerDbClient
}

export function getNewcomerOrgLookupClient(): OrgLookupClient {
  return supabaseAdmin as unknown as OrgLookupClient
}

export function getNewcomerIntakesRepository() {
  return createNewcomerIntakesRepository(getNewcomerAdminDb())
}

export {
  resolveCanonicalOrganizationId,
  resolveNewcomerAdminOrganizationId,
  resolvePublicNewcomerOrganizationId,
}
