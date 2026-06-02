'use client'

import { useState } from 'react'
import { MessageCircle, Facebook, Twitter, Send, Linkedin, Mail, Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  url: string
  title: string
  /** Texte/description optionnel ajouté au partage (X, email, WhatsApp). */
  text?: string
  /** Variante compacte : icônes seules, plus dense. */
  compact?: boolean
  className?: string
}

/**
 * Boutons de partage social réutilisables.
 * Réseaux : WhatsApp, Facebook, X, Telegram, LinkedIn + email + copie de lien.
 * (Instagram/TikTok n'exposent pas de lien de partage web — volontairement absents.)
 */
export default function ShareButtons({ url, title, text, compact = false, className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encUrl = encodeURIComponent(url)
  const encTitle = encodeURIComponent(title)
  const shareText = text ? `${title} — ${text}` : title

  const links = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
      Icon: MessageCircle,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      Icon: Facebook,
    },
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encUrl}&text=${encodeURIComponent(shareText)}`,
      Icon: Twitter,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(shareText)}`,
      Icon: Send,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
      Icon: Linkedin,
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encTitle}&body=${encodeURIComponent(`${shareText}\n\n${url}`)}`,
      Icon: Mail,
    },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const pill =
    'inline-flex items-center gap-2 rounded-full border border-pearl/15 bg-pearl/5 px-4 py-2 text-sm font-inter text-pearl/80 transition-colors hover:border-gold/40 hover:bg-gold/10 hover:text-gold'
  const iconOnly =
    'inline-flex items-center justify-center rounded-full border border-pearl/15 bg-pearl/5 h-9 w-9 text-pearl/80 transition-colors hover:border-gold/40 hover:bg-gold/10 hover:text-gold'
  const cls = compact ? iconOnly : pill

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {!compact && (
        <span className="text-xs uppercase tracking-wider text-pearl/40 font-inter">Partager</span>
      )}

      {links.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cls}
          aria-label={`Partager sur ${label}`}
          title={`Partager sur ${label}`}
        >
          <Icon className="h-4 w-4" />
          {!compact && <span className="hidden sm:inline">{label}</span>}
        </a>
      ))}

      <button
        type="button"
        onClick={copyLink}
        className={cls}
        aria-label="Copier le lien"
        title="Copier le lien"
      >
        {copied ? <Check className="h-4 w-4 text-gold" /> : <Link2 className="h-4 w-4" />}
        {!compact && <span className="hidden sm:inline">{copied ? 'Lien copié' : 'Copier le lien'}</span>}
      </button>
    </div>
  )
}
