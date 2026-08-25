import { describe, expect, it } from 'vitest'
import { evaluateGoalTrajectory, GOAL_TRAJECTORY_STATES, SUPPORTED_GOAL_METRICS } from '../trajectory'

const NOW = '2026-08-24T12:00:00.000Z'
const ACTIVE_NOW = '2026-08-06T00:00:00.000Z'

const baseGoal = {
  id: 'goal-1',
  organizationId: 'org-1',
  metricKey: 'visits' as const,
  targetValue: 100,
  periodStart: '2026-08-01',
  periodEnd: '2026-08-11',
  status: 'ACTIVE' as const,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  createdBy: 'author-1',
  updatedBy: 'author-1',
}

describe('goal trajectory evaluator', () => {
  it('goal absent => NO_GOAL', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: NOW,
      goal: null,
      observed: null,
    })

    expect(trajectory.state).toBe('NO_GOAL')
    expect(trajectory.goalId).toBeNull()
    expect(trajectory.targetValue).toBeNull()
  })

  it('future goal => NOT_STARTED', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: NOW,
      goal: { ...baseGoal, periodStart: '2026-08-30', periodEnd: '2026-09-30' },
      observed: { value: 0, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('NOT_STARTED')
    expect(trajectory.observedValue).toBe(0)
    expect(trajectory.remainingGap).toBe(100)
    expect(trajectory.paceRequired).toBeNull()
  })

  it('active period, observed == target => ACHIEVED', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: ACTIVE_NOW,
      goal: baseGoal,
      observed: { value: 100, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('ACHIEVED')
    expect(trajectory.remainingGap).toBe(0)
    expect(trajectory.paceRequired).toBe(0)
  })

  it('active period, observed > target => ACHIEVED', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: ACTIVE_NOW,
      goal: baseGoal,
      observed: { value: 123, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('ACHIEVED')
    expect(trajectory.remainingGap).toBe(0)
    expect(trajectory.paceRequired).toBe(0)
  })

  it('expired period, observed >= target => ACHIEVED', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: '2026-09-15T12:00:00.000Z',
      goal: baseGoal,
      observed: { value: 100, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('ACHIEVED')
    expect(trajectory.remainingGap).toBe(0)
    expect(trajectory.paceRequired).toBe(0)
  })

  it('expired below target => MISSED', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: '2026-09-15T12:00:00.000Z',
      goal: baseGoal,
      observed: { value: 80, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('MISSED')
    expect(trajectory.remainingGap).toBe(20)
    expect(trajectory.paceRequired).toBeNull()
  })

  it('active below target but progressRatio >= elapsedRatio => ON_TRACK', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: ACTIVE_NOW,
      goal: baseGoal,
      observed: { value: 60, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('ON_TRACK')
    expect(trajectory.elapsedRatio).toBeCloseTo(5 / 11, 6)
    expect(trajectory.progressRatio).toBeCloseTo(0.6, 6)
    expect(trajectory.remainingGap).toBe(40)
    expect(trajectory.paceRequired).toBeCloseTo(40 / 6, 6)
  })

  it('active below target and progressRatio < elapsedRatio => OFF_TRACK', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: ACTIVE_NOW,
      goal: baseGoal,
      observed: { value: 20, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('OFF_TRACK')
    expect(trajectory.elapsedRatio).toBeCloseTo(5 / 11, 6)
    expect(trajectory.progressRatio).toBeCloseTo(0.2, 6)
  })

  it('source failure => UNAVAILABLE', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: NOW,
      goal: baseGoal,
      observed: { value: null, availability: 'UNAVAILABLE', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('UNAVAILABLE')
    expect(trajectory.availability).toBe('UNAVAILABLE')
    expect(trajectory.observedValue).toBeNull()
  })

  it('missing observation stays distinct from zero', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: NOW,
      goal: baseGoal,
      observed: { value: null, availability: 'NO_DATA', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.state).toBe('INSUFFICIENT_DATA')
    expect(trajectory.observedValue).toBeNull()
    expect(trajectory.observedValue).not.toBe(0)
  })

  it('real zero remains zero', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: NOW,
      goal: baseGoal,
      observed: { value: 0, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.observedValue).toBe(0)
    expect(trajectory.observedAvailability).toBe('REAL')
  })

  it('trajectory exposes the arithmetic fields', () => {
    const trajectory = evaluateGoalTrajectory({
      nowIso: ACTIVE_NOW,
      goal: baseGoal,
      observed: { value: 60, availability: 'REAL', freshness: 'SYNCED', source: 'analytics_events' },
    })

    expect(trajectory.remainingGap).toBe(40)
    expect(trajectory.paceRequired).toBeCloseTo(6.666666, 4)
    expect(trajectory.goalPeriod.sinceIso).toBe('2026-08-01T00:00:00.000Z')
    expect(trajectory.goalPeriod.untilIso).toBe('2026-08-12T00:00:00.000Z')
    expect(trajectory.observedPeriod.sinceIso).toBe('2026-08-01T00:00:00.000Z')
    expect(trajectory.observedPeriod.untilIso).toBe('2026-08-06T00:00:00.000Z')
  })

  it('supported metrics stay limited to the frozen Citadelle set', () => {
    expect(SUPPORTED_GOAL_METRICS).toEqual(['visits', 'signups', 'podcastStarts', 'progressions'])
    expect(GOAL_TRAJECTORY_STATES).not.toContain('AT_RISK')
  })
})
