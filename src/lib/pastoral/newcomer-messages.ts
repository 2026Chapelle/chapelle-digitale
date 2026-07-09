/**
 * Messages pastoraux prêts à copier pour l'accueil d'un « Nouveau Venu » (V2.6-B) — PUR.
 *
 * Templates statiques + interpolation SÛRE de `{prenom}`. Aucune donnée fictive, aucune
 * information sensible, aucun envoi : l'UI ne fait que copier/préparer le texte. Repli
 * neutre si le prénom est absent ; les variables inconnues sont laissées telles quelles.
 */
import type { JourneyStage } from '@/lib/pastoral/newcomer-journey'

export interface MessageTemplate {
  id: string
  label: string
  /** Étapes où ce message est le plus pertinent (indicatif). */
  stages: JourneyStage[]
  body: string
}

export interface MessageContext {
  prenom?: string | null
}

export interface BuiltMessage {
  id: string
  label: string
  body: string
  isEmpty: boolean
}

/** Les 5 messages d'accompagnement (français chaleureux, {prenom} interpolable). */
export const NEWCOMER_MESSAGES: MessageTemplate[] = [
  {
    id: 'welcome',
    label: 'Message de bienvenue',
    stages: ['received', 'to_contact'],
    body:
      'Bonjour {prenom}, bienvenue à la Chapelle du Royaume ! ' +
      "Nous sommes vraiment heureux de t'accueillir. Merci d'avoir fait ce premier pas vers nous. " +
      "Un membre de l'équipe pastorale te contactera très bientôt pour faire connaissance et t'aider à trouver ta place. À très vite. 🙏",
  },
  {
    id: 'encouragement',
    label: "Message d'encouragement",
    stages: ['contacted'],
    body:
      'Bonjour {prenom}, merci pour ton ouverture et ta confiance. ' +
      'La Chapelle est un lieu où grandir, être écouté et faire partie d’une famille. ' +
      'Nous te portons dans la prière et nous t’encourageons à avancer un pas après l’autre. Sois béni(e). 🙏',
  },
  {
    id: 'follow_up',
    label: 'Relance douce',
    stages: ['follow_up'],
    body:
      'Bonjour {prenom}, un petit mot simplement pour te dire que nous pensons à toi. ' +
      "Nous n'avons pas eu de tes nouvelles ces derniers jours — et c'est tout à fait normal, la vie est chargée. " +
      'Tu restes le/la bienvenu(e) parmi nous, quand tu le souhaites. À bientôt. 🙏',
  },
  {
    id: 'culte',
    label: 'Invitation au culte',
    stages: ['contacted', 'follow_up'],
    body:
      'Bonjour {prenom}, nous serions vraiment heureux de te voir au culte ce dimanche. ' +
      "C'est un beau moment où toute la famille se rassemble autour de la Parole — tu y seras accueilli(e) tel(le) que tu es. " +
      "Si tu as besoin d'aide pour venir, dis-le-nous simplement. À dimanche. 🙏",
  },
  {
    id: 'entretien',
    label: 'Invitation à un entretien pastoral',
    stages: ['contacted', 'follow_up'],
    body:
      'Bonjour {prenom}, nous aimerions prendre un moment pour t’écouter et voir comment t’accompagner au mieux. ' +
      'Cela peut être autour d’un café, par téléphone ou en personne — comme tu préfères. ' +
      'Dis-nous ce qui t’arrange et nous fixerons un moment ensemble. Au plaisir d’échanger. 🙏',
  },
]

const PRENOM_RE = /\{\s*prenom\s*\}/g

/** Normalise un prénom pour interpolation : trim, sinon chaîne vide (repli neutre). */
function safePrenom(prenom: unknown): string {
  return typeof prenom === 'string' ? prenom.trim() : ''
}

/**
 * Interpole `{prenom}` dans un corps de texte.
 * - prénom présent → inséré tel quel ;
 * - prénom absent → repli neutre (le vocatif « Bonjour , » est nettoyé en « Bonjour, ») ;
 * - toute autre variable `{...}` est laissée INCHANGÉE (pas de fuite, pas d'erreur).
 */
export function interpolateMessage(body: string, ctx: MessageContext = {}): string {
  if (typeof body !== 'string') return ''
  const prenom = safePrenom(ctx.prenom)
  let out = body.replace(PRENOM_RE, prenom)
  if (!prenom) {
    // Nettoie les artefacts du prénom vide : espace avant ponctuation + doubles espaces.
    out = out.replace(/\s+([,!?.])/g, '$1').replace(/[ \t]{2,}/g, ' ')
  }
  return out.trim()
}

/** Construit un message final (texte interpolé + méta) à partir d'un id. */
export function buildMessage(id: string, ctx: MessageContext = {}): BuiltMessage | null {
  const tpl = NEWCOMER_MESSAGES.find((m) => m.id === id)
  if (!tpl) return null
  const body = interpolateMessage(tpl.body, ctx)
  return { id: tpl.id, label: tpl.label, body, isEmpty: body.length === 0 }
}

/** Messages recommandés pour une étape donnée (ou tous si aucune correspondance). */
export function getMessagesForStage(stage: JourneyStage): MessageTemplate[] {
  const matched = NEWCOMER_MESSAGES.filter((m) => m.stages.includes(stage))
  return matched.length ? matched : NEWCOMER_MESSAGES
}
