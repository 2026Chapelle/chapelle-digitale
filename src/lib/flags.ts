/**
 * Nom de pays (français) → emoji drapeau. Couvre les nations prioritaires de la
 * Chapelle (Afrique + diaspora) ; repli 🌍 pour les autres. Aucune dépendance.
 */
const FLAGS: Record<string, string> = {
  'congo (rdc)': '🇨🇩', 'rdc': '🇨🇩', 'congo (brazzaville)': '🇨🇬', 'congo': '🇨🇬',
  "côte d'ivoire": '🇨🇮', 'cote d ivoire': '🇨🇮', 'cameroun': '🇨🇲', 'sénégal': '🇸🇳', 'senegal': '🇸🇳',
  'mali': '🇲🇱', 'burkina faso': '🇧🇫', 'gabon': '🇬🇦', 'togo': '🇹🇬', 'bénin': '🇧🇯', 'benin': '🇧🇯',
  'niger': '🇳🇪', 'guinée': '🇬🇳', 'guinee': '🇬🇳', 'madagascar': '🇲🇬', 'rwanda': '🇷🇼', 'burundi': '🇧🇮',
  'centrafrique': '🇨🇫', 'tchad': '🇹🇩', 'comores': '🇰🇲', 'djibouti': '🇩🇯', 'mauritanie': '🇲🇷',
  'seychelles': '🇸🇨', 'nigeria': '🇳🇬', 'ghana': '🇬🇭', 'kenya': '🇰🇪', 'afrique du sud': '🇿🇦',
  'angola': '🇦🇴', 'maroc': '🇲🇦', 'algérie': '🇩🇿', 'algerie': '🇩🇿', 'tunisie': '🇹🇳',
  'france': '🇫🇷', 'belgique': '🇧🇪', 'suisse': '🇨🇭', 'canada': '🇨🇦', 'usa': '🇺🇸', 'états-unis': '🇺🇸', 'etats-unis': '🇺🇸',
  'royaume-uni': '🇬🇧', 'luxembourg': '🇱🇺', 'pays-bas': '🇳🇱', 'allemagne': '🇩🇪', 'espagne': '🇪🇸',
  'portugal': '🇵🇹', 'italie': '🇮🇹', 'australie': '🇦🇺', 'brésil': '🇧🇷', 'bresil': '🇧🇷', 'dubaï': '🇦🇪', 'dubai': '🇦🇪',
}

export function flagOf(pays?: string): string {
  if (!pays) return '🌍'
  return FLAGS[pays.trim().toLowerCase()] ?? '🌍'
}
