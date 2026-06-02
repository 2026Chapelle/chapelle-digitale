import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format dates in French
export function formatDate(date: string | Date, fmt = 'dd MMMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: fr })
}

export function formatRelativeDate(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: fr })
}

// Format currency
export function formatCurrency(amount: number, devise = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: devise,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format numbers
export function formatNumber(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

// Truncate text
export function truncate(text: string, length = 100) {
  if (text.length <= length) return text
  return text.substring(0, length).trim() + '…'
}

// Slug generator
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Generate initials
export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Random ID
export function generateId(prefix = '') {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Scroll to element
export function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    const navHeight = 80
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Share URL
export function getShareUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'
  return `${baseUrl}${path}`
}

// Local storage helpers (SSR safe)
export const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch { return null }
  },
  set: <T>(key: string, value: T) => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return
    try { localStorage.removeItem(key) } catch { /* noop */ }
  },
}

// Engagement score calculator
export function calculateEngagementScore(data: {
  logins_last30days: number
  formations_completed: number
  events_attended: number
  prayers_submitted: number
  donations_count: number
  live_watched: number
}) {
  let score = 0
  score += Math.min(data.logins_last30days * 2, 20)
  score += Math.min(data.formations_completed * 10, 30)
  score += Math.min(data.events_attended * 5, 20)
  score += Math.min(data.prayers_submitted * 3, 15)
  score += Math.min(data.donations_count * 5, 25)
  score += Math.min(data.live_watched * 2, 20)
  return Math.min(score, 100)
}

// Color for engagement score
export function getScoreColor(score: number) {
  if (score >= 80) return '#D4AF37'
  if (score >= 60) return '#10B981'
  if (score >= 40) return '#F59E0B'
  if (score >= 20) return '#818CF8'
  return '#6B7280'
}

// Parse YouTube URL
export function getYouTubeId(url: string) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/))([^?&]+)/
  )
  return match?.[1] ?? null
}

// Is mobile device
export function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
