/**
 * Configuration de navigation ADMIN (V2.5-C-①) — source unique, structurée en sections.
 *
 * But : réduire la surcharge de la sidebar (48 liens plats → sections rétractables) SANS
 * changer l'auth, sans SQL, sans sécurité RBAC réelle. TOUS les liens existants sont
 * conservés, chacun exactement une fois (cf. tests admin-nav.test.ts).
 *
 * ⚠️ Les métadonnées `roles` / `permission` / `sensitive` / `scopeHint` sont INERTES à ce
 * stade : elles ne filtrent RIEN et ne sécurisent RIEN. Elles préparent seulement le futur
 * socle d'identité/rôle admin (V2.5-C-②). Masquer un lien n'est pas une protection ; la
 * vraie garde reste au niveau des routes/API (isAdminRequest).
 */
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Heart, BookOpen, Calendar, Settings,
  Inbox, Film, FileText, TrendingUp, Radio, Mic,
  MessageSquare, HandCoins, Newspaper, Mail, AtSign,
  GraduationCap, Layers, Route, Sparkles, Globe, Activity, Crown, ShoppingBag,
  Command, Globe2, HeartHandshake, ShieldCheck, Megaphone, CalendarCheck, LifeBuoy, UserPlus, Star,
} from 'lucide-react'

export type AdminScopeHint = 'global' | 'national' | 'antenne' | 'local' | 'plateforme'

export interface AdminNavItem {
  label: string
  href: string
  icon: LucideIcon
  color: string
  // ── métadonnées INERTES (futur socle, aucune sécurité aujourd'hui) ──
  roles?: string[]
  permission?: string
  sensitive?: boolean
  scopeHint?: AdminScopeHint
}

export interface AdminNavSection {
  id: string
  label: string
  icon: LucideIcon
  items: AdminNavItem[]
  defaultOpen?: boolean
  sensitive?: boolean
}

/** Élément épinglé, toujours visible (hors sections rétractables). */
export const PINNED_DASHBOARD: AdminNavItem = {
  label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, color: '#D4AF37',
}

export const NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'pilotage', label: 'Pilotage', icon: Command, sensitive: true,
    items: [
      { label: 'Centre de Commandement', href: '/admin/command-center', icon: Command, color: '#F5E6A7', sensitive: true, scopeHint: 'global' },
      { label: 'Commandement Global', href: '/admin/global-command', icon: Globe2, color: '#F5E6A7', sensitive: true, scopeHint: 'global' },
      { label: 'Gouvernement pastoral', href: '/admin/gouvernement', icon: Crown, color: '#F5E6A7', scopeHint: 'national' },
      { label: 'Gouvernance', href: '/admin/gouvernance', icon: Sparkles, color: '#D4AF37' },
      { label: 'Activités (traçabilité)', href: '/admin/activites', icon: Activity, color: '#D4AF37', sensitive: true },
    ],
  },
  {
    id: 'pastoral', label: 'Pastoral & Accueil', icon: HeartHandshake, defaultOpen: true,
    items: [
      { label: 'Centre Pastoral', href: '/admin/pastoral', icon: HeartHandshake, color: '#EC4899' },
      { label: 'Demandes Nouveau Venu', href: '/admin/nouveaux-venus', icon: UserPlus, color: '#0EA5E9', scopeHint: 'local' },
      { label: 'Intelligence Pastorale', href: '/admin/intelligence-pastorale', icon: Sparkles, color: '#8B5CF6', scopeHint: 'local' },
      { label: 'Santé spirituelle', href: '/admin/sante-spirituelle', icon: TrendingUp, color: '#EC4899' },
      { label: "Cure d'âme", href: '/admin/delivrance', icon: Heart, color: '#14B8A6', sensitive: true },
    ],
  },
  {
    id: 'communaute', label: 'Communauté', icon: Users, defaultOpen: true,
    items: [
      { label: 'Membres', href: '/admin/membres', icon: Users, color: '#60A5FA' },
      { label: 'Groupes', href: '/admin/groupes', icon: Users, color: '#F59E0B', scopeHint: 'local' },
      { label: 'Réunions & Présences', href: '/admin/reunions', icon: CalendarCheck, color: '#14B8A6', scopeHint: 'local' },
      { label: 'Événements', href: '/admin/evenements', icon: Calendar, color: '#F59E0B' },
      { label: 'Inscriptions', href: '/admin/inscriptions', icon: Calendar, color: '#FBBF24' },
      { label: 'Intégration', href: '/admin/tunnel-integration', icon: Route, color: '#818CF8' },
    ],
  },
  {
    id: 'geo', label: 'Géographie & Nations', icon: Globe,
    items: [
      { label: 'International', href: '/admin/international', icon: Globe, color: '#22C55E', scopeHint: 'global' },
      { label: 'Dashboard par nation', href: '/admin/nation-dashboard', icon: Globe, color: '#0EA5E9', scopeHint: 'national' },
      { label: 'Cartographie', href: '/admin/cartographie', icon: Globe, color: '#0EA5E9' },
    ],
  },
  {
    id: 'contenu', label: 'Contenu & CMS', icon: FileText,
    items: [
      { label: 'Accueil (sections)', href: '/admin/homepage-blocks', icon: LayoutDashboard, color: '#D4AF37' },
      { label: 'Contenus en vedette', href: '/admin/contenus-en-vedette', icon: Star, color: '#FBBF24' },
      { label: 'Pages', href: '/admin/pages', icon: FileText, color: '#14B8A6' },
      { label: 'Articles', href: '/admin/articles', icon: Newspaper, color: '#34D399' },
      { label: 'Médias', href: '/admin/medias', icon: Film, color: '#EF4444' },
      { label: 'Lives & Cultes', href: '/admin/lives', icon: Radio, color: '#F43F5E' },
      { label: 'Podcasts', href: '/admin/podcasts', icon: Mic, color: '#A855F7' },
      { label: 'Témoignages', href: '/admin/temoignages', icon: MessageSquare, color: '#22C55E' },
    ],
  },
  {
    id: 'academie', label: 'Académie & Formation', icon: GraduationCap,
    items: [
      { label: 'Enseignements', href: '/admin/enseignements', icon: BookOpen, color: '#8B5CF6' },
      { label: 'Formations', href: '/admin/formations', icon: GraduationCap, color: '#0EA5E9' },
      { label: 'Modules', href: '/admin/modules', icon: Layers, color: '#06B6D4' },
      { label: 'Parcours', href: '/admin/parcours', icon: Route, color: '#A855F7' },
      { label: 'Questions formations', href: '/admin/questions-formations', icon: MessageSquare, color: '#0EA5E9' },
    ],
  },
  {
    id: 'spirituel', label: 'Vie spirituelle', icon: Heart,
    items: [
      { label: 'Prières', href: '/admin/prieres', icon: Heart, color: '#F472B6' },
      { label: 'Prières & Guides', href: '/admin/prieres-guides', icon: BookOpen, color: '#8B5CF6' },
      { label: 'Témoignages exaucés', href: '/admin/temoignages-prieres', icon: Sparkles, color: '#FBBF24' },
    ],
  },
  {
    id: 'finances', label: 'Finances & Dons', icon: HandCoins, sensitive: true,
    items: [
      { label: 'Dons & Offrandes', href: '/admin/dons', icon: HandCoins, color: '#EAB308', sensitive: true },
      { label: 'Transactions', href: '/admin/transactions', icon: HandCoins, color: '#F59E0B', sensitive: true },
      { label: 'Marketplace', href: '/admin/marketplace', icon: ShoppingBag, color: '#D4AF37' },
    ],
  },
  {
    id: 'communication', label: 'Communication', icon: Megaphone,
    items: [
      { label: 'Centre Communication', href: '/admin/communication', icon: Megaphone, color: '#EC4899' },
      { label: 'Messages', href: '/admin/messages', icon: Mail, color: '#38BDF8' },
      { label: 'Newsletter', href: '/admin/newsletter', icon: AtSign, color: '#FB7185' },
      { label: 'Notifications', href: '/admin/notifications', icon: Inbox, color: '#FB7185' },
    ],
  },
  {
    id: 'systeme', label: 'Système & Paramètres', icon: Settings, sensitive: true,
    items: [
      { label: 'Rôles & accès', href: '/admin/roles', icon: ShieldCheck, color: '#22C55E', sensitive: true },
      { label: 'Formulaires', href: '/admin/formulaires', icon: Inbox, color: '#6366F1' },
      { label: 'Statistiques', href: '/admin/statistiques', icon: TrendingUp, color: '#34D399' },
      { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp, color: '#0EA5E9' },
      { label: 'Paramètres', href: '/admin/parametres', icon: Settings, color: '#64748B', sensitive: true },
      { label: "Centre d'aide", href: '/admin/aide', icon: LifeBuoy, color: '#D4AF37' },
    ],
  },
]

/** Tous les items (Dashboard épinglé + sections), utile pour tests/contrôles. */
export function allNavHrefs(): string[] {
  return [PINNED_DASHBOARD.href, ...NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href))]
}
