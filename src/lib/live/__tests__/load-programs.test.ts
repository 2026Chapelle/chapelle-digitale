import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cmsList } from '@/lib/cms'
import { loadLivePrograms } from '../load-programs'

vi.mock('@/lib/cms', () => ({ cmsList: vi.fn() }))
const mockCmsList = vi.mocked(cmsList)

beforeEach(() => mockCmsList.mockReset())

describe('loadLivePrograms', () => {
  it('null (démo) → []', async () => {
    mockCmsList.mockResolvedValue(null)
    expect(await loadLivePrograms()).toEqual([])
  })
  it('[] → []', async () => {
    mockCmsList.mockResolvedValue([])
    expect(await loadLivePrograms()).toEqual([])
  })
  it('filtre les programmes inactifs et normalise', async () => {
    mockCmsList.mockResolvedValue([
      { id: 'a', slug: 'matinale', title: 'Matinale', weekdays: ['1', '3', '5'], start_time: '05:30:00', youtube_playlist_id: 'PLa', is_active: true, status: 'published' },
      { id: 'b', slug: 'inactif', title: 'Inactif', weekdays: [2], is_active: false, status: 'published' },
    ] as any)
    const res = await loadLivePrograms()
    expect(res).toHaveLength(1)
    expect(res[0].slug).toBe('matinale')
    expect(res[0].weekdays).toEqual([1, 3, 5])
    expect(res[0].startTime).toBe('05:30')
    expect(res[0].playlistEmbedUrl).toContain('PLa')
  })
  it('demande live_programs publiés triés par sort_order', async () => {
    mockCmsList.mockResolvedValue([])
    await loadLivePrograms()
    expect(mockCmsList).toHaveBeenCalledWith('live_programs', { publicOnly: true, orderBy: 'sort_order', ascending: true })
  })
})
