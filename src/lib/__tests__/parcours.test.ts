import { describe, it, expect } from 'vitest'
import {
  PARCOURS_INTEGRATION, PARCOURS_ACADEMIE, PARCOURS_MAHANAIM,
  getProgramme, listProgrammes, programmesByPlateforme,
} from '@/lib/parcours/registry'
import { flattenSteps, totalSteps, totalXp } from '@/lib/parcours/types'
import {
  startProgramme, stepStatus, computeStatuses, markStepComplete, setQuizScore,
  programmeProgressPct, isLevelValidated, certificateEligible, currentStepId,
  daysSinceStart, currentRangLabel, isProgrammeCompleted,
} from '@/lib/parcours/progress'

const day = (n: number) => new Date(2026, 0, 1 + n, 12, 0, 0)
const START = day(0)

describe('structure des parcours', () => {
  it('Intégration = 7 étapes (7 jours)', () => {
    expect(totalSteps(PARCOURS_INTEGRATION)).toBe(7)
  })
  it('Académie = 6 niveaux × 20 modules = 120', () => {
    expect(PARCOURS_ACADEMIE.niveaux).toHaveLength(6)
    expect(totalSteps(PARCOURS_ACADEMIE)).toBe(120)
  })
  it('Mahanaïm = 5 rangs', () => {
    expect(PARCOURS_MAHANAIM.niveaux).toHaveLength(5)
    expect(PARCOURS_MAHANAIM.rangs).toEqual(['Intercesseur', 'Veilleur', 'Sentinelle', 'Capitaine', 'Stratège'])
  })
  it('registre : lookup et filtres', () => {
    expect(getProgramme('integration')?.slug).toBe('integration')
    expect(getProgramme('inconnu')).toBeNull()
    expect(listProgrammes({ type: 'academie' })).toHaveLength(1)
    expect(programmesByPlateforme('cfic').length).toBeGreaterThanOrEqual(2)
    // Mahanaïm est autonome (hors CFIC)
    expect(programmesByPlateforme('mahanaim').map((p) => p.slug)).toContain('mahanaim')
  })
})

describe('déblocage temporel (Jour 1 → Jour 7)', () => {
  it('au Jour 0, seul le Jour 1 est accessible', () => {
    const p = startProgramme('integration', START)
    const st = computeStatuses(PARCOURS_INTEGRATION, p, START)
    const steps = flattenSteps(PARCOURS_INTEGRATION)
    expect(st[steps[0].id]).toBe('available')
    expect(st[steps[1].id]).toBe('locked') // J2 verrouillé tant que < 1 jour
  })

  it('le Jour 2 reste verrouillé tant que le Jour 1 n’est pas complété, même après 1 jour', () => {
    const p = startProgramme('integration', START)
    const steps = flattenSteps(PARCOURS_INTEGRATION)
    // 1 jour plus tard mais J1 pas complété → J2 verrouillé (séquentiel + temps)
    expect(stepStatus(PARCOURS_INTEGRATION, p, steps[1].id, day(1))).toBe('locked')
  })

  it('le Jour 2 se débloque quand J1 est complété ET 1 jour écoulé', () => {
    let p = startProgramme('integration', START)
    const steps = flattenSteps(PARCOURS_INTEGRATION)
    p = markStepComplete(p, steps[0].id, START)
    // même complété, J2 verrouillé au Jour 0 (time-gate non atteint)
    expect(stepStatus(PARCOURS_INTEGRATION, p, steps[1].id, START)).toBe('locked')
    // au Jour 1, débloqué
    expect(stepStatus(PARCOURS_INTEGRATION, p, steps[1].id, day(1))).toBe('available')
  })

  it('daysSinceStart calcule les jours entiers', () => {
    const p = startProgramme('integration', START)
    expect(daysSinceStart(p, START)).toBe(0)
    expect(daysSinceStart(p, day(3))).toBe(3)
  })
})

describe('progression & statut in_progress', () => {
  it('un quiz commencé met l’étape « in_progress »', () => {
    let p = startProgramme('integration', START)
    const first = flattenSteps(PARCOURS_INTEGRATION)[0].id
    p = setQuizScore(p, first, 50)
    expect(stepStatus(PARCOURS_INTEGRATION, p, first, START)).toBe('in_progress')
  })

  it('progression en % et étape courante', () => {
    let p = startProgramme('integration', START)
    const steps = flattenSteps(PARCOURS_INTEGRATION)
    expect(programmeProgressPct(PARCOURS_INTEGRATION, p)).toBe(0)
    p = markStepComplete(p, steps[0].id, START)
    expect(programmeProgressPct(PARCOURS_INTEGRATION, p)).toBe(Math.round((1 / 7) * 100))
    // étape courante = prochaine accessible (J2 au jour 1)
    expect(currentStepId(PARCOURS_INTEGRATION, p, day(1))).toBe(steps[1].id)
  })
})

describe('validation de niveau & certificat', () => {
  it('niveau non validé tant que toutes les étapes ne sont pas complétées', () => {
    const p = startProgramme('integration', START)
    expect(isLevelValidated(PARCOURS_INTEGRATION.niveaux[0], p)).toBe(false)
    expect(certificateEligible(PARCOURS_INTEGRATION, p)).toBe(false)
  })

  it('parcours complété → niveau validé → certificat éligible', () => {
    let p = startProgramme('integration', START)
    for (const s of flattenSteps(PARCOURS_INTEGRATION)) {
      // score quiz suffisant pour les étapes qui en ont un
      p = markStepComplete(p, s.id, day(s.ordre), 90)
    }
    expect(isProgrammeCompleted(PARCOURS_INTEGRATION, p)).toBe(true)
    expect(isLevelValidated(PARCOURS_INTEGRATION.niveaux[0], p)).toBe(true)
    expect(certificateEligible(PARCOURS_INTEGRATION, p)).toBe(true)
    expect(programmeProgressPct(PARCOURS_INTEGRATION, p)).toBe(100)
  })

  it('score moyen quiz insuffisant invalide le niveau', () => {
    let p = startProgramme('integration', START)
    for (const s of flattenSteps(PARCOURS_INTEGRATION)) {
      p = markStepComplete(p, s.id, day(s.ordre), 40) // < seuil 70
    }
    expect(isLevelValidated(PARCOURS_INTEGRATION.niveaux[0], p)).toBe(false)
  })
})

describe('rangs Mahanaïm', () => {
  it('rang courant = premier rang tant que rien n’est validé', () => {
    const p = startProgramme('mahanaim', START)
    expect(currentRangLabel(PARCOURS_MAHANAIM, p)).toBe('Intercesseur')
  })
})

describe('intégrité XP', () => {
  it('totalXp = somme des XP des étapes', () => {
    const sum = flattenSteps(PARCOURS_INTEGRATION).reduce((n, s) => n + s.xp, 0)
    expect(totalXp(PARCOURS_INTEGRATION)).toBe(sum)
  })
})
