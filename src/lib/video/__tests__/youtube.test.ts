import { describe, it, expect } from 'vitest'
import {
  extractYouTubeId,
  isYouTubeUrl,
  extractYouTubePlaylistId,
  youtubeEmbedUrl,
  youtubePlaylistEmbedUrl,
  youtubeThumbnail,
  classifyVideoSource,
  resolveVideoSource,
} from '../youtube'

const ID = 'dQw4w9WgXcQ'

describe('extractYouTubeId — formats reconnus', () => {
  it('watch?v=', () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(extractYouTubeId(`https://youtube.com/watch?v=${ID}&t=42s`)).toBe(ID)
  })
  it('youtu.be', () => {
    expect(extractYouTubeId(`https://youtu.be/${ID}`)).toBe(ID)
  })
  it('embed', () => {
    expect(extractYouTubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID)
  })
  it('live', () => {
    expect(extractYouTubeId(`https://www.youtube.com/live/${ID}`)).toBe(ID)
  })
  it('shorts', () => {
    expect(extractYouTubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
  })
  it('ID brut (11 caractères)', () => {
    expect(extractYouTubeId(ID)).toBe(ID)
    expect(extractYouTubeId(`  ${ID}  `)).toBe(ID)
  })
  it('null / undefined / vide → null', () => {
    expect(extractYouTubeId(null)).toBeNull()
    expect(extractYouTubeId(undefined)).toBeNull()
    expect(extractYouTubeId('')).toBeNull()
  })
  it('URL non-YouTube ou chaîne invalide → null', () => {
    expect(extractYouTubeId('https://vimeo.com/12345678')).toBeNull()
    expect(extractYouTubeId('pas une url')).toBeNull()
    expect(extractYouTubeId('trop-court')).toBeNull()
  })
})

describe('isYouTubeUrl — hôtes reconnus', () => {
  it('hôtes valides (avec/sans www., variantes)', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=' + ID)).toBe(true)
    expect(isYouTubeUrl('https://youtube.com/watch?v=' + ID)).toBe(true)
    expect(isYouTubeUrl('https://m.youtube.com/watch?v=' + ID)).toBe(true)
    expect(isYouTubeUrl('https://youtu.be/' + ID)).toBe(true)
    expect(isYouTubeUrl('https://www.youtube-nocookie.com/embed/' + ID)).toBe(true)
    expect(isYouTubeUrl('youtu.be/' + ID)).toBe(true) // sans protocole
  })
  it('hôtes invalides → false', () => {
    expect(isYouTubeUrl('https://vimeo.com/12345678')).toBe(false)
    expect(isYouTubeUrl('https://example.com')).toBe(false)
    expect(isYouTubeUrl('https://notyoutube.com/watch?v=' + ID)).toBe(false)
  })
  it('null / undefined / vide / chaîne non-URL → false', () => {
    expect(isYouTubeUrl(null)).toBe(false)
    expect(isYouTubeUrl(undefined)).toBe(false)
    expect(isYouTubeUrl('')).toBe(false)
    expect(isYouTubeUrl('pas une url du tout !!')).toBe(false)
  })
})

describe('extractYouTubePlaylistId', () => {
  it('extrait list= (≥10 caractères)', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=' + ID + '&list=PLabcdefghi123')).toBe(
      'PLabcdefghi123'
    )
    expect(extractYouTubePlaylistId('https://www.youtube.com/playlist?list=PLabcdefghi123')).toBe('PLabcdefghi123')
  })
  it('absent ou trop court → null', () => {
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=' + ID)).toBeNull()
    expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=' + ID + '&list=short')).toBeNull()
    expect(extractYouTubePlaylistId(null)).toBeNull()
    expect(extractYouTubePlaylistId('')).toBeNull()
  })
})

describe('youtubeEmbedUrl', () => {
  it('valeurs par défaut : rel=0, modestbranding=1, pas d\'autoplay, hôte standard', () => {
    const url = youtubeEmbedUrl(ID)
    expect(url).toBe(`https://www.youtube.com/embed/${ID}?rel=0&modestbranding=1`)
  })
  it('rel=true → rel=1', () => {
    const url = youtubeEmbedUrl(ID, { rel: true })
    expect(url).toContain('rel=1')
  })
  it('modest=false → modestbranding=0', () => {
    const url = youtubeEmbedUrl(ID, { modest: false })
    expect(url).toContain('modestbranding=0')
  })
  it('autoplay=true → autoplay=1 ajouté', () => {
    const url = youtubeEmbedUrl(ID, { autoplay: true })
    expect(url).toContain('autoplay=1')
  })
  it('autoplay absent/false → pas de paramètre autoplay', () => {
    expect(youtubeEmbedUrl(ID)).not.toContain('autoplay')
    expect(youtubeEmbedUrl(ID, { autoplay: false })).not.toContain('autoplay')
  })
  it('nocookie=true → hôte youtube-nocookie.com', () => {
    const url = youtubeEmbedUrl(ID, { nocookie: true })
    expect(url.startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true)
  })
  it('combinaison de toutes les options', () => {
    const url = youtubeEmbedUrl(ID, { autoplay: true, rel: true, modest: false, nocookie: true })
    expect(url).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=1&modestbranding=0&autoplay=1`)
  })
})

describe('youtubePlaylistEmbedUrl', () => {
  const listId = 'PLabcdefghi123'
  it('base videoseries avec list= et rel=0 par défaut', () => {
    expect(youtubePlaylistEmbedUrl(listId)).toBe(`https://www.youtube.com/embed/videoseries?list=${listId}&rel=0`)
  })
  it('rel=true → rel=1', () => {
    expect(youtubePlaylistEmbedUrl(listId, { rel: true })).toContain('rel=1')
  })
  it('autoplay=true → autoplay=1 ajouté', () => {
    expect(youtubePlaylistEmbedUrl(listId, { autoplay: true })).toContain('autoplay=1')
  })
  it('nocookie=true → hôte youtube-nocookie.com', () => {
    expect(youtubePlaylistEmbedUrl(listId, { nocookie: true }).startsWith('https://www.youtube-nocookie.com/embed/videoseries')).toBe(
      true
    )
  })
})

describe('youtubeThumbnail — qualités', () => {
  it('hq par défaut', () => {
    expect(youtubeThumbnail(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  })
  it('default', () => {
    expect(youtubeThumbnail(ID, 'default')).toBe(`https://i.ytimg.com/vi/${ID}/default.jpg`)
  })
  it('mq', () => {
    expect(youtubeThumbnail(ID, 'mq')).toBe(`https://i.ytimg.com/vi/${ID}/mqdefault.jpg`)
  })
  it('hq explicite', () => {
    expect(youtubeThumbnail(ID, 'hq')).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  })
  it('sd', () => {
    expect(youtubeThumbnail(ID, 'sd')).toBe(`https://i.ytimg.com/vi/${ID}/sddefault.jpg`)
  })
  it('maxres', () => {
    expect(youtubeThumbnail(ID, 'maxres')).toBe(`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`)
  })
})

describe('classifyVideoSource', () => {
  it('YouTube', () => {
    expect(classifyVideoSource(`https://www.youtube.com/watch?v=${ID}`)).toBe('youtube')
    expect(classifyVideoSource(`https://youtu.be/${ID}`)).toBe('youtube')
  })
  it('Supabase Storage — bucket public', () => {
    expect(
      classifyVideoSource('https://abcxyz.supabase.co/storage/v1/object/public/videos/module-1.mp4')
    ).toBe('storage')
  })
  it('Supabase Storage — URL signée', () => {
    expect(
      classifyVideoSource('https://abcxyz.supabase.co/storage/v1/object/sign/videos/module-1.mp4?token=abc')
    ).toBe('storage')
  })
  it('Supabase Storage — authenticated', () => {
    expect(
      classifyVideoSource('https://abcxyz.supabase.co/storage/v1/object/authenticated/videos/module-1.mp4')
    ).toBe('storage')
  })
  it('externe (hôte quelconque, non YouTube, non storage)', () => {
    expect(classifyVideoSource('https://cdn.example.com/video.mp4')).toBe('external')
  })
  it('chaîne vide / absente → none', () => {
    expect(classifyVideoSource('')).toBe('none')
    expect(classifyVideoSource(null)).toBe('none')
    expect(classifyVideoSource(undefined)).toBe('none')
    expect(classifyVideoSource('   ')).toBe('none')
  })
  it('URL Storage sur hôte étranger avec expectedStorageHost fourni → external', () => {
    const url = 'https://autre-projet.supabase.co/storage/v1/object/public/videos/module-1.mp4'
    expect(classifyVideoSource(url, 'abcxyz.supabase.co')).toBe('external')
  })
  it('URL Storage sur hôte attendu avec expectedStorageHost fourni → storage', () => {
    const url = 'https://abcxyz.supabase.co/storage/v1/object/public/videos/module-1.mp4'
    expect(classifyVideoSource(url, 'abcxyz.supabase.co')).toBe('storage')
  })
})

describe('resolveVideoSource', () => {
  it('YouTube via youtube_url', () => {
    const r = resolveVideoSource({ youtube_url: `https://youtu.be/${ID}`, video_url: null })
    expect(r.kind).toBe('youtube')
    expect(r.youtubeId).toBe(ID)
    expect(r.embedUrl).toBe(youtubeEmbedUrl(ID))
    expect(r.thumbnailUrl).toBe(youtubeThumbnail(ID))
    expect(r.fileUrl).toBeNull()
  })
  it('YouTube collé dans video_url (youtube_url absent)', () => {
    const r = resolveVideoSource({ video_url: `https://www.youtube.com/watch?v=${ID}` })
    expect(r.kind).toBe('youtube')
    expect(r.youtubeId).toBe(ID)
    expect(r.embedUrl).toBe(youtubeEmbedUrl(ID))
    expect(r.thumbnailUrl).toBe(youtubeThumbnail(ID))
  })
  it('youtube_url prioritaire si les deux champs contiennent un ID YouTube différent', () => {
    const other = 'abcdefghijk'
    const r = resolveVideoSource({ youtube_url: `https://youtu.be/${other}`, video_url: `https://youtu.be/${ID}` })
    expect(r.youtubeId).toBe(other)
  })
  it('storage', () => {
    const url = 'https://abcxyz.supabase.co/storage/v1/object/public/videos/module-1.mp4'
    const r = resolveVideoSource({ video_url: url })
    expect(r.kind).toBe('storage')
    expect(r.fileUrl).toBe(url)
    expect(r.youtubeId).toBeNull()
    expect(r.embedUrl).toBeNull()
    expect(r.thumbnailUrl).toBeNull()
  })
  it('externe', () => {
    const url = 'https://cdn.example.com/video.mp4'
    const r = resolveVideoSource({ video_url: url })
    expect(r.kind).toBe('external')
    expect(r.fileUrl).toBe(url)
  })
  it('none — aucun champ renseigné', () => {
    const r = resolveVideoSource({})
    expect(r).toEqual({ kind: 'none', youtubeId: null, embedUrl: null, fileUrl: null, thumbnailUrl: null })
  })
  it('none — champs vides', () => {
    const r = resolveVideoSource({ youtube_url: '', video_url: '' })
    expect(r.kind).toBe('none')
  })
  it('respecte expectedStorageHost transmis via opts', () => {
    const url = 'https://autre-projet.supabase.co/storage/v1/object/public/videos/module-1.mp4'
    const r = resolveVideoSource({ video_url: url }, { expectedStorageHost: 'abcxyz.supabase.co' })
    expect(r.kind).toBe('external')
  })
})
