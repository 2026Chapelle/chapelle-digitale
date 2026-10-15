export const MAHANAIM_RETREAT_SLUG = 'chambre-haute-2026'
export const MAHANAIM_PDF_MAX_BYTES = 20 * 1024 * 1024

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidMahanaimVideoUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && host.length > 0
      && host !== 'localhost'
      && !host.endsWith('.localhost')
      && !host.endsWith('.local')
      && !host.endsWith('.internal')
      && !/^\d+\.\d+\.\d+\.\d+$/.test(host)
      && !host.includes(':')
  } catch {
    return false
  }
}

export function buildMahanaimPdfPath(dayId: string, objectId: string): string {
  if (!UUID.test(dayId) || !UUID.test(objectId)) throw new Error('invalid_mahanaim_pdf_identifier')
  return `mahanaim/${MAHANAIM_RETREAT_SLUG}/${dayId}/${objectId}.pdf`
}

export function isValidMahanaimPdfPath(path: unknown, dayId: string): path is string {
  return typeof path === 'string'
    && UUID.test(dayId)
    && new RegExp(`^mahanaim/${MAHANAIM_RETREAT_SLUG}/${dayId}/[0-9a-f-]{36}\\.pdf$`, 'i').test(path)
}

export function isPdfMagicBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}
