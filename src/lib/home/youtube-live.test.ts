import {describe,expect,it,beforeEach,afterEach} from 'vitest'
import {__resetYouTubeLiveCache,detectYouTubeLive,detectYouTubeLiveDetailed,revalidationSeconds,classifyOwnedBroadcasts,classifyBroadcast,filterOwnedChannel,verifyYouTubeVideoLive,getYouTubeLiveDiagnostics,UPCOMING_GRACE_MS,ERROR_RETRY_SECONDS,VERIFY_TTL_SECONDS,fetchVideoDetails,YOUTUBE_REQUEST_TIMEOUT_MS} from './youtube-live'
import {resolveLiveState} from './contextual'
const original={key:process.env.YOUTUBE_API_KEY,channel:process.env.YOUTUBE_CHANNEL_ID,clientId:process.env.YOUTUBE_OAUTH_CLIENT_ID,clientSecret:process.env.YOUTUBE_OAUTH_CLIENT_SECRET,refreshToken:process.env.YOUTUBE_OAUTH_REFRESH_TOKEN}
const response=(items:unknown[])=>new Response(JSON.stringify({items,access_token:'access-test',expires_in:3600}),{status:200})
describe('youtube live adaptive quota',()=>{beforeEach(()=>{delete process.env.YOUTUBE_API_KEY;process.env.YOUTUBE_OAUTH_CLIENT_ID='test-client';process.env.YOUTUBE_OAUTH_CLIENT_SECRET='test-secret';process.env.YOUTUBE_OAUTH_REFRESH_TOKEN='test-refresh';process.env.YOUTUBE_CHANNEL_ID='UCtest';__resetYouTubeLiveCache()});afterEach(()=>{if(original.key===undefined)delete process.env.YOUTUBE_API_KEY;else process.env.YOUTUBE_API_KEY=original.key;if(original.channel===undefined)delete process.env.YOUTUBE_CHANNEL_ID;else process.env.YOUTUBE_CHANNEL_ID=original.channel;for(const [name,value] of [['YOUTUBE_OAUTH_CLIENT_ID',original.clientId],['YOUTUBE_OAUTH_CLIENT_SECRET',original.clientSecret],['YOUTUBE_OAUTH_REFRESH_TOKEN',original.refreshToken]] as const){if(value===undefined)delete process.env[name];else process.env[name]=value}})
it('classifies a ready public broadcast without a schedule as upcoming',()=>{expect(classifyOwnedBroadcasts([{id:'6oryN3PHHBQ',snippet:{title:'REVIENS À LA MAISON',publishedAt:'2026-01-01T00:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])).toMatchObject({status:'UPCOMING',youtubeVideoId:'6oryN3PHHBQ'})})
it('classifies an unlisted ready broadcast as upcoming',()=>{expect(classifyOwnedBroadcasts([{id:'unlisted12345',snippet:{title:'Privé',publishedAt:'2026-01-01T00:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'unlisted'}}])).toMatchObject({status:'UPCOMING'})})
it('excludes complete broadcasts and selects the ready broadcast',()=>{expect(classifyOwnedBroadcasts([{id:'ended1234567',snippet:{title:'Fini'},status:{lifeCycleStatus:'complete',privacyStatus:'public'}},{id:'ready123456',snippet:{title:'Prêt',publishedAt:'2026-01-01T00:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])).toMatchObject({status:'UPCOMING',youtubeVideoId:'ready123456'})})
it('classifies actual start without end as live and actual end as ended',()=>{expect(classifyOwnedBroadcasts([{id:'live1234567',snippet:{title:'Live'},status:{lifeCycleStatus:'ready',privacyStatus:'public'},liveStreamingDetails:{actualStartTime:'2026-01-01T00:00:00Z'}}])).toMatchObject({status:'LIVE'});expect(classifyOwnedBroadcasts([{id:'ended123456',snippet:{title:'Ended'},status:{lifeCycleStatus:'complete',privacyStatus:'public'},liveStreamingDetails:{actualEndTime:'2026-01-01T01:00:00Z'}}])).toBeNull()})
it('selects the nearest future scheduled upcoming broadcast',()=>{expect(classifyOwnedBroadcasts([{id:'later123456',snippet:{title:'Plus tard',scheduledStartTime:'2026-01-03T00:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}},{id:'soon123456',snippet:{title:'Bientôt',scheduledStartTime:'2026-01-02T00:00:00Z'},status:{lifeCycleStatus:'created',privacyStatus:'public'}}],new Date('2026-01-01T00:00:00Z'))).toMatchObject({youtubeVideoId:'soon123456'})})
it('prefers the newest relevant unscheduled ready broadcast over stale ready items',()=>{expect(classifyOwnedBroadcasts([{id:'stale123456',snippet:{title:'Ancien',publishedAt:'2025-12-01T00:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}},{id:'current12345',snippet:{title:'Actuel',publishedAt:'2026-01-01T00:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])).toMatchObject({youtubeVideoId:'current12345'})})
it('uses 60 sec for offline and cache suppresses repeated calls inside the window',async()=>{let calls=0;const fetchImpl=async(input:RequestInfo|URL)=>{if(!String(input).includes('oauth2.googleapis.com/token'))calls++;return response([])};const now=new Date('2026-01-01T00:00:00Z');await expect(detectYouTubeLive({now,fetchImpl})).resolves.toBeNull();await expect(detectYouTubeLive({now:new Date(now.getTime()+59_000),fetchImpl})).resolves.toBeNull();expect(calls).toBe(2);await expect(detectYouTubeLive({now:new Date(now.getTime()+60_001),fetchImpl})).resolves.toBeNull();expect(calls).toBe(4);expect(revalidationSeconds({status:'OFFLINE'},now)).toBe(60)})
it('increases upcoming frequency as the event approaches',()=>{const now=new Date('2026-01-01T00:00:00Z');expect(revalidationSeconds({status:'UPCOMING',title:'Later',watchUrl:'/live',scheduledAt:'2026-01-01T02:00:00Z'},now)).toBe(900);expect(revalidationSeconds({status:'UPCOMING',title:'Soon',watchUrl:'/live',scheduledAt:'2026-01-01T00:30:00Z'},now)).toBe(180);expect(revalidationSeconds({status:'UPCOMING',title:'Very soon',watchUrl:'/live',scheduledAt:'2026-01-01T00:10:00Z'},now)).toBe(30)})
it('uses liveBroadcasts.list as the primary source and detects live',async()=>{let requested='';const fetchImpl=async(input:RequestInfo|URL)=>{requested=String(input);return response([{id:'abc12345678',snippet:{title:'Culte'},status:{lifeCycleStatus:'live',privacyStatus:'public'},liveStreamingDetails:{actualStartTime:'2026-01-01T00:00:00Z'}}])};const state=await detectYouTubeLive({now:new Date('2026-01-01T00:01:00Z'),fetchImpl});expect(state?.status).toBe('LIVE');expect(requested).toContain('/liveBroadcasts?');expect(requested).toContain('broadcastStatus=active');expect(requested).not.toContain('mine=true');expect(requested).not.toContain('liveStreamingDetails');expect(requested).not.toContain('/search?');expect(revalidationSeconds(state!,new Date())).toBe(30)})
it('discovers a scheduled upcoming broadcast from liveBroadcasts.list',async()=>{const fetchImpl=async()=>response([{id:'upcoming12345',snippet:{title:'Demain',scheduledStartTime:'2026-01-01T05:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}]);const state=await detectYouTubeLive({now:new Date('2026-01-01T00:00:00Z'),fetchImpl});expect(state).toMatchObject({status:'UPCOMING',title:'Demain',scheduledAt:'2026-01-01T05:00:00Z'})})
it('detects upcoming and fails safely on API errors',async()=>{const state=await detectYouTubeLive({now:new Date('2026-01-01T00:00:00Z'),fetchImpl:async()=>response([{id:'abc12345678',snippet:{title:'Demain',scheduledStartTime:'2026-01-01T05:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])});expect(state?.status).toBe('UPCOMING');__resetYouTubeLiveCache();await expect(detectYouTubeLive({fetchImpl:async()=>new Response('',{status:503})})).resolves.toBeNull()})
it('rechecks owned broadcasts after the upcoming cache expires',async()=>{let calls=0;const fetchImpl=async()=>{calls++;return response([{id:'abc12345678',snippet:{title:'Demain',scheduledStartTime:'2026-01-01T05:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])};const now=new Date('2026-01-01T00:00:00Z');await expect(detectYouTubeLive({now,fetchImpl})).resolves.toMatchObject({status:'UPCOMING'});await expect(detectYouTubeLive({now:new Date(now.getTime()+15*60_000+1),fetchImpl})).resolves.toMatchObject({status:'UPCOMING'});expect(calls).toBe(5)})
it('rechecks a live owned broadcast at the 30 second cadence',async()=>{let calls=0;const authHeaders:string[]=[];const fetchImpl=async(input:RequestInfo|URL,init?:RequestInit)=>{if(!String(input).includes('oauth2.googleapis.com/token')){calls++;authHeaders.push(String((init?.headers as Record<string,string>|undefined)?.Authorization||''))};return response([{id:'abc12345678',snippet:{title:'Culte'},status:{lifeCycleStatus:'live',privacyStatus:'public'},liveStreamingDetails:{actualStartTime:'2026-01-01T00:00:00Z'}}])};const now=new Date('2026-01-01T00:00:00Z');await expect(detectYouTubeLive({now,fetchImpl})).resolves.toMatchObject({status:'LIVE'});await expect(detectYouTubeLive({now:new Date(now.getTime()+30_001),fetchImpl})).resolves.toMatchObject({status:'LIVE'});expect(calls).toBe(2);expect(authHeaders).toEqual(['Bearer access-test','Bearer access-test']);expect(revalidationSeconds({status:'LIVE',title:'Culte',watchUrl:'/live'},now)).toBe(30)})
it('does not classify ended videos as live',async()=>{const fetchImpl=async()=>response([{id:'ended1234567',snippet:{title:'Termine'},status:{lifeCycleStatus:'complete',privacyStatus:'public'}}]);await expect(detectYouTubeLive({now:new Date('2026-01-01T00:00:00Z'),fetchImpl})).resolves.toBeNull()})
it('does not expose OAuth credentials on YouTube API requests',async()=>{const requests:{url:string;authorization:string}[]=[];const fetchImpl=async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(!url.includes('oauth2.googleapis.com/token'))requests.push({url,authorization:String((init?.headers as Record<string,string>|undefined)?.Authorization||'')});return response([])};await detectYouTubeLive({fetchImpl});expect(requests.every(({url,authorization})=>!url.includes('test-secret')&&!url.includes('test-refresh')&&!authorization.includes('test-secret')&&!authorization.includes('test-refresh'))).toBe(true)})
it('leaves CMS as the safe fallback when YouTube is unavailable',async()=>{__resetYouTubeLiveCache();const detected=await detectYouTubeLive({fetchImpl:async()=>new Response('',{status:503})});expect(detected).toBeNull();expect(resolveLiveState([{status:'live',title:'Culte CMS',youtube_url:'https://youtu.be/abcdefghijk',started_at:new Date().toISOString()}])).toMatchObject({status:'LIVE',title:'Culte CMS'});expect(resolveLiveState([])).toEqual({status:'OFFLINE'})})
it('fails safely when OAuth configuration is incomplete',async()=>{process.env.YOUTUBE_API_KEY='legacy-test';delete process.env.YOUTUBE_OAUTH_REFRESH_TOKEN;__resetYouTubeLiveCache();await expect(detectYouTubeLive({fetchImpl:async()=>response([{id:{videoId:'abc12345678'},snippet:{title:'Culte',liveBroadcastContent:'live'}}])})).resolves.toBeNull();expect(resolveLiveState([])).toEqual({status:'OFFLINE'})})

  it('uses production-safe fresh polling windows around live transitions', () => {
    const now = new Date('2026-01-01T05:20:00Z')

    expect(revalidationSeconds({ status: 'OFFLINE' }, now)).toBe(60)

    expect(
      revalidationSeconds(
        {
          status: 'LIVE',
          title: 'Matinale',
          watchUrl: '/live',
        },
        now,
      ),
    ).toBe(30)

    expect(
      revalidationSeconds(
        {
          status: 'UPCOMING',
          title: 'Matinale',
          watchUrl: '/live',
          scheduledAt: '2026-01-01T05:30:00Z',
        },
        now,
      ),
    ).toBe(30)
  })

  it('does not add a second Next.js cache around YouTube liveBroadcasts', async () => {
    __resetYouTubeLiveCache()

    let youtubeInit: RequestInit | undefined

    const fetchImpl = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input)

      if (!url.includes('oauth2.googleapis.com/token')) {
        youtubeInit = init
      }

      return response([])
    }

    await detectYouTubeLive({
      now: new Date('2026-01-01T05:20:00Z'),
      fetchImpl,
    })

    expect(youtubeInit?.cache).toBe('no-store')
    expect(
      (youtubeInit as RequestInit & { next?: unknown } | undefined)?.next,
    ).toBeUndefined()
  })
  // ─── Correction YouTube Live V1 : statuts, erreurs, chaîne, sélection ───────────
  const byStatus = (payloads: Record<string, unknown[]>) => async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('oauth2.googleapis.com/token')) return response([])
    const status = new URL(url).searchParams.get('broadcastStatus') || ''
    return response(payloads[status] || [])
  }

  it('reads broadcast timing from snippet (liveBroadcasts resource) — LIVE, ENDED, UPCOMING', () => {
    const now = new Date('2026-11-15T10:00:00Z')
    expect(classifyBroadcast({ id: 'live1234567', snippet: { title: 'Culte', actualStartTime: '2026-11-15T09:30:00Z' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }, now)).toBe('LIVE')
    expect(classifyBroadcast({ id: 'ended123456', snippet: { title: 'Culte', actualStartTime: '2026-11-05T09:30:00Z', actualEndTime: '2026-11-05T11:30:00Z' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } }, now)).toBe('ENDED')
    expect(classifyBroadcast({ id: 'revoked1234', snippet: { title: 'Annulé' }, status: { lifeCycleStatus: 'revoked', privacyStatus: 'public' } }, now)).toBe('ENDED')
    expect(classifyBroadcast({ id: 'priv1234567', snippet: { title: 'Privé', scheduledStartTime: '2026-11-16T10:00:00Z' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'private' } }, now)).toBeNull()
    const state = classifyOwnedBroadcasts([{ id: 'next1234567', snippet: { title: 'Prochain culte', scheduledStartTime: '2026-11-16T10:00:00Z', thumbnails: { high: { url: 'https://i.ytimg.com/vi/next1234567/hqdefault_live.jpg' } } }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }], now)
    expect(state).toEqual({ status: 'UPCOMING', title: 'Prochain culte', youtubeVideoId: 'next1234567', watchUrl: '/live', thumbnail: 'https://i.ytimg.com/vi/next1234567/hqdefault_live.jpg', scheduledAt: '2026-11-16T10:00:00Z' })
  })

  it('never shows a scheduled broadcast that is more than the grace period late, but tolerates a small delay', () => {
    const now = new Date('2026-11-15T10:00:00Z')
    const stale = { id: 'stale123456', snippet: { title: 'Ancien programmé', scheduledStartTime: '2026-11-05T10:00:00Z' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }
    const late = { id: 'late1234567', snippet: { title: 'En retard', scheduledStartTime: new Date(now.getTime() - UPCOMING_GRACE_MS + 60_000).toISOString() }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }
    const future = { id: 'future12345', snippet: { title: 'Futur', scheduledStartTime: '2026-11-22T10:00:00Z' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }
    expect(classifyBroadcast(stale, now)).toBe('ENDED')
    expect(classifyOwnedBroadcasts([stale], now)).toBeNull()
    expect(classifyOwnedBroadcasts([stale, future], now)).toMatchObject({ youtubeVideoId: 'future12345' })
    expect(classifyOwnedBroadcasts([future, late], now)).toMatchObject({ youtubeVideoId: 'late1234567' })
  })

  it('always prefers a really active live over any upcoming broadcast', () => {
    const now = new Date('2026-11-15T10:00:00Z')
    expect(classifyOwnedBroadcasts([
      { id: 'soon1234567', snippet: { title: 'Bientôt', scheduledStartTime: '2026-11-15T10:05:00Z' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } },
      { id: 'live1234567', snippet: { title: 'Maintenant', actualStartTime: '2026-11-15T09:58:00Z' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } },
    ], now)).toMatchObject({ status: 'LIVE', youtubeVideoId: 'live1234567', startedAt: '2026-11-15T09:58:00Z' })
  })

  it('queries active then upcoming broadcasts with part=id,snippet,status and skips upcoming when live', async () => {
    const urls: string[] = []
    const track = (impl: (input: RequestInfo | URL) => Promise<Response>) => async (input: RequestInfo | URL) => { if (!String(input).includes('oauth2.googleapis.com/token')) urls.push(String(input)); return impl(input) }
    await detectYouTubeLive({ now: new Date('2026-11-15T10:00:00Z'), fetchImpl: track(byStatus({ active: [], upcoming: [] })) })
    expect(urls.map(u => new URL(u).searchParams.get('broadcastStatus'))).toEqual(['active', 'upcoming'])
    expect(urls.every(u => new URL(u).searchParams.get('part') === 'id,snippet,status' && new URL(u).searchParams.get('broadcastType') === 'all')).toBe(true)
    __resetYouTubeLiveCache(); urls.length = 0
    const live = [{ id: 'live1234567', snippet: { title: 'Culte', actualStartTime: '2026-11-15T09:58:00Z' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } }]
    await expect(detectYouTubeLive({ now: new Date('2026-11-15T10:00:00Z'), fetchImpl: track(byStatus({ active: live })) })).resolves.toMatchObject({ status: 'LIVE' })
    expect(urls).toHaveLength(1)
  })

  it('follows a broadcast through UPCOMING → LIVE → ENDED → OFFLINE across cache windows', async () => {
    let phase: 'upcoming' | 'live' | 'ended' = 'upcoming'
    const base = { id: 'culte123456', status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) return response([])
      const status = new URL(url).searchParams.get('broadcastStatus')
      if (phase === 'upcoming') return response(status === 'upcoming' ? [{ ...base, snippet: { title: 'Culte', scheduledStartTime: '2026-11-15T10:00:00Z' } }] : [])
      if (phase === 'live') return response(status === 'active' ? [{ ...base, status: { lifeCycleStatus: 'live', privacyStatus: 'public' }, snippet: { title: 'Culte', scheduledStartTime: '2026-11-15T10:00:00Z', actualStartTime: '2026-11-15T10:01:00Z' } }] : [])
      return response([])
    }
    const t0 = new Date('2026-11-15T09:50:00Z')
    await expect(detectYouTubeLive({ now: t0, fetchImpl })).resolves.toMatchObject({ status: 'UPCOMING', scheduledAt: '2026-11-15T10:00:00Z' })
    phase = 'live'
    await expect(detectYouTubeLive({ now: new Date(t0.getTime() + 31_000), fetchImpl })).resolves.toMatchObject({ status: 'LIVE', startedAt: '2026-11-15T10:01:00Z' })
    phase = 'ended'
    await expect(detectYouTubeLive({ now: new Date(t0.getTime() + 62_000), fetchImpl })).resolves.toBeNull()
    const detail = await detectYouTubeLiveDetailed({ now: new Date(t0.getTime() + 62_000 + 61_000), fetchImpl })
    expect(detail).toMatchObject({ state: null, error: null })
  })

  it('exposes non-sensitive error codes instead of silently returning null', async () => {
    const forbidden = async (input: RequestInfo | URL) => String(input).includes('oauth2.googleapis.com/token') ? response([]) : new Response('', { status: 403 })
    const now = new Date('2026-11-15T10:00:00Z')
    await expect(detectYouTubeLiveDetailed({ now, fetchImpl: forbidden })).resolves.toEqual({ state: null, error: 'youtube_live_403', fromCache: false })
    __resetYouTubeLiveCache()
    const invalidGrant = async (input: RequestInfo | URL) => String(input).includes('oauth2.googleapis.com/token') ? new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }) : response([])
    const detail = await detectYouTubeLiveDetailed({ now, fetchImpl: invalidGrant })
    expect(detail).toMatchObject({ state: null, error: 'youtube_oauth_invalid_grant' })
    expect(JSON.stringify(detail)).not.toContain('test-secret')
    expect(JSON.stringify(detail)).not.toContain('test-refresh')
    __resetYouTubeLiveCache()
    delete process.env.YOUTUBE_OAUTH_CLIENT_SECRET
    await expect(detectYouTubeLiveDetailed({ now, fetchImpl: async () => response([]) })).resolves.toMatchObject({ state: null, error: 'youtube_oauth_not_configured' })
  })

  it('backs off after an error instead of hammering OAuth, then retries', async () => {
    let calls = 0
    const failing = async () => { calls++; return new Response('', { status: 503 }) }
    const now = new Date('2026-11-15T10:00:00Z')
    await expect(detectYouTubeLiveDetailed({ now, fetchImpl: failing })).resolves.toMatchObject({ error: 'youtube_oauth_http_503', fromCache: false })
    await expect(detectYouTubeLiveDetailed({ now: new Date(now.getTime() + 1_000), fetchImpl: failing })).resolves.toMatchObject({ error: 'youtube_oauth_http_503', fromCache: true })
    expect(calls).toBe(1)
    await detectYouTubeLiveDetailed({ now: new Date(now.getTime() + ERROR_RETRY_SECONDS * 1000 + 1), fetchImpl: failing })
    expect(calls).toBe(2)
  })

  it('refuses broadcasts that belong to another channel than YOUTUBE_CHANNEL_ID', async () => {
    const other = [{ id: 'other123456', snippet: { title: 'Autre chaîne', channelId: 'UCother', actualStartTime: '2026-11-15T09:58:00Z' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } }]
    expect(() => filterOwnedChannel(other, 'UCtest')).toThrow('youtube_channel_mismatch')
    expect(filterOwnedChannel([{ ...other[0], snippet: { ...other[0].snippet, channelId: 'UCtest' } }], 'UCtest')).toHaveLength(1)
    expect(filterOwnedChannel(other, '')).toHaveLength(1)
    await expect(detectYouTubeLiveDetailed({ now: new Date('2026-11-15T10:00:00Z'), fetchImpl: byStatus({ active: other }) })).resolves.toMatchObject({ state: null, error: 'youtube_channel_mismatch' })
  })

  it('does not require YOUTUBE_CHANNEL_ID to detect the owner live (OAuth is the source of truth)', async () => {
    delete process.env.YOUTUBE_CHANNEL_ID
    const live = [{ id: 'live1234567', snippet: { title: 'Culte', actualStartTime: '2026-11-15T09:58:00Z' }, status: { lifeCycleStatus: 'live', privacyStatus: 'public' } }]
    await expect(detectYouTubeLive({ now: new Date('2026-11-15T10:00:00Z'), fetchImpl: byStatus({ active: live }) })).resolves.toMatchObject({ status: 'LIVE', youtubeVideoId: 'live1234567' })
  })

  it('verifies a single video through videos.list: LIVE, UPCOMING, ENDED, NOT_LIVE, UNKNOWN', async () => {
    const now = new Date('2026-11-15T10:00:00Z')
    const videos = (item: unknown | null) => async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) return response([])
      expect(url).toContain('/videos?')
      expect(new URL(url).searchParams.get('part')).toBe('snippet,liveStreamingDetails')
      return response(item ? [item] : [])
    }
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl: videos({ snippet: { liveBroadcastContent: 'live' }, liveStreamingDetails: { actualStartTime: '2026-11-15T09:00:00Z' } }) })).resolves.toBe('LIVE')
    __resetYouTubeLiveCache()
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl: videos({ snippet: { liveBroadcastContent: 'upcoming' } }) })).resolves.toBe('UPCOMING')
    __resetYouTubeLiveCache()
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl: videos({ snippet: { liveBroadcastContent: 'none' }, liveStreamingDetails: { actualStartTime: '2026-11-05T09:00:00Z', actualEndTime: '2026-11-05T11:00:00Z' } }) })).resolves.toBe('ENDED')
    __resetYouTubeLiveCache()
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl: videos({ snippet: { liveBroadcastContent: 'none' } }) })).resolves.toBe('NOT_LIVE')
    __resetYouTubeLiveCache()
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl: videos(null) })).resolves.toBe('NOT_LIVE')
    __resetYouTubeLiveCache()
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl: async () => new Response('', { status: 403 }) })).resolves.toBe('UNKNOWN')
    await expect(verifyYouTubeVideoLive('not a video id', { now, fetchImpl: videos(null) })).resolves.toBe('UNKNOWN')
  })

  it('caches video verification per id for a short window', async () => {
    let calls = 0
    const fetchImpl = async (input: RequestInfo | URL) => { if (!String(input).includes('oauth2.googleapis.com/token')) calls++; return response([{ snippet: { liveBroadcastContent: 'none' }, liveStreamingDetails: { actualEndTime: '2026-11-05T11:00:00Z' } }]) }
    const now = new Date('2026-11-15T10:00:00Z')
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl })).resolves.toBe('ENDED')
    await expect(verifyYouTubeVideoLive('abcdefghijk', { now: new Date(now.getTime() + 1_000), fetchImpl })).resolves.toBe('ENDED')
    expect(calls).toBe(1)
    await verifyYouTubeVideoLive('abcdefghijk', { now: new Date(now.getTime() + VERIFY_TTL_SECONDS * 1000 + 1), fetchImpl })
    expect(calls).toBe(2)
  })

  it('exposes non-sensitive diagnostics only (booleans, codes, timestamps)', async () => {
    const now = new Date('2026-11-15T10:00:00Z')
    expect(getYouTubeLiveDiagnostics()).toEqual({ oauthConfigured: true, channelIdConfigured: true, lastError: null, lastCheckedAt: null, cachedStatus: null, cacheExpiresAt: null })
    await detectYouTubeLiveDetailed({ now, fetchImpl: async () => new Response('', { status: 503 }) })
    const diag = getYouTubeLiveDiagnostics()
    expect(diag).toMatchObject({ lastError: 'youtube_oauth_http_503', lastCheckedAt: '2026-11-15T10:00:00.000Z', cachedStatus: 'OFFLINE' })
    const serialized = JSON.stringify(diag)
    for (const secret of ['test-secret', 'test-refresh', 'test-client']) expect(serialized).not.toContain(secret)
    delete process.env.YOUTUBE_OAUTH_REFRESH_TOKEN
    expect(getYouTubeLiveDiagnostics().oauthConfigured).toBe(false)
  })

  it('bounds every YouTube API call with a 15 s abort signal', async () => {
    const signals: Array<AbortSignal | undefined> = []
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).includes('oauth2.googleapis.com/token')) signals.push(init?.signal ?? undefined)
      return response([])
    }
    const now = new Date('2026-11-15T10:00:00Z')
    await detectYouTubeLiveDetailed({ now, fetchImpl })
    await fetchVideoDetails(['abcdefghijk'], { now, fetchImpl })
    await verifyYouTubeVideoLive('abcdefghijk', { now, fetchImpl })
    expect(signals).toHaveLength(4)
    expect(signals.every(sig => sig instanceof AbortSignal)).toBe(true)
    expect(YOUTUBE_REQUEST_TIMEOUT_MS).toBe(15_000)
  })

  it('reports a timed-out YouTube call as youtube_timeout', async () => {
    const fetchImpl = async (input: RequestInfo | URL) => {
      if (String(input).includes('oauth2.googleapis.com/token')) return response([])
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    }
    await expect(detectYouTubeLiveDetailed({ now: new Date('2026-11-15T10:00:00Z'), fetchImpl })).resolves.toMatchObject({ state: null, error: 'youtube_timeout' })
  })
})
