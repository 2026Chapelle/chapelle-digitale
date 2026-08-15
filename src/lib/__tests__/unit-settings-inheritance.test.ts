import { describe, it, expect } from 'vitest'
import {
  ancestorUnitIdsFromPath,
  inheritFieldsList,
  resolveInheritedUnitSettings,
  type UnitSettingsRow,
} from '@/lib/erp/unit-settings-inheritance'

const HQ = '11111111-1111-1111-1111-111111111111'
const AF = '22222222-2222-2222-2222-222222222222'
const CI = '33333333-3333-3333-3333-333333333333'
const LOCAL = '44444444-4444-4444-4444-444444444444'

describe('unit-settings inheritance', () => {
  it('ancestorUnitIdsFromPath : local → national → zone → HQ', () => {
    const path = `/${HQ}/${AF}/${CI}/${LOCAL}/`
    expect(ancestorUnitIdsFromPath(path, LOCAL)).toEqual([LOCAL, CI, AF, HQ])
  })

  it('city n’est pas un champ héritable', () => {
    const fields = inheritFieldsList()
    expect(fields).not.toContain('city')
    expect(fields).toEqual(
      expect.arrayContaining([
        'timezone',
        'default_locale',
        'default_currency',
        'contact_email',
        'contact_phone',
        'address',
        'local_display_name',
      ]),
    )
  })

  it('resolveInheritedUnitSettings : locale gagne puis chute sur ancêtres puis org', () => {
    const chain: UnitSettingsRow[] = [
      {
        organization_unit_id: LOCAL,
        timezone: null,
        default_locale: null,
        default_currency: null,
        contact_email: 'local@x.com',
        contact_phone: null,
        address: null,
        local_display_name: null,
      },
      {
        organization_unit_id: CI,
        timezone: 'Africa/Abidjan',
        default_locale: 'fr',
        default_currency: null,
        contact_email: 'national@x.com',
        contact_phone: '+225',
        address: 'HQ CI',
        local_display_name: 'CI',
      },
      {
        organization_unit_id: AF,
        timezone: 'Africa/Lagos',
        default_locale: 'en',
        default_currency: 'XOF',
        contact_email: null,
        contact_phone: null,
        address: null,
        local_display_name: 'AF',
      },
    ]

    const r = resolveInheritedUnitSettings(chain, {
      timezone: 'UTC',
      default_locale: 'en',
      default_currency: 'USD',
    })

    expect(r.contact_email).toBe('local@x.com')
    expect(r.sources.contact_email).toBe(LOCAL)
    expect(r.timezone).toBe('Africa/Abidjan')
    expect(r.sources.timezone).toBe(CI)
    expect(r.default_locale).toBe('fr')
    expect(r.default_currency).toBe('XOF')
    expect(r.sources.default_currency).toBe(AF)
    expect(r.address).toBe('HQ CI')
    // city n'existe pas sur le résultat d'héritage
    expect(r).not.toHaveProperty('city')
  })

  it('repli organisation mondiale si chaîne vide de valeurs', () => {
    const r = resolveInheritedUnitSettings([], {
      timezone: 'Africa/Abidjan',
      default_locale: 'fr',
      default_currency: 'XOF',
    })
    expect(r.timezone).toBe('Africa/Abidjan')
    expect(r.sources.timezone).toBe('organization')
    expect(r.default_locale).toBe('fr')
    expect(r.default_currency).toBe('XOF')
  })
})
