import type { MemberNextAction } from '@/lib/member-home/next-action'

export function resolveHeroGreeting(input: { authenticated: boolean; firstName?: string }) {
  const firstName = input.firstName?.trim()
  return input.authenticated && firstName
    ? { title: `Bonjour ${firstName}.`, subtitle: 'Ton prochain pas peut commencer ici.' }
    : { title: 'N’avance plus seul dans ta foi.', subtitle: 'Ton prochain pas peut commencer ici.' }
}

export type TodayPrimaryCandidate = { kind: 'visitor' | 'salvation' | 'integration'; title: string; description?: string; image?: string; href: string }
export function selectTodayPrimary(candidates: TodayPrimaryCandidate[]) {
  return candidates.find(c => c.kind === 'visitor') || candidates.find(c => c.kind === 'salvation') || candidates.find(c => c.kind === 'integration')
}

export type LiveState = { status: 'LIVE'; title: string; youtubeVideoId?: string; watchUrl: string; thumbnail?: string; startedAt?: string } | { status: 'UPCOMING'; title: string; youtubeVideoId?: string; watchUrl?: string; thumbnail?: string; scheduledAt?: string } | { status: 'OFFLINE' }
export type CmsLiveLike = { title?: unknown; status?: unknown; is_live?: unknown; youtube_url?: unknown; video_url?: unknown; cover_url?: unknown; scheduled_at?: unknown; started_at?: unknown; created_at?: unknown; updated_at?: unknown }
export type HomeIntent = 'closer_to_god' | 'grow_in_faith' | 'need_prayer' | 'resume_walk'
export type FirstStep = { type: 'prayer' | 'podcast' | 'formation' | 'parcours' | 'live'; title: string; reason: string; href: string; cta: string }
const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : undefined
const yt = (v: unknown) => typeof v === 'string' ? (v.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(v) ? v : undefined)) : undefined
/**
 * Politique d'expiration du fallback CMS.
 * 1. Lorsque YouTube est joignable, l'état réel YouTube prime (direct terminé ⇒ la ligne CMS
 *    « live » est écartée, cf. canonical-server).
 * 2. Sinon, borne de sécurité : une ligne `live`/`is_live` n'est active que si son repère le plus
 *    récent (started_at, scheduled_at, updated_at, created_at) a moins de `maxLiveDurationMs`
 *    (défaut 8 h, ajustable côté serveur via LIVE_CMS_MAX_HOURS). Un direct exceptionnel plus long
 *    reste visible tant que YouTube le confirme, ou si l'admin ré-enregistre la fiche (updated_at).
 * 3. Sans aucun repère exploitable, la ligne n'est jamais considérée active.
 */
export const CMS_LIVE_MAX_DURATION_MS = 8 * 60 * 60_000
export type LiveResolveOptions = { maxLiveDurationMs?: number }
const ts = (v: unknown) => { const s = str(v); const t = s ? Date.parse(s) : NaN; return Number.isFinite(t) ? t : undefined }
export const youtubeVideoIdFrom = (v: unknown) => yt(v)
export function isCmsLiveActive(row: CmsLiveLike, now = new Date(), options: LiveResolveOptions = {}): boolean {
  if (!(row.status === 'live' || row.is_live === true)) return false
  const marks = [row.started_at, row.scheduled_at, row.updated_at, row.created_at].map(ts).filter((t): t is number => t !== undefined)
  if (!marks.length) return false
  return now.getTime() - Math.max(...marks) <= (options.maxLiveDurationMs ?? CMS_LIVE_MAX_DURATION_MS)
}
export function resolveLiveState(rows: CmsLiveLike[] | null | undefined, now = new Date(), options: LiveResolveOptions = {}): LiveState {
  const live = (rows || []).find(r => isCmsLiveActive(r, now, options))
  const source = live && (str(live.youtube_url) || str(live.video_url))
  if (live && source) return { status: 'LIVE', title: str(live.title) || 'Direct de la Chapelle', youtubeVideoId: yt(live.youtube_url), watchUrl: '/live', thumbnail: str(live.cover_url), startedAt: str(live.started_at) }
  const next = (rows || []).filter(r => r.status === 'scheduled' && str(r.scheduled_at)).map(r => ({ r, t: Date.parse(String(r.scheduled_at)) })).filter(x => Number.isFinite(x.t) && x.t >= now.getTime()).sort((a, b) => a.t - b.t)[0]
  if (next) return { status: 'UPCOMING', title: str(next.r.title) || 'Prochain direct', youtubeVideoId: yt(next.r.youtube_url), watchUrl: (str(next.r.youtube_url) || str(next.r.video_url)) ? '/live' : undefined, thumbnail: str(next.r.cover_url), scheduledAt: String(next.r.scheduled_at) }
  return { status: 'OFFLINE' }
}
export function resolveFirstStep(input: { intent: HomeIntent; authenticated: boolean; memberNextAction?: MemberNextAction | null; liveState?: LiveState }): FirstStep {
  const { intent, authenticated, memberNextAction, liveState } = input
  if (authenticated && memberNextAction && intent !== 'need_prayer') return { type: memberNextAction.kind === 'formation' ? 'formation' : 'parcours', title: memberNextAction.label, reason: memberNextAction.reason, href: memberNextAction.href, cta: memberNextAction.ctaLabel }
  if (intent === 'need_prayer') return { type: 'prayer', title: 'Déposer une demande de prière', reason: 'Tu peux déposer ce que tu portes et être rejoint dans la prière.', href: '/priere', cta: 'Demander une prière' }
  if (intent === 'closer_to_god') return { type: 'podcast', title: 'Prendre un temps avec Dieu', reason: 'Écoute une parole pour respirer, méditer et te rapprocher de Dieu.', href: '/podcast', cta: 'Écouter un podcast' }
  if (intent === 'resume_walk') return { type: 'parcours', title: 'Reprendre mon parcours', reason: 'Le parcours d’intégration t’aide à reprendre un pas clair, sans pression.', href: '/parcours', cta: 'Reprendre mon parcours' }
  if (liveState?.status === 'LIVE') return { type: 'live', title: liveState.title, reason: 'Le direct est en cours maintenant.', href: '/live', cta: 'Regarder le direct' }
  return { type: 'formation', title: 'Grandir dans ma foi', reason: 'Découvre un enseignement pour avancer à ton rythme.', href: '/formations', cta: 'Découvrir les formations' }
}
/**
 * Destination d'une carte « De quoi as-tu besoin aujourd'hui ? ».
 * Même source de vérité que l'encadré « premier pas » (resolveFirstStep) :
 * visiteur → /podcast, /formations (ou /live si direct), /priere, /parcours ;
 * membre → sa prochaine action, sauf la prière toujours vers /priere.
 */
export function resolveIntentHref(intent: HomeIntent, ctx: { authenticated: boolean; memberNextAction?: MemberNextAction | null; liveState?: LiveState }): string {
  return resolveFirstStep({ intent, ...ctx }).href
}
export const INTENTS = [{ id: 'closer_to_god', title: 'Me rapprocher de Dieu', description: 'Un moment pour respirer et prier.' }, { id: 'grow_in_faith', title: 'Grandir dans ma foi', description: 'Un enseignement, un pas à la fois.' }, { id: 'need_prayer', title: 'J’ai besoin de prière', description: 'Déposer ce que tu portes.' }, { id: 'resume_walk', title: 'Reprendre ma marche avec Dieu', description: 'Retrouver un chemin simple.' }] as const
