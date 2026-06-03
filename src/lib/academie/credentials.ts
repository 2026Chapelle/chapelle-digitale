/**
 * ACADÉMIE DES ÉLUS — diplômes & certificats (authenticité).
 *
 * Format de numéro unique : AER-AAAA-NNNNNN (ex. AER-2026-000001).
 * Stockage localStorage pour l'instant (shape identique à la future table
 * `academy_certificates` / `academy_diplomas`) → bascule DB sans changer l'UI.
 * Le code est DÉTERMINISTE (hash du sujet) : idempotent et vérifiable.
 */

export type CredentialType = 'certificate' | 'diploma'
export type Mention = 'Distinction' | 'Honneur' | 'Très Honorable' | 'Excellence Royale'

export interface Credential {
  code: string
  type: CredentialType
  /** Nom complet du récipiendaire. */
  recipient: string
  /** Intitulé (niveau ou diplôme). */
  title: string
  /** Référence interne (levelId, ou 'diplome'). */
  ref: string
  mention?: Mention
  issuedAt: string
  /** Empreinte d'intégrité (non secrète). */
  hash: string
}

const STORE_KEY = 'cier_academy_credentials_v1'
const NAME_KEY = 'cier_academy_student_name'

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

function pad6(n: number): string {
  return String(n % 1_000_000).padStart(6, '0')
}

/** Numéro déterministe AER-AAAA-NNNNNN à partir d'un sujet. */
export function codeFor(subject: string, year = new Date().getFullYear()): string {
  return `AER-${year}-${pad6(djb2(subject))}`
}

export function mentionFor(avgScore: number | null | undefined): Mention {
  if (avgScore == null) return 'Distinction'
  if (avgScore >= 95) return 'Excellence Royale'
  if (avgScore >= 85) return 'Très Honorable'
  if (avgScore >= 75) return 'Honneur'
  return 'Distinction'
}

function readStore(): Record<string, Credential> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { return {} }
}
function writeStore(s: Record<string, Credential>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* quota */ }
}

export function getStudentName(): string {
  if (typeof window === 'undefined') return ''
  try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' }
}
export function setStudentName(name: string) {
  try { localStorage.setItem(NAME_KEY, name.trim()) } catch { /* */ }
}

/** Émet (ou récupère, idempotent) un certificat de niveau. */
export function issueCertificate(levelId: string, levelTitle: string, recipient: string): Credential {
  const subject = `cert|${levelId}|${recipient.toLowerCase().trim()}`
  const code = codeFor(subject)
  const store = readStore()
  if (store[code]) return store[code]
  const cred: Credential = {
    code, type: 'certificate', recipient: recipient.trim(), title: levelTitle, ref: levelId,
    issuedAt: new Date().toISOString(), hash: djb2(subject + code).toString(16),
  }
  store[code] = cred; writeStore(store)
  return cred
}

/** Émet (ou récupère) le diplôme suprême. */
export function issueDiploma(recipient: string, mention: Mention): Credential {
  const subject = `diplome|${recipient.toLowerCase().trim()}`
  const code = codeFor(subject)
  const store = readStore()
  if (store[code]) return store[code]
  const cred: Credential = {
    code, type: 'diploma', recipient: recipient.trim(),
    title: 'Diplôme des Bâtisseurs du Royaume', ref: 'diplome', mention,
    issuedAt: new Date().toISOString(), hash: djb2(subject + code).toString(16),
  }
  store[code] = cred; writeStore(store)
  return cred
}

/** Vérification publique d'un code. */
export function getCredential(code: string): Credential | null {
  return readStore()[code.trim().toUpperCase()] ?? null
}

export function listCredentials(): Credential[] {
  return Object.values(readStore()).sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1))
}
