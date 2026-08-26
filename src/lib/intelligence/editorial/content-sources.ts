import { cmsList, type CmsArticle, type CmsLive, type CmsPodcast } from '@/lib/cms'
import type { ContentGraphNode } from '../types/content'

function node(table: string, row: CmsLive | CmsArticle | CmsPodcast, type: 'live' | 'article' | 'podcast'): ContentGraphNode {
  const slug = type === 'article' ? ((row as CmsArticle).slug ?? null) : null
  const url = type === 'live' ? (row as CmsLive).youtube_url : type === 'podcast' ? (row as CmsPodcast).audio_url : undefined
  return {
    entity: { content_id: `${table}:${row.id}`, type, title: row.title, canonical_slug: slug, published_at: type === 'live' ? ((row as CmsLive).scheduled_at ?? null) : null, sourceRef: { table, id: row.id } },
    destinations: url ? [{ content_id: `${table}:${row.id}`, platform: type === 'live' ? 'youtube' : 'citadelle', external_id: null, url }] : [],
  }
}

export async function loadEditorialContentSources(): Promise<ContentGraphNode[]> {
  const [lives, articles, podcasts] = await Promise.all([
    cmsList<CmsLive>('cms_lives', { publicOnly: true }),
    cmsList<CmsArticle>('cms_articles', { publicOnly: true }),
    cmsList<CmsPodcast>('cms_podcasts', { publicOnly: true }),
  ])
  return [...(lives ?? []).map((row) => node('cms_lives', row, 'live')), ...(articles ?? []).map((row) => node('cms_articles', row, 'article')), ...(podcasts ?? []).map((row) => node('cms_podcasts', row, 'podcast'))]
}
