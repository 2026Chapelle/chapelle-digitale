import { describe, expect, it } from 'vitest'

import { buildResourceSlots } from './RetreatDayMemberResources'

describe('buildResourceSlots', () => {
  it('keeps unpublished and empty resource links out of the participant panel', () => {
    expect(buildResourceSlots([{ id: 'video', resourceType: 'video', sessionType: 'morning', title: 'À venir', scheduledTime: null, url: null, isPrivate: false }])).toEqual([
      { key: 'morning-video', label: 'Vidéo du matin', resources: [] },
      { key: 'evening-video', label: 'Vidéo du soir', resources: [] },
      { key: 'day-pdf', label: 'Carnet PDF', resources: [] },
    ])
  })
})
