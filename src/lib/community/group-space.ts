export type GroupPostKind = 'annonce' | 'priere' | 'ressource' | 'temoignage'
export type GroupPostState = 'en_attente' | 'publie' | 'refuse' | 'archive'
export type GroupPostVisibility = 'groupe' | 'responsables'

export interface GroupSpaceActor {
  uid: string
  activeMember: boolean
  manager: boolean
  activeGroup: boolean
}

export interface GroupPostAccess {
  author_id: string
  kind: GroupPostKind
  state: GroupPostState
  visibility: GroupPostVisibility
}

export interface ValidatedGroupPost {
  kind: GroupPostKind
  title: string
  body: string
  visibility: GroupPostVisibility
  resource_url: string | null
  consent: boolean
}

type ValidationResult =
  | { ok: true; value: ValidatedGroupPost }
  | { ok: false; errors: string[] }

// The server must resolve this actor for the specific group on every request.
function hasAccess(actor: GroupSpaceActor): boolean {
  return Boolean(actor.uid && actor.activeGroup && (actor.activeMember || actor.manager))
}

export function canReadGroupPost(
  actor: GroupSpaceActor,
  post: GroupPostAccess,
): boolean {
  if (!hasAccess(actor)) return false
  if (actor.manager) return true
  if (actor.uid === post.author_id) return true
  return post.visibility === 'groupe' && post.state === 'publie'
}

export function canModerateGroupPost(
  actor: GroupSpaceActor,
  _post: GroupPostAccess,
): boolean {
  return hasAccess(actor) && actor.manager
}

export function validateGroupPost(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Contenu invalide.'] }
  }

  const data = input as Record<string, unknown>
  const errors: string[] = []
  const kinds: readonly string[] = ['annonce', 'priere', 'ressource', 'temoignage']
  const kind = typeof data.kind === 'string' ? data.kind : ''
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const body = typeof data.body === 'string' ? data.body.trim() : ''
  const visibility = data.visibility === undefined ? 'groupe' : data.visibility
  const consent = data.consent === true

  if (!kinds.includes(kind)) errors.push('Type de contenu invalide.')
  if (!title || title.length > 160) errors.push('Titre requis : 160 caracteres maximum.')
  if (!body || body.length > 10000) errors.push('Texte requis : 10000 caracteres maximum.')
  if (visibility !== 'groupe' && visibility !== 'responsables') {
    errors.push('Visibilite invalide.')
  }
  if (visibility === 'responsables' && kind !== 'priere') {
    errors.push('La confidentialite est reservee aux sujets de priere.')
  }
  if (kind === 'temoignage' && !consent) {
    errors.push('Votre accord explicite est requis pour partager ce temoignage.')
  }

  let resource_url: string | null = null
  if (data.resource_url !== undefined && data.resource_url !== null && data.resource_url !== '') {
    if (typeof data.resource_url !== 'string' || data.resource_url.length > 2048) {
      errors.push('Lien de ressource invalide.')
    } else {
      try {
        const url = new URL(data.resource_url.trim())
        if (url.protocol !== 'https:' || url.username || url.password) {
          errors.push('Le lien doit utiliser HTTPS sans identifiants.')
        } else {
          resource_url = url.href
        }
      } catch {
        errors.push('Lien de ressource invalide.')
      }
    }
    if (kind !== 'ressource') {
      errors.push('Un lien est autorise uniquement pour une ressource.')
    }
  }

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      kind: kind as GroupPostKind,
      title,
      body,
      visibility: visibility as GroupPostVisibility,
      resource_url,
      consent,
    },
  }
}