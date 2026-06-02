/**
 * Helpers serveur pour l'analytics interne Citadelle.
 * Aucune dépendance externe : parsing User-Agent + détection de source légers.
 */

/** Catégorie d'appareil à partir du User-Agent. */
export function parseDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/.test(s)) return 'mobile'
  return 'desktop'
}

/** Navigateur principal. */
export function parseBrowser(ua: string): string {
  const s = ua
  if (/Edg\//.test(s)) return 'Edge'
  if (/OPR\/|Opera/.test(s)) return 'Opera'
  if (/SamsungBrowser/.test(s)) return 'Samsung Internet'
  if (/Chrome\//.test(s) && !/Chromium/.test(s)) return 'Chrome'
  if (/Firefox\//.test(s)) return 'Firefox'
  if (/Safari\//.test(s) && /Version\//.test(s)) return 'Safari'
  if (/MSIE|Trident/.test(s)) return 'Internet Explorer'
  return 'Autre'
}

/** Système d'exploitation. */
export function parseOS(ua: string): string {
  const s = ua
  if (/Windows NT/.test(s)) return 'Windows'
  if (/iPhone|iPad|iPod/.test(s)) return 'iOS'
  if (/Mac OS X/.test(s)) return 'macOS'
  if (/Android/.test(s)) return 'Android'
  if (/Linux/.test(s)) return 'Linux'
  return 'Autre'
}

/**
 * Source d'entrée : UTM prioritaire, sinon déduite du referrer.
 * direct | whatsapp | facebook | youtube | google | email | instagram | tiktok | telegram | referral
 */
export function detectSource(referrer: string | null, utmSource: string | null): string {
  const u = (utmSource || '').toLowerCase()
  if (u) {
    if (/whatsapp|wa/.test(u)) return 'whatsapp'
    if (/face|fb|meta/.test(u)) return 'facebook'
    if (/insta|ig/.test(u)) return 'instagram'
    if (/you ?tube|yt/.test(u)) return 'youtube'
    if (/google|adwords|gads/.test(u)) return 'google'
    if (/mail|email|newsletter|resend/.test(u)) return 'email'
    if (/tiktok/.test(u)) return 'tiktok'
    if (/telegram|tg/.test(u)) return 'telegram'
    return u.slice(0, 32)
  }
  const r = (referrer || '').toLowerCase()
  if (!r) return 'direct'
  if (/whatsapp/.test(r)) return 'whatsapp'
  if (/facebook|fb\.com|fb\.me|l\.facebook/.test(r)) return 'facebook'
  if (/instagram/.test(r)) return 'instagram'
  if (/youtube|youtu\.be/.test(r)) return 'youtube'
  if (/google\./.test(r)) return 'google'
  if (/bing\.|duckduckgo|yahoo|qwant|ecosia/.test(r)) return 'google'
  if (/tiktok/.test(r)) return 'tiktok'
  if (/t\.co|twitter|x\.com/.test(r)) return 'twitter'
  if (/telegram|t\.me/.test(r)) return 'telegram'
  if (/mail\.|gmail|outlook|yahoo mail/.test(r)) return 'email'
  return 'referral'
}

/** Pays/ville depuis les en-têtes CDN usuels (Cloudflare / Vercel / proxy). */
export function geoFromHeaders(h: Headers): { pays: string | null; ville: string | null } {
  const pays =
    h.get('cf-ipcountry') ||
    h.get('x-vercel-ip-country') ||
    h.get('x-geoip-country') ||
    h.get('x-country-code') ||
    null
  const villeRaw =
    h.get('cf-ipcity') ||
    h.get('x-vercel-ip-city') ||
    h.get('x-geoip-city') ||
    null
  let ville: string | null = null
  if (villeRaw) { try { ville = decodeURIComponent(villeRaw) } catch { ville = villeRaw } }
  return { pays: pays && pays !== 'XX' ? pays : null, ville }
}
