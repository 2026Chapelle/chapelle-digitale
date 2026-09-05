export type MemberNextAction = {
  kind: 'integration' | 'formation' | 'fallback'
  label: string
  ctaLabel: 'Commencer' | 'Continuer' | 'Voir mon parcours'
  reason: string
  href: string
  priority: number
  progress?: number
  sourceTimestamp?: string | null
}

type IntegrationStep = {
  slug: string
  titre: string
  pct: number
  complete: boolean
  locked: boolean
}

type IntegrationProgress = {
  parcours: IntegrationStep[]
  current_slug: string | null
  integration_complete: boolean
}

type FormationEnrollment = {
  formation_id: string
  progression: number
  statut: string
  dernier_acces: string | null
  formation: { titre: string; slug: string } | null
}

type EligibleFormation = FormationEnrollment & { progress: number }

export type MemberNextActionInput = {
  integration: IntegrationProgress | null
  formations: FormationEnrollment[]
}

const fallback = (): MemberNextAction => ({
  kind: 'fallback',
  label: 'Voir mon parcours',
  ctaLabel: 'Voir mon parcours',
  reason: 'Retrouve les étapes disponibles de ton parcours.',
  href: '/member/dashboard/parcours',
  priority: 999,
})

const validProgress = (value: number): number | undefined =>
  Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined

const timestamp = (value: string | null): number => {
  const parsed = value ? Date.parse(value) : Number.NEGATIVE_INFINITY
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

export function resolveMemberNextAction({ integration, formations }: MemberNextActionInput): MemberNextAction {
  const currentIntegration = integration?.current_slug
    ? integration.parcours.find((step) => step.slug === integration.current_slug)
    : null

  if (currentIntegration && !integration?.integration_complete && !currentIntegration.complete && !currentIntegration.locked) {
    const progress = validProgress(currentIntegration.pct)
    return {
      kind: 'integration',
      label: `${progress && progress > 0 ? 'Continuer' : 'Commencer'} ${currentIntegration.titre}`,
      ctaLabel: progress && progress > 0 ? 'Continuer' : 'Commencer',
      reason: 'Cette étape est la prochaine étape disponible de ton parcours d’intégration.',
      href: `/member/dashboard/formations/${currentIntegration.slug}`,
      priority: 10,
      ...(progress && progress > 0 ? { progress } : {}),
    }
  }

  const eligible = formations
    .filter((item) => item.formation?.slug && item.statut === 'actif')
    .map((item) => ({ ...item, progress: validProgress(Number(item.progression)) }))
    .filter((item): item is EligibleFormation => item.progress !== undefined && item.progress < 100)
    .sort((a, b) => {
      const started = Number(b.progress > 0) - Number(a.progress > 0)
      if (started) return started
      const recent = timestamp(b.dernier_acces) - timestamp(a.dernier_acces)
      if (recent) return recent
      const progress = b.progress - a.progress
      if (progress) return progress
      return a.formation_id.localeCompare(b.formation_id)
    })

  const selected = eligible[0]
  if (!selected?.formation || selected.progress === undefined) return fallback()

  const isStarted = selected.progress > 0
  return {
    kind: 'formation',
    label: `${isStarted ? 'Continuer' : 'Commencer'} ${selected.formation.titre}`,
    ctaLabel: isStarted ? 'Continuer' : 'Commencer',
    reason: isStarted
      ? `Tu as déjà complété ${selected.progress} % de cette formation.`
      : 'Cette formation est disponible dans ton espace.',
    href: `/member/dashboard/formations/${selected.formation.slug}`,
    priority: 20,
    ...(isStarted ? { progress: selected.progress } : {}),
    sourceTimestamp: selected.dernier_acces,
  }
}
