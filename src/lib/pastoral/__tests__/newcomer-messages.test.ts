import { describe, it, expect } from 'vitest'
import {
  NEWCOMER_MESSAGES,
  interpolateMessage,
  buildMessage,
  getMessagesForStage,
} from '@/lib/pastoral/newcomer-messages'

describe('interpolateMessage — interpolation sûre de {prenom}', () => {
  it('insère le prénom quand présent', () => {
    expect(interpolateMessage('Bonjour {prenom}, bienvenue.', { prenom: 'Alice' })).toBe('Bonjour Alice, bienvenue.')
  })

  it('gère les espaces autour de la variable', () => {
    expect(interpolateMessage('Cher {  prenom  } !', { prenom: 'Bob' })).toBe('Cher Bob !')
  })

  it('repli neutre si prénom absent/null/vide (nettoyage ponctuation)', () => {
    expect(interpolateMessage('Bonjour {prenom}, bienvenue.', {})).toBe('Bonjour, bienvenue.')
    expect(interpolateMessage('Bonjour {prenom}, bienvenue.', { prenom: null })).toBe('Bonjour, bienvenue.')
    expect(interpolateMessage('Bonjour {prenom}, bienvenue.', { prenom: '   ' })).toBe('Bonjour, bienvenue.')
  })

  it('laisse les variables inconnues INCHANGÉES (pas de fuite)', () => {
    expect(interpolateMessage('Cher {autre}, salut.', { prenom: 'Dave' })).toBe('Cher {autre}, salut.')
  })

  it('template vide → chaîne vide', () => {
    expect(interpolateMessage('', { prenom: 'X' })).toBe('')
    // @ts-expect-error robustesse : body non-string
    expect(interpolateMessage(null, {})).toBe('')
  })
})

describe('NEWCOMER_MESSAGES — les 5 messages', () => {
  it('contient exactement les 5 identifiants attendus', () => {
    expect(NEWCOMER_MESSAGES.map((m) => m.id)).toEqual(['welcome', 'encouragement', 'follow_up', 'culte', 'entretien'])
  })

  it('chaque message a un libellé et un corps non vide', () => {
    for (const m of NEWCOMER_MESSAGES) {
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.body.length).toBeGreaterThan(0)
      expect(m.body).toContain('{prenom}')
    }
  })

  it('aucun message ne contient de donnée sensible / placeholder à remplir', () => {
    for (const m of NEWCOMER_MESSAGES) {
      const b = m.body.toLowerCase()
      expect(b).not.toContain('[à remplir]')
      expect(b).not.toContain('http')
      expect(b).not.toMatch(/\b\d{6,}\b/) // pas de numéro/adresse en dur
    }
  })
})

describe('buildMessage', () => {
  it('construit un message interpolé', () => {
    const b = buildMessage('welcome', { prenom: 'Éva' })
    expect(b).not.toBeNull()
    expect(b!.label).toBe('Message de bienvenue')
    expect(b!.body).toContain('Éva')
    expect(b!.body).not.toContain('{prenom}')
    expect(b!.isEmpty).toBe(false)
  })

  it('id inconnu → null', () => {
    expect(buildMessage('inexistant', {})).toBeNull()
  })

  it('repli neutre si prénom absent', () => {
    const b = buildMessage('welcome', {})
    expect(b!.body.startsWith('Bonjour, bienvenue')).toBe(true)
  })
})

describe('getMessagesForStage', () => {
  it('retourne les messages pertinents pour l’étape', () => {
    expect(getMessagesForStage('follow_up').map((m) => m.id)).toContain('follow_up')
    expect(getMessagesForStage('received').map((m) => m.id)).toContain('welcome')
  })

  it('repli : tous les messages si aucune correspondance', () => {
    expect(getMessagesForStage('closed').length).toBe(NEWCOMER_MESSAGES.length)
  })
})
