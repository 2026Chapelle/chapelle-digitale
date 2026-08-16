/**
 * Section « Expérience pastorale quotidienne » (V2.7-A) — PRÉSENTATION SEULEMENT.
 *   - Teaser rappels / notifications (Web Push À VENIR, aucune permission demandée ici).
 *   - Teaser sécurité moderne / passkeys (aucune modif auth, formulation prudente).
 * Composant serveur statique (aucune interaction, aucune donnée fictive envoyée).
 */
import { Bell, ShieldCheck, Clock } from 'lucide-react'

const REMINDERS = [
  'Rappel : Culte ce dimanche à 10h30',
  'Votre parcours Nouveau Croyant est disponible',
  'Temps de prière ce vendredi à 05h30',
  'Un nouvel enseignement est disponible',
]

export function PastoralAppSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-royal grid lg:grid-cols-2 gap-8">
        {/* Rappels pastoraux (à venir) */}
        <div className="card-royal p-7 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
            <Bell className="w-3.5 h-3.5" /> Bientôt disponible
          </div>
          <h2 className="font-cinzel font-bold text-xl sm:text-2xl leading-tight mb-3">
            Recevez les rappels qui nourrissent votre vie spirituelle
          </h2>
          <p className="font-inter text-sm text-pearl/65 leading-relaxed mb-6">
            Bientôt, Citadelle pourra vous accompagner avec des rappels de culte, de prière, de formation, d&apos;événement et de parcours pastoral.
          </p>
          <div className="space-y-2.5">
            {REMINDERS.map((r) => (
              <div key={r} className="flex items-center gap-3 rounded-xl px-3.5 py-3 border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <Clock className="w-3.5 h-3.5 text-gold" />
                </span>
                <div className="min-w-0">
                  <p className="font-inter text-[13px] text-pearl/85 leading-snug">{r}</p>
                  <p className="font-inter text-[10px] text-pearl/35">Citadelle · aperçu</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-inter text-pearl/35">Module en préparation — aucune notification n&apos;est envoyée pour l&apos;instant.</p>
        </div>

        {/* Sécurité moderne (prudent) */}
        <div className="card-royal p-7 sm:p-8 flex flex-col">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Confiance
          </div>
          <h2 className="font-cinzel font-bold text-xl sm:text-2xl leading-tight mb-3">
            Une plateforme moderne, pensée pour la confiance
          </h2>
          <p className="font-inter text-sm text-pearl/65 leading-relaxed mb-6">
            Citadelle évolue vers une expérience plus simple et plus sécurisée, avec des accès renforcés pour les responsables, les espaces membres et les données pastorales sensibles.
          </p>
          <ul className="space-y-3 text-sm font-inter text-pearl/75 mb-6">
            <li className="flex items-start gap-3"><ShieldCheck className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> Accès sécurisé et gestion des rôles</li>
            <li className="flex items-start gap-3"><ShieldCheck className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> Protection des espaces membres et pastoraux</li>
            <li className="flex items-start gap-3"><ShieldCheck className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> Préparation aux connexions modernes (biométrie / passkeys)</li>
          </ul>
          <p className="mt-auto text-[11px] font-inter text-pearl/35">La biométrie / passkeys est en préparation et n&apos;est pas encore active.</p>
        </div>
      </div>
    </section>
  )
}
