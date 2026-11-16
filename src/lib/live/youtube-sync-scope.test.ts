import { describe, expect, it } from 'vitest'
import { planYouTubeSync, type CmsLiveSyncRow } from './youtube-sync'
import { attachProgramIds, classifyForScope, LOT1_SYNC_SCOPE, localSlot, missingScopePrograms, parseConfirmedVideoIds, scopeSyncInput, type LiveProgramRow, type SyncScope } from './youtube-sync-scope'

/** Programmes de référence (migration 20260819180000_live_programs_seed), fuseau Africa/Abidjan (UTC). */
const PROGRAMS: LiveProgramRow[] = [
  { id: 'prog-matinale', slug: 'matinale', title: 'Matinale', weekdays: [1, 3, 5], start_time: '05:30:00', timezone: 'Africa/Abidjan', youtube_playlist_id: 'PLmatinale0001', status: 'published', is_active: true },
  { id: 'prog-ecole', slug: 'ecole-du-royaume', title: 'École du Royaume', weekdays: [3], start_time: '19:30:00', timezone: 'Africa/Abidjan', youtube_playlist_id: null, status: 'published', is_active: true },
  { id: 'prog-vdp', slug: 'vendredi-de-puissance', title: 'Vendredi de puissance', weekdays: [5], start_time: '19:30:00', timezone: 'Africa/Abidjan', youtube_playlist_id: null, status: 'published', is_active: true },
  { id: 'prog-culte', slug: 'culte-de-celebration-royale', title: 'Culte de Célébration Royale', weekdays: [0], start_time: '10:30:00', timezone: 'Africa/Abidjan', youtube_playlist_id: 'PLculte000001', status: 'published', is_active: true },
]
const NOW = new Date('2026-11-22T23:00:00Z')
const done = (id: string, start: string, title: string) => ({ id, snippet: { title, actualStartTime: start, actualEndTime: start, scheduledStartTime: start, channelId: 'UCtest' }, status: { lifeCycleStatus: 'complete', privacyStatus: 'public' } })
const details = (id: string, start: string, title = 'YT ' + id) => ({ id, snippet: { title, liveBroadcastContent: 'none' }, status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: true }, contentDetails: { duration: 'PT2H' }, liveStreamingDetails: { scheduledStartTime: start, actualStartTime: start, actualEndTime: start } })
const classify = (item: ReturnType<typeof done>, playlists: Record<string, string[]> = {}, scope: SyncScope = LOT1_SYNC_SCOPE) => classifyForScope(item, PROGRAMS, scope, playlists)
const CONFIRMED = (ids: string[]): SyncScope => ({ ...LOT1_SYNC_SCOPE, confirmedVideoIds: ids })

/** État de production après le Lot 1 SQL : 12 replays, dont 2 URL précédées d'une tabulation, et un brouillon. */
const ROWS: CmsLiveSyncRow[] = [
  { id: 'r-15nov', title: 'DONNE-MOI CETTE MONTAGNE !', youtube_url: 'https://www.youtube.com/watch?v=UJ_ZLAYy5ms', status: 'published', scheduled_at: '2026-11-15T10:30:00Z', created_at: '2026-11-16T15:00:00Z' },
  { id: 'r-08nov', title: 'LE TEMPS EST VENU DE PRENDRE POSSESSION !', youtube_url: 'https://www.youtube.com/watch?v=WkRuVC7d3Mw', status: 'published', scheduled_at: '2026-11-08T10:30:00Z', created_at: '2026-11-16T15:00:00Z' },
  { id: 'r-01nov', title: 'SORS DE TA CACHETTE', youtube_url: 'https://www.youtube.com/watch?v=zzAWvuHLaDw', status: 'published', scheduled_at: '2026-11-01T10:30:00Z', created_at: '2026-11-03T05:59:47Z' },
  { id: 'r-reh', title: '\tREHOBOTH', youtube_url: '\thttps://youtube.com/live/92dcmB4lzqg', status: 'published', scheduled_at: '2026-10-18T10:51:08Z', created_at: '2026-11-03T07:26:04Z' },
  { id: 'r-heure', title: '\tTON HEURE EST ARRIVEE', youtube_url: '\thttps://youtube.com/live/XAlkdV8bpE0', status: 'published', scheduled_at: '2026-10-04T10:30:00Z', created_at: '2026-11-03T08:02:34Z' },
  { id: 'r-draft', title: 'Brouillon', youtube_url: 'https://youtu.be/DRAFTvideo1', status: 'draft', scheduled_at: '2026-11-22T10:30:00Z', created_at: '2026-11-22T13:00:00Z' },
]

describe('localSlot', () => {
  it('convertit dans le fuseau du programme (Africa/Abidjan = UTC, Europe/Paris = UTC+1)', () => {
    expect(localSlot('2026-11-22T10:42:00Z', 'Africa/Abidjan')).toEqual({ weekday: 0, minutes: 642 })
    expect(localSlot('2026-11-22T23:30:00Z', 'Europe/Paris')).toEqual({ weekday: 1, minutes: 30 })
    expect(localSlot('pas une date', 'Africa/Abidjan')).toBeNull()
    expect(localSlot('2026-11-22T10:42:00Z', 'Zone/Invalide')).toBeNull()
  })
})

describe('classifyForScope — Lot 1 : Culte de Célébration Royale uniquement', () => {
  it('1. nouveau culte dominical valide (démarrage réel 10:51) → admis, programme culte', () => {
    const d = classify(done('CULTE22NOVx', '2026-11-22T10:51:08Z', '🔥 UN TITRE SANS LE MOT'))
    expect(d).toMatchObject({ verdict: 'admitted', reason: 'schedule', program: 'culte-de-celebration-royale', programId: 'prog-culte' })
  })
  it('2. matinales du lundi, mercredi et vendredi → réservées au programme matinale (jamais importées)', () => {
    for (const [id, start] of [['MATINlun001', '2026-11-16T05:31:00Z'], ['MATINmer001', '2026-11-18T05:30:00Z'], ['MATINven001', '2026-11-20T05:33:00Z']]) {
      expect(classify(done(id, start, 'Matinale de prière'))).toMatchObject({ verdict: 'reserved', program: 'matinale', reason: 'other_program_schedule' })
    }
  })
  it('2b. une matinale dont le titre évoque un « culte » → revue, jamais importée (le titre seul ne suffit pas)', () => {
    expect(classify(done('MATINculte1', '2026-11-18T05:30:00Z', 'Culte de prière du matin'))).toMatchObject({ verdict: 'review', reason: 'title_contradicts_schedule' })
  })
  it('3. École du Royaume (mercredi 19:30) → réservée', () => {
    expect(classify(done('ECOLE000001', '2026-11-18T19:34:00Z', 'École du Royaume'))).toMatchObject({ verdict: 'reserved', program: 'ecole-du-royaume' })
  })
  it('4. Vendredi de puissance (vendredi 19:30) → réservé', () => {
    expect(classify(done('VDP00000001', '2026-11-20T19:40:00Z', 'Vendredi de puissance'))).toMatchObject({ verdict: 'reserved', program: 'vendredi-de-puissance' })
  })
  it('5. culte exceptionnel hors dimanche : en revue sans CONFIRMATION éditoriale explicite (la playlist seule ne suffit pas)', () => {
    const item = done('CULTEsam001', '2026-11-21T18:00:00Z', 'Culte spécial de Noël')
    expect(classify(item)).toMatchObject({ verdict: 'review', reason: 'title_suggests_target_off_schedule' })
    expect(classify(item, { 'culte-de-celebration-royale': ['CULTEsam001'] })).toMatchObject({ verdict: 'review', reason: 'playlist_off_schedule' })
    expect(classify(item, { 'culte-de-celebration-royale': ['CULTEsam001'] }, CONFIRMED(['CULTEsam001']))).toMatchObject({ verdict: 'admitted', reason: 'editorial_confirmation', programId: 'prog-culte' })
    expect(classify(item, {}, CONFIRMED(['CULTEsam001']))).toMatchObject({ verdict: 'admitted', reason: 'editorial_confirmation', programId: 'prog-culte' })
  })
  it('5b. une confirmation éditoriale ne peut pas faire entrer une vidéo du créneau d un autre programme', () => {
    expect(classify(done('MATINconf01', '2026-11-16T05:31:00Z', 'Prière du lundi'), {}, CONFIRMED(['MATINconf01']))).toMatchObject({ verdict: 'review', reason: 'confirmation_contradicts_schedule' })
    expect(classify(done('CONFmatin01', '2026-11-21T18:00:00Z', 'Matinale spéciale'), {}, CONFIRMED(['CONFmatin01']))).toMatchObject({ verdict: 'review', reason: 'confirmation_contradicts_title' })
  })
  it('NON-RÉGRESSION T-wX2cISBDU (N0C 16/11/2026) : prière du lundi 05:31 rangée dans la playlist du culte → revue, JAMAIS admise', () => {
    const twx = done('T-wX2cISBDU', '2026-11-16T05:31:00Z', "🔥 QUE RIEN NE T'ARRÊTE CETTE SEMAINE ! | Prière puissante du lundi")
    const culteplaylist = { 'culte-de-celebration-royale': ['UJ_ZLAYy5ms', 'T-wX2cISBDU', 'WkRuVC7d3Mw'] }
    expect(classify(twx, culteplaylist)).toMatchObject({ verdict: 'review', reason: 'playlist_contradicts_schedule', program: null, programId: null })
    // même confirmée, elle reste en revue (créneau de la matinale)
    expect(classify(twx, culteplaylist, CONFIRMED(['T-wX2cISBDU']))).toMatchObject({ verdict: 'review' })
    // sans playlist : réservée au programme matinale (Lot 2), toujours pas importée
    expect(classify(twx)).toMatchObject({ verdict: 'reserved', program: 'matinale', reason: 'other_program_schedule' })
    const scoped = scopeSyncInput({ active: [], upcoming: [], completed: [twx], rows: [], programs: PROGRAMS, playlistVideoIds: culteplaylist, scope: LOT1_SYNC_SCOPE })
    expect(scoped.completed).toEqual([])
  })
  it('priorités : créneau > playlist > titre ; contradiction → revue', () => {
    const sunday = '2026-11-22T10:44:00Z'
    expect(classify(done('PRIO0000001', sunday, 'x'), { 'culte-de-celebration-royale': ['PRIO0000001'] })).toMatchObject({ verdict: 'admitted', reason: 'schedule_and_playlist' })
    expect(classify(done('PRIO0000002', sunday, 'x'), { matinale: ['PRIO0000002'] })).toMatchObject({ verdict: 'review', reason: 'playlist_contradicts_schedule' })
    expect(classify(done('PRIO0000003', '2026-11-18T05:31:00Z', 'x'), { matinale: ['PRIO0000003'] })).toMatchObject({ verdict: 'reserved', program: 'matinale' })
    expect(classify(done('PRIO0000004', '2026-11-19T14:00:00Z', 'x'), { matinale: ['PRIO0000004'] })).toMatchObject({ verdict: 'reserved', reason: 'other_program_playlist', program: 'matinale' })
    expect(classify(done('PRIO0000005', '2026-11-19T14:00:00Z', 'x'), { 'culte-de-celebration-royale': ['PRIO0000005'] })).toMatchObject({ verdict: 'review', reason: 'playlist_off_schedule' })
  })
  it('parseConfirmedVideoIds : identifiants YouTube valides uniquement, sans doublon', () => {
    expect(parseConfirmedVideoIds(' CULTEsam001, bad ,CULTEsam001;T-wX2cISBDU ')).toEqual(['CULTEsam001', 'T-wX2cISBDU'])
    expect(parseConfirmedVideoIds(undefined)).toEqual([])
  })
  it('6. vidéos ambiguës → revue, jamais importées', () => {
    expect(classify(done('AMBIGU00001', '2026-11-22T10:35:00Z', 'Matinale exceptionnelle'))).toMatchObject({ verdict: 'review', reason: 'title_contradicts_schedule' })
    expect(classify({ id: 'SANSDATE001', snippet: { title: 'Culte' }, status: { privacyStatus: 'public' } } as never)).toMatchObject({ verdict: 'review', reason: 'no_start_time' })
    expect(classify(done('DOUBLEPL001', '2026-11-22T10:30:00Z', 'x'), { 'culte-de-celebration-royale': ['DOUBLEPL001'], matinale: ['DOUBLEPL001'] })).toMatchObject({ verdict: 'review', reason: 'several_programs' })
    const overlapping = [...PROGRAMS, { id: 'prog-x', slug: 'special-dimanche', title: 'Spécial', weekdays: [0], start_time: '11:00:00', timezone: 'Africa/Abidjan', status: 'published', is_active: true }]
    expect(classifyForScope(done('CHEVAUCH001', '2026-11-22T10:45:00Z', 'x'), overlapping, LOT1_SYNC_SCOPE)).toMatchObject({ verdict: 'review', reason: 'several_programs' })
  })
  it('hors de tout créneau et sans indice → hors programme (ignoré)', () => {
    expect(classify(done('HORS0000001', '2026-11-19T14:00:00Z', 'Annonce'))).toMatchObject({ verdict: 'out_of_scope', reason: 'no_program_match' })
  })
  it('12. programme cible absent, non publié ou inactif → détecté (la synchronisation refusera)', () => {
    expect(missingScopePrograms(PROGRAMS, LOT1_SYNC_SCOPE)).toEqual([])
    expect(missingScopePrograms(PROGRAMS.filter(p => p.slug !== 'culte-de-celebration-royale'), LOT1_SYNC_SCOPE)).toEqual(['culte-de-celebration-royale'])
    expect(missingScopePrograms(PROGRAMS.map(p => (p.slug === 'culte-de-celebration-royale' ? { ...p, status: 'draft' } : p)), LOT1_SYNC_SCOPE)).toEqual(['culte-de-celebration-royale'])
    expect(missingScopePrograms(PROGRAMS.map(p => (p.slug === 'culte-de-celebration-royale' ? { ...p, is_active: false } : p)), LOT1_SYNC_SCOPE)).toEqual(['culte-de-celebration-royale'])
  })
})

describe('scopeSyncInput + planYouTubeSync — plan réel sur l état de production', () => {
  // Situation constatée par la simulation N0C + nouveaux cas : 2 cultes déjà en base, 6 matinales, 1 nouveau culte.
  const COMPLETED = [
    done('UJ_ZLAYy5ms', '2026-11-15T10:42:10Z', '🔥 DONNE-MOI CETTE MONTAGNE !'),
    done('WkRuVC7d3Mw', '2026-11-08T10:47:31Z', '🔥 LE TEMPS EST VENU DE PRENDRE POSSESSION !'),
    done('92dcmB4lzqg', '2026-10-18T10:51:08Z', 'REHOBOTH'),
    done('XAlkdV8bpE0', '2026-10-04T10:40:00Z', 'TON HEURE'),
    done('DRAFTvideo1', '2026-11-22T10:30:00Z', 'Culte en brouillon'),
    done('CULTE22NOVx', '2026-11-22T10:44:00Z', '🔥 NOUVEAU MESSAGE'),
    ...['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-16', '2026-11-18', '2026-11-20'].map((d, i) => done(`MATIN0000${i}x`, `${d}T05:31:00Z`, 'Matinale de prière')),
    done('ECOLE000001', '2026-11-18T19:34:00Z', 'École du Royaume'),
    done('VDP00000001', '2026-11-20T19:40:00Z', 'Vendredi de puissance'),
  ]
  const run = (rows: CmsLiveSyncRow[], extra: { playlists?: Record<string, string[]>; programs?: LiveProgramRow[] } = {}) => {
    const scoped = scopeSyncInput({ active: [], upcoming: [], completed: COMPLETED, rows, programs: extra.programs ?? PROGRAMS, playlistVideoIds: extra.playlists, scope: LOT1_SYNC_SCOPE })
    const videos = scoped.completed.map(c => details(String(c.id), String(c.snippet?.actualStartTime)))
    const plan = planYouTubeSync({ active: scoped.active, upcoming: scoped.upcoming, completed: scoped.completed, videos, verifiedIds: videos.map(v => v.id), rows, now: NOW })
    return { scoped, plan, ops: attachProgramIds(plan.operations, scoped.decisions) }
  }

  it('n insère QUE le nouveau culte dominical, avec program_id ; 8 diffusions réservées, aucune en revue', () => {
    const { scoped, ops } = run(ROWS)
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'insert', videoId: 'CULTE22NOVx', lifecycle: 'replay_available', programId: 'prog-culte' })
    expect(scoped.decisions.filter(d => d.verdict === 'reserved').map(d => d.program).sort()).toEqual(['ecole-du-royaume', ...Array(6).fill('matinale'), 'vendredi-de-puissance'])
    expect(scoped.decisions.filter(d => d.verdict === 'review')).toEqual([])
  })
  it('7. vidéos déjà enregistrées (12 replays) → aucune opération ; jamais soumises au périmètre', () => {
    const { plan, scoped } = run(ROWS)
    const existing = ['UJ_ZLAYy5ms', 'WkRuVC7d3Mw', '92dcmB4lzqg', 'XAlkdV8bpE0']
    expect(plan.operations.some(o => existing.includes(o.videoId))).toBe(false)
    for (const id of existing) expect(plan.skipped.find(s => s.videoId === id)?.reason).toMatch(/^(already_replay|outside_window)$/)
    expect(plan.skipped).toEqual(expect.arrayContaining([{ videoId: 'UJ_ZLAYy5ms', reason: 'already_replay' }]))
    expect(scoped.decisions.some(d => existing.includes(d.videoId))).toBe(false)
  })
  it('8. replay existant dont l URL commence par une tabulation (diffusion récente) → reconnu, aucun doublon', () => {
    const rows: CmsLiveSyncRow[] = [...ROWS, { id: 'r-tab', title: '\tCULTE RECENT', youtube_url: '\thttps://youtube.com/live/TABrecent01', status: 'published', scheduled_at: '2026-11-22T10:30:00Z' }]
    const item = done('TABrecent01', '2026-11-22T10:40:00Z', 'Culte')
    const scoped = scopeSyncInput({ active: [], upcoming: [], completed: [item], rows, programs: PROGRAMS, scope: LOT1_SYNC_SCOPE })
    expect(scoped.decisions).toEqual([]) // reconnu comme fiche existante malgré la tabulation
    const plan = planYouTubeSync({ active: [], upcoming: [], completed: scoped.completed, videos: [details('TABrecent01', '2026-11-22T10:40:00Z')], rows, now: NOW })
    expect(plan.operations).toEqual([])
    expect(plan.skipped).toEqual([{ videoId: 'TABrecent01', reason: 'already_replay' }])
  })
  it('9. replay en brouillon → jamais réécrit ni dupliqué', () => {
    const { plan } = run(ROWS)
    expect(plan.operations.some(o => o.videoId === 'DRAFTvideo1')).toBe(false)
    expect(plan.skipped).toEqual(expect.arrayContaining([{ videoId: 'DRAFTvideo1', reason: 'draft_row' }]))
  })
  it('10. synchronisation répétée → idempotente (0 opération au 2e passage)', () => {
    const first = run(ROWS)
    const op = first.ops[0] as { kind: 'insert'; row: Record<string, unknown>; programId?: string }
    const after: CmsLiveSyncRow[] = [...ROWS, { id: 'r-new', ...(op.row as object), created_at: NOW.toISOString() } as CmsLiveSyncRow]
    const second = run(after)
    expect(second.plan.operations).toEqual([])
  })
  it('le « dernier culte » affiché reste un Culte de Célébration Royale (règle de /live : scheduled_at sinon created_at)', () => {
    const { ops } = run(ROWS)
    const inserted = ops.filter(o => o.kind === 'insert').map(o => ({ id: o.videoId, status: (o as { row: { status: string } }).row.status, key: (o as { row: { scheduled_at?: string } }).row.scheduled_at }))
    const visible = [...ROWS.filter(r => r.status === 'ended' || r.status === 'published').map(r => ({ id: r.id, key: r.scheduled_at || r.created_at })), ...inserted.filter(i => i.status === 'ended' || i.status === 'published')]
    const latest = visible.sort((a, b) => Date.parse(String(b.key)) - Date.parse(String(a.key)))[0]
    expect(latest.id).toBe('CULTE22NOVx')
    // Sans le périmètre (comportement d1492c2), une matinale ou le Vendredi de puissance du 20 nov. passerait devant le culte du 15 nov.
    const unscoped = planYouTubeSync({ active: [], upcoming: [], completed: COMPLETED, videos: COMPLETED.map(c => details(String(c.id), String(c.snippet?.actualStartTime))), rows: ROWS, now: NOW })
    expect(unscoped.operations.filter(o => o.kind === 'insert').length).toBe(9)
  })
  it('culte exceptionnel hors dimanche : importé uniquement sur confirmation éditoriale explicite', () => {
    const special = done('CULTEsam001', '2026-11-21T18:00:00Z', 'Culte spécial')
    const playlist = { 'culte-de-celebration-royale': ['CULTEsam001'] }
    expect(scopeSyncInput({ active: [], upcoming: [], completed: [special], rows: ROWS, programs: PROGRAMS, playlistVideoIds: playlist, scope: LOT1_SYNC_SCOPE }).completed).toEqual([])
    expect(scopeSyncInput({ active: [], upcoming: [], completed: [special], rows: ROWS, programs: PROGRAMS, playlistVideoIds: playlist, scope: CONFIRMED(['CULTEsam001']) }).completed).toHaveLength(1)
  })
  it('replay_pending existant : jamais reclassé (fiche existante), le planificateur garde la main ; aucune nouvelle fiche', () => {
    const rows: CmsLiveSyncRow[] = [...ROWS, { id: 'r-pending', title: 'Culte', youtube_url: 'https://www.youtube.com/watch?v=PENDING0001', status: 'replay_pending', scheduled_at: '2026-11-22T10:30:00Z' }]
    const item = done('PENDING0001', '2026-11-22T10:40:00Z', 'Culte')
    const scoped = scopeSyncInput({ active: [], upcoming: [], completed: [item], rows, programs: PROGRAMS, scope: LOT1_SYNC_SCOPE })
    expect(scoped.decisions).toEqual([])
    const plan = planYouTubeSync({ active: [], upcoming: [], completed: scoped.completed, videos: [details('PENDING0001', '2026-11-22T10:40:00Z')], rows, now: NOW })
    expect(plan.operations).toEqual([expect.objectContaining({ kind: 'update', id: 'r-pending', lifecycle: 'replay_available', patch: expect.objectContaining({ status: 'ended' }) })])
    expect(plan.operations.some(o => o.kind === 'insert')).toBe(false)
  })
  it('un direct ou une programmation hors périmètre (matinale) ne crée aucune fiche ; un culte programmé si', () => {
    const live = { id: 'MATINlive01', snippet: { title: 'Matinale', actualStartTime: '2026-11-23T05:31:00Z', channelId: 'UCtest' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } }
    const next = { id: 'CULTEnext01', snippet: { title: 'Culte', scheduledStartTime: '2026-11-29T10:30:00Z', channelId: 'UCtest' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }
    const scoped = scopeSyncInput({ active: [live], upcoming: [next], completed: [], rows: ROWS, programs: PROGRAMS, scope: LOT1_SYNC_SCOPE })
    expect(scoped.active).toEqual([])
    expect(scoped.upcoming).toEqual([next])
  })
  it('une fiche existante non culte (ex. matinale saisie à la main, en direct) garde son cycle de vie', () => {
    const rows: CmsLiveSyncRow[] = [{ id: 'manual-live', title: 'Matinale', youtube_url: 'https://youtu.be/MATINlive01', status: 'live', is_live: true, scheduled_at: '2026-11-23T05:30:00Z' }]
    const live = { id: 'MATINlive01', snippet: { title: 'Matinale', actualStartTime: '2026-11-23T05:31:00Z', channelId: 'UCtest' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } }
    const scoped = scopeSyncInput({ active: [live], upcoming: [], completed: [], rows, programs: PROGRAMS, scope: LOT1_SYNC_SCOPE })
    expect(scoped.active).toEqual([live])
    expect(scoped.decisions).toEqual([])
  })
})
