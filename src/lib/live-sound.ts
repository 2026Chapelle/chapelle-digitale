/**
 * ALERTES LIVE — son discret côté client (réutilise le moteur de notifications).
 * Aucun nouveau moteur d'alerte : sert uniquement à jouer un bip court quand une
 * notification de type live arrive, SI le membre l'a activé. Respecte strictement
 * les règles navigateur (autoplay) : si l'audio est bloqué → silencieux, jamais de crash.
 */

/** Types de notification considérés « live ». */
export const LIVE_NOTIF_TYPES = ['live', 'live_now', 'live_starting'] as const

/** Une notification est-elle une alerte live ? (PUR, testable). */
export function isLiveType(type?: string | null): boolean {
  return !!type && (LIVE_NOTIF_TYPES as readonly string[]).includes(type)
}

const PREF_KEY = 'cier_live_sound'

/** Le son des alertes live est-il activé ? (préférence locale par appareil). */
export function getLiveSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(PREF_KEY) === '1' } catch { return false }
}

/** Active/désactive le son des alertes live (localStorage, par appareil). */
export function setLiveSoundEnabled(on: boolean): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(PREF_KEY, on ? '1' : '0') } catch { /* quota */ }
}

let ctx: AudioContext | null = null

/**
 * Joue un carillon court et discret (2 tons). Web Audio (aucun asset).
 * Garde-fous : pas de SSR, AudioContext requis, reprise après geste utilisateur,
 * silencieux si le navigateur bloque l'audio. Ne lève jamais d'exception.
 */
export async function playLiveChime(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const AC: typeof AudioContext | undefined = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') { try { await ctx.resume() } catch { return } }
    if (ctx.state !== 'running') return // bloqué par le navigateur → seulement visuel
    const now = ctx.currentTime
    const notes = [880, 1175] // La5 → Ré6, bref et doux
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02) // volume modéré (discret)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
      osc.connect(gain); gain.connect(ctx!.destination)
      osc.start(t); osc.stop(t + 0.16)
    })
  } catch { /* aucun crash : la notification visuelle suffit */ }
}
