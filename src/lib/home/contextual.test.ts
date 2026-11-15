import { describe,expect,it } from 'vitest'
import { CMS_LIVE_MAX_DURATION_MS,INTENTS,isCmsLiveActive,resolveFirstStep,resolveLiveState,resolveHeroGreeting,selectTodayPrimary } from '@/lib/home/contextual'
describe('contextual home',()=>{it('resolves live states',()=>{const n=new Date('2026-09-05T10:00:00Z');expect(resolveLiveState([{title:'Culte',status:'live',is_live:true,youtube_url:'https://youtu.be/abcdefghijk',started_at:'2026-09-05T09:30:00Z'}],n)).toMatchObject({status:'LIVE',youtubeVideoId:'abcdefghijk'});expect(resolveLiveState([{status:'scheduled',scheduled_at:'2026-09-06T10:00:00Z'}],n).status).toBe('UPCOMING');expect(resolveLiveState([],n)).toEqual({status:'OFFLINE'})});it('keeps four intents and safe steps',()=>{expect(INTENTS).toHaveLength(4);expect(resolveFirstStep({intent:'need_prayer',authenticated:false}).href).toBe('/priere');expect(resolveFirstStep({intent:'resume_walk',authenticated:false}).href).toBe('/parcours')});it('reuses member next action',()=>{const a={kind:'formation' as const,label:'Continuer',ctaLabel:'Continuer' as const,reason:'Déjà commencé',href:'/member/dashboard/formations/x',priority:20};expect(resolveFirstStep({intent:'grow_in_faith',authenticated:true,memberNextAction:a}).cta).toBe('Continuer')})
  it('never keeps an old CMS live active indefinitely (fallback expiry)', () => {
    const now = new Date('2026-11-15T10:00:00Z')
    const stale = { title: 'Culte du 5 novembre', status: 'live', is_live: true, youtube_url: 'https://youtu.be/abcdefghijk', scheduled_at: '2026-11-05T09:00:00Z', created_at: '2026-11-04T18:00:00Z', updated_at: '2026-11-05T09:05:00Z' }
    expect(resolveLiveState([stale], now)).toEqual({ status: 'OFFLINE' })
    expect(isCmsLiveActive(stale, now)).toBe(false)
    expect(isCmsLiveActive(stale, new Date('2026-11-05T12:00:00Z'))).toBe(true)
    expect(isCmsLiveActive(stale, new Date(Date.parse('2026-11-05T09:05:00Z') + CMS_LIVE_MAX_DURATION_MS + 1))).toBe(false)
    const next = { title: 'Prochain culte', status: 'scheduled', scheduled_at: '2026-11-16T09:00:00Z', youtube_url: 'https://youtu.be/lmnopqrstuv' }
    expect(resolveLiveState([stale, next], now)).toMatchObject({ status: 'UPCOMING', youtubeVideoId: 'lmnopqrstuv', scheduledAt: '2026-11-16T09:00:00Z' })
  })
  it('keeps a recently activated CMS live and ignores rows without any timestamp', () => {
    const now = new Date('2026-11-15T10:00:00Z')
    expect(resolveLiveState([{ title: 'Culte', status: 'live', youtube_url: 'https://youtu.be/abcdefghijk', started_at: '2026-11-15T09:30:00Z' }], now)).toMatchObject({ status: 'LIVE', startedAt: '2026-11-15T09:30:00Z' })
    // Ligne ancienne mais réactivée par l'admin (is_live → updated_at frais) : active.
    expect(resolveLiveState([{ title: 'Culte', is_live: true, status: 'scheduled', youtube_url: 'https://youtu.be/abcdefghijk', scheduled_at: '2026-11-01T09:00:00Z', created_at: '2026-10-30T09:00:00Z', updated_at: '2026-11-15T09:55:00Z' }], now)).toMatchObject({ status: 'LIVE' })
    // Direct dont le scheduled_at est futur mais déjà passé en live : actif.
    expect(resolveLiveState([{ title: 'Culte', status: 'live', youtube_url: 'https://youtu.be/abcdefghijk', scheduled_at: '2026-11-15T10:30:00Z' }], now)).toMatchObject({ status: 'LIVE' })
    expect(resolveLiveState([{ title: 'Sans date', status: 'live', youtube_url: 'https://youtu.be/abcdefghijk' }], now)).toEqual({ status: 'OFFLINE' })
    // Un direct programmé dans le passé n'est jamais « prochain ».
    expect(resolveLiveState([{ title: 'Passé', status: 'scheduled', scheduled_at: '2026-11-05T09:00:00Z' }], now)).toEqual({ status: 'OFFLINE' })
  })
})
