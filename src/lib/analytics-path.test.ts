import { describe, expect, it } from 'vitest'
import { isTrackedPath } from './analytics-path'

describe('périmètre tracker canonique', () => {
  it('inclut les pages publiques et les parcours membres', () => {
    expect(isTrackedPath('/')).toBe(true)
    expect(isTrackedPath('/live')).toBe(true)
    expect(isTrackedPath('/member/dashboard')).toBe(true)
    expect(isTrackedPath('/register')).toBe(true)
  })

  it('exclut les pages administration et prévisualisation, y compris leurs sous-routes', () => {
    for (const path of ['/admin', '/admin/', '/admin/dashboard', '/preview', '/preview/article']) {
      expect(isTrackedPath(path)).toBe(false)
    }
  })

  it('ne confond pas les préfixes et refuse les chemins non valides', () => {
    expect(isTrackedPath('/administrator')).toBe(true)
    expect(isTrackedPath('/previewer')).toBe(true)
    expect(isTrackedPath(null)).toBe(false)
    expect(isTrackedPath(undefined)).toBe(false)
    expect(isTrackedPath('admin/dashboard')).toBe(false)
  })
})
