import {describe,expect,it,beforeEach,afterEach} from 'vitest'
import {__resetYouTubeLiveCache,detectYouTubeLive,revalidationSeconds,classifyOwnedBroadcasts} from './youtube-live'
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
it('uses 60 sec for offline and cache suppresses repeated calls inside the window',async()=>{let calls=0;const fetchImpl=async(input:RequestInfo|URL)=>{if(!String(input).includes('oauth2.googleapis.com/token'))calls++;return response([])};const now=new Date('2026-01-01T00:00:00Z');await expect(detectYouTubeLive({now,fetchImpl})).resolves.toBeNull();await expect(detectYouTubeLive({now:new Date(now.getTime()+59_000),fetchImpl})).resolves.toBeNull();expect(calls).toBe(1);await expect(detectYouTubeLive({now:new Date(now.getTime()+60_001),fetchImpl})).resolves.toBeNull();expect(calls).toBe(2);expect(revalidationSeconds({status:'OFFLINE'},now)).toBe(60)})
it('increases upcoming frequency as the event approaches',()=>{const now=new Date('2026-01-01T00:00:00Z');expect(revalidationSeconds({status:'UPCOMING',title:'Later',watchUrl:'/live',scheduledAt:'2026-01-01T02:00:00Z'},now)).toBe(900);expect(revalidationSeconds({status:'UPCOMING',title:'Soon',watchUrl:'/live',scheduledAt:'2026-01-01T00:30:00Z'},now)).toBe(180);expect(revalidationSeconds({status:'UPCOMING',title:'Very soon',watchUrl:'/live',scheduledAt:'2026-01-01T00:10:00Z'},now)).toBe(30)})
it('uses liveBroadcasts.list as the primary source and detects live',async()=>{let requested='';const fetchImpl=async(input:RequestInfo|URL)=>{requested=String(input);return response([{id:'abc12345678',snippet:{title:'Culte'},status:{lifeCycleStatus:'live',privacyStatus:'public'},liveStreamingDetails:{actualStartTime:'2026-01-01T00:00:00Z'}}])};const state=await detectYouTubeLive({now:new Date('2026-01-01T00:01:00Z'),fetchImpl});expect(state?.status).toBe('LIVE');expect(requested).toContain('/liveBroadcasts?');expect(requested).toContain('mine=true');expect(requested).not.toContain('/search?');expect(revalidationSeconds(state!,new Date())).toBe(30)})
it('discovers a scheduled upcoming broadcast from liveBroadcasts.list',async()=>{const fetchImpl=async()=>response([{id:'upcoming12345',snippet:{title:'Demain',scheduledStartTime:'2026-01-01T05:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}]);const state=await detectYouTubeLive({now:new Date('2026-01-01T00:00:00Z'),fetchImpl});expect(state).toMatchObject({status:'UPCOMING',title:'Demain',scheduledAt:'2026-01-01T05:00:00Z'})})
it('detects upcoming and fails safely on API errors',async()=>{const state=await detectYouTubeLive({now:new Date('2026-01-01T00:00:00Z'),fetchImpl:async()=>response([{id:'abc12345678',snippet:{title:'Demain',scheduledStartTime:'2026-01-01T05:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])});expect(state?.status).toBe('UPCOMING');__resetYouTubeLiveCache();await expect(detectYouTubeLive({fetchImpl:async()=>new Response('',{status:503})})).resolves.toBeNull()})
it('rechecks owned broadcasts after the upcoming cache expires',async()=>{let calls=0;const fetchImpl=async()=>{calls++;return response([{id:'abc12345678',snippet:{title:'Demain',scheduledStartTime:'2026-01-01T05:00:00Z'},status:{lifeCycleStatus:'ready',privacyStatus:'public'}}])};const now=new Date('2026-01-01T00:00:00Z');await expect(detectYouTubeLive({now,fetchImpl})).resolves.toMatchObject({status:'UPCOMING'});await expect(detectYouTubeLive({now:new Date(now.getTime()+15*60_000+1),fetchImpl})).resolves.toMatchObject({status:'UPCOMING'});expect(calls).toBe(3)})
it('rechecks a live owned broadcast at the 30 second cadence',async()=>{let calls=0;const authHeaders:string[]=[];const fetchImpl=async(input:RequestInfo|URL,init?:RequestInit)=>{if(!String(input).includes('oauth2.googleapis.com/token')){calls++;authHeaders.push(String((init?.headers as Record<string,string>|undefined)?.Authorization||''))};return response([{id:'abc12345678',snippet:{title:'Culte'},status:{lifeCycleStatus:'live',privacyStatus:'public'},liveStreamingDetails:{actualStartTime:'2026-01-01T00:00:00Z'}}])};const now=new Date('2026-01-01T00:00:00Z');await expect(detectYouTubeLive({now,fetchImpl})).resolves.toMatchObject({status:'LIVE'});await expect(detectYouTubeLive({now:new Date(now.getTime()+30_001),fetchImpl})).resolves.toMatchObject({status:'LIVE'});expect(calls).toBe(2);expect(authHeaders).toEqual(['Bearer access-test','Bearer access-test']);expect(revalidationSeconds({status:'LIVE',title:'Culte',watchUrl:'/live'},now)).toBe(30)})
it('does not classify ended videos as live',async()=>{const fetchImpl=async()=>response([{id:'ended1234567',snippet:{title:'Termine'},status:{lifeCycleStatus:'complete',privacyStatus:'public'}}]);await expect(detectYouTubeLive({now:new Date('2026-01-01T00:00:00Z'),fetchImpl})).resolves.toBeNull()})
it('does not expose OAuth credentials on YouTube API requests',async()=>{const requests:{url:string;authorization:string}[]=[];const fetchImpl=async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(!url.includes('oauth2.googleapis.com/token'))requests.push({url,authorization:String((init?.headers as Record<string,string>|undefined)?.Authorization||'')});return response([])};await detectYouTubeLive({fetchImpl});expect(requests.every(({url,authorization})=>!url.includes('test-secret')&&!url.includes('test-refresh')&&!authorization.includes('test-secret')&&!authorization.includes('test-refresh'))).toBe(true)})
it('leaves CMS as the safe fallback when YouTube is unavailable',async()=>{__resetYouTubeLiveCache();const detected=await detectYouTubeLive({fetchImpl:async()=>new Response('',{status:503})});expect(detected).toBeNull();expect(resolveLiveState([{status:'live',title:'Culte CMS',youtube_url:'https://youtu.be/abcdefghijk'}])).toMatchObject({status:'LIVE',title:'Culte CMS'});expect(resolveLiveState([])).toEqual({status:'OFFLINE'})})
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
})
