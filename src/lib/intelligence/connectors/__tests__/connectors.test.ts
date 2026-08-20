import { describe, it, expect } from 'vitest'
import {
  CONNECTOR_DESCRIPTORS,
  CONNECTOR_TO_METRIC_SOURCE,
  connectorMetricSource,
  createAllFoundationConnectors,
  createFoundationConnector,
} from '../registry'
import { NullConnector } from '../null-connector'
import { CONNECTOR_IDS } from '../types'
import { isDemoEnvelope } from '../../core/metric-envelope'
import { METRIC_SOURCES } from '../../types/metrics'

const QUERY = { from: '2026-08-01T00:00:00.000Z', to: '2026-08-19T00:00:00.000Z' }

describe('connecteurs de fondation (Phase 0)', () => {
  it('les 5 connecteurs prévus ont un descripteur', () => {
    expect(Object.keys(CONNECTOR_DESCRIPTORS).sort()).toEqual([...CONNECTOR_IDS].sort())
  })

  it('aucun connecteur de fondation ne sert de vraie donnée (available=false)', () => {
    for (const c of createAllFoundationConnectors()) {
      expect(c.available()).toBe(false)
      expect(c.descriptor.readOnly).toBe(true)
    }
  })

  it('le NullConnector force requiresNetwork=false (pas de réseau en Phase 0)', () => {
    for (const c of createAllFoundationConnectors()) {
      expect(c instanceof NullConnector).toBe(true)
      expect(c.descriptor.requiresNetwork).toBe(false)
    }
  })

  it('mode empty ⇒ aucune donnée', async () => {
    const c = createFoundationConnector('google_analytics', 'empty')
    await expect(c.fetchMetrics(QUERY)).resolves.toEqual([])
  })

  it('mode demo ⇒ uniquement des enveloppes de démonstration, préfixées par l’id', async () => {
    const c = createFoundationConnector('youtube', 'demo')
    const envs = await c.fetchMetrics(QUERY)
    expect(envs.length).toBeGreaterThan(0)
    for (const env of envs) {
      expect(isDemoEnvelope(env)).toBe(true)
      expect(env.metric.startsWith('youtube.')).toBe(true)
      // instant d'arrivée = borne haute de la requête (déterministe)
      expect(env.synced_at).toBe(QUERY.to)
    }
  })

  it('whatsapp_attribution ne requiert ni auth ni réseau (attribution-only)', () => {
    const d = CONNECTOR_DESCRIPTORS.whatsapp_attribution
    expect(d.requiresAuth).toBe(false)
    expect(d.requiresNetwork).toBe(false)
  })

  it('le pont ConnectorId → MetricSource couvre tous les ids vers des sources valides', () => {
    expect(Object.keys(CONNECTOR_TO_METRIC_SOURCE).sort()).toEqual([...CONNECTOR_IDS].sort())
    for (const id of CONNECTOR_IDS) {
      expect(METRIC_SOURCES).toContain(connectorMetricSource(id))
    }
    // le seam documenté : l'id "whatsapp_attribution" mappe la source "whatsapp"
    expect(connectorMetricSource('whatsapp_attribution')).toBe('whatsapp')
  })
})
