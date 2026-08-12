import { describe, it, expect, vi } from 'vitest'
import {
  fetchPublishedPodcasts,
  PODCAST_BASE_COLUMNS,
  PODCAST_EXTENDED_COLUMNS,
  type QueryResult,
} from '@/lib/podcast/fetch-episodes'

describe('fetchPublishedPodcasts — repli gracieux', () => {
  it('schéma migré : lit les colonnes étendues, une seule requête', async () => {
    const runQuery = vi.fn(async (): Promise<QueryResult> => ({
      data: [{ id: '1', serie: 'X', access_level: 'premium' }],
      error: null,
    }))
    const res = await fetchPublishedPodcasts(runQuery)
    expect(res.editorialAvailable).toBe(true)
    expect(res.rows).toHaveLength(1)
    expect(runQuery).toHaveBeenCalledTimes(1)
    expect(runQuery).toHaveBeenCalledWith(PODCAST_EXTENDED_COLUMNS)
  })

  it('schéma pré-migration : échec étendu → repli sur les colonnes de base', async () => {
    const runQuery = vi.fn(async (cols: string): Promise<QueryResult> => {
      if (cols === PODCAST_EXTENDED_COLUMNS) {
        return { data: null, error: { message: 'column cms_podcasts.serie does not exist' } }
      }
      return { data: [{ id: '1', title: 'Legacy' }], error: null }
    })
    const res = await fetchPublishedPodcasts(runQuery)
    expect(res.editorialAvailable).toBe(false)
    expect(res.rows).toEqual([{ id: '1', title: 'Legacy' }])
    expect(runQuery).toHaveBeenCalledTimes(2)
    expect(runQuery).toHaveBeenNthCalledWith(2, PODCAST_BASE_COLUMNS)
  })

  it('data null sans erreur → rows []', async () => {
    const runQuery = vi.fn(async (): Promise<QueryResult> => ({ data: null, error: null }))
    const res = await fetchPublishedPodcasts(runQuery)
    expect(res.rows).toEqual([])
    expect(res.editorialAvailable).toBe(true)
  })

  it('repli renvoyant lui aussi null → rows [] (jamais de throw)', async () => {
    const runQuery = vi.fn(async (): Promise<QueryResult> => ({ data: null, error: { message: 'boom' } }))
    const res = await fetchPublishedPodcasts(runQuery)
    expect(res.rows).toEqual([])
    expect(res.editorialAvailable).toBe(false)
    expect(runQuery).toHaveBeenCalledTimes(2)
  })
})
