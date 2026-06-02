'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ArrowRight, CheckCircle, Send } from 'lucide-react'

const MISSIONS = [
  {
    id: 'accueil',
    emoji: '👋',
    titre: 'Équipe Accueil',
    desc: 'Accueillir les nouveaux membres lors des cultes en ligne et en présentiel. Être le premier visage de la CIER.',
    couleur: '#D4AF37',
    engagement: '2h/semaine',
    requis: ['Sens du relationnel', 'Disponible en semaine ou weekend', 'Maîtrise du français'],
    plateforme: 'CIER Global',
  },
  {
    id: 'production',
    emoji: '🎬',
    titre: 'Équipe Production Live',
    desc: 'Gérer la technique des cultes en streaming : caméras, son, diffusion sur les plateformes digitales.',
    couleur: '#EF4444',
    engagement: '4h/semaine',
    requis: ['Notions techniques (vidéo/son)', 'Disponible le dimanche', 'Fiabilité'],
    plateforme: 'Live & Streaming',
  },
  {
    id: 'formation',
    emoji: '📖',
    titre: 'Assistant(e) de Formation',
    desc: 'Accompagner les apprenants dans leurs formations, animer des sessions de questions-réponses.',
    couleur: '#8B5CF6',
    engagement: '3h/semaine',
    requis: ['Connaissances théologiques de base', 'Pédagogie', 'Patience'],
    plateforme: 'CFIC',
  },
  {
    id: 'intercession',
    emoji: '🙏',
    titre: 'Intercesseur Mahanaïm',
    desc: 'Rejoindre l\'équipe de prière pour intercéder pour les requêtes reçues et les besoins de l\'Église.',
    couleur: '#EC4899',
    engagement: '1h/jour',
    requis: ['Vie de prière personnelle', 'Confidentialité', 'Engagement spiritual'],
    plateforme: 'Mahanaïm',
  },
  {
    id: 'moderation',
    emoji: '🛡️',
    titre: 'Modérateur Communautaire',
    desc: 'Modérer les chats des cultes en live, veiller au respect de la charte communautaire et à la bonne ambiance.',
    couleur: '#0EA5E9',
    engagement: '2h/semaine',
    requis: ['Calme et diplomatie', 'Connaissances de la foi', 'Disponible lors des cultes'],
    plateforme: 'Tous',
  },
  {
    id: 'social',
    emoji: '🌍',
    titre: 'Actions Sociales',
    desc: 'Participer aux missions sociales de la Cité du Refuge : aide alimentaire, accompagnement de familles en difficulté.',
    couleur: '#22C55E',
    engagement: '4h/mois',
    requis: ['Cœur pour les démunis', 'Disponible en semaine', 'Basé en RDC, France ou Belgique'],
    plateforme: 'Cité du Refuge',
  },
]

const VALEURS_BENEVOLE = [
  { titre: 'Servir avec Excellence', desc: 'Chaque service est rendu pour la gloire de Dieu, pas pour les hommes.', emoji: '👑' },
  { titre: 'Fidélité avant tout', desc: 'Un engagement pris est un engagement tenu. La régularité est notre force.', emoji: '🔑' },
  { titre: 'Grandir ensemble', desc: 'Chaque bénévole reçoit une formation et un accompagnement pastoral.', emoji: '🌱' },
  { titre: 'Famille avant tout', desc: 'Vous n\'êtes pas un simple prestataire — vous êtes membre de la famille CIER.', emoji: '💚' },
]

export default function BenevolatPage() {
  const [selectedMission, setSelectedMission] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const mission = MISSIONS.find(m => m.id === selectedMission)

  return (
    <div className="min-h-screen bg-abyss">
      {/* Hero */}
      <div className="relative pt-32 pb-16 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(236,72,153,0.07) 0%, transparent 70%)' }} />
        <div className="relative container-royal text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-label justify-center mb-4">Servir le Royaume</div>
            <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
              Rejoindre
              <span className="text-gradient-gold block">l'Équipe CIER</span>
            </h1>
            <p className="font-inter text-pearl/50 max-w-xl mx-auto mb-8">
              « Chacun doit exercer sur les autres le don de la grâce qu'il a reçu, comme de bons dispensateurs de la grâce multiforme de Dieu. » — 1 Pierre 4:10
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12">

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-14"
        >
          <div className="text-center mb-8">
            <div className="section-label justify-center mb-3">Notre ADN</div>
            <h2 className="font-cinzel text-2xl font-bold text-pearl">Servir avec ces Valeurs</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VALEURS_BENEVOLE.map((v, i) => (
              <motion.div key={v.titre}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="card-royal text-center"
              >
                <div className="text-3xl mb-3">{v.emoji}</div>
                <h3 className="font-cinzel text-xs font-bold text-pearl mb-2">{v.titre}</h3>
                <p className="font-inter text-[11px] text-pearl/40 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Missions */}
        <div className="mb-14">
          <div className="text-center mb-8">
            <div className="section-label justify-center mb-3">Opportunités de Service</div>
            <h2 className="font-cinzel text-2xl font-bold text-pearl">Choisissez votre Mission</h2>
            <p className="text-pearl/40 font-inter text-sm mt-2">Cliquez sur une mission pour candidater</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MISSIONS.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setSelectedMission(m.id === selectedMission ? null : m.id)}
                className="card-royal cursor-pointer group transition-all duration-300 hover:-translate-y-1"
                style={{
                  borderColor: selectedMission === m.id ? `${m.couleur}40` : `${m.couleur}12`,
                  background: selectedMission === m.id ? `${m.couleur}06` : undefined,
                }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${m.couleur}15` }}>
                    {m.emoji}
                  </div>
                  <div>
                    <div className="text-[10px] font-inter mb-0.5" style={{ color: m.couleur }}>{m.plateforme}</div>
                    <h3 className="font-cinzel text-sm font-bold text-pearl">{m.titre}</h3>
                  </div>
                </div>

                <p className="font-inter text-xs text-pearl/50 leading-relaxed mb-4">{m.desc}</p>

                <div className="flex items-center justify-between text-xs font-inter mb-3">
                  <span className="text-pearl/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Engagement
                  </span>
                  <span className="font-semibold" style={{ color: m.couleur }}>{m.engagement}</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {m.requis.map(r => (
                    <span key={r} className="text-[9px] font-inter px-1.5 py-0.5 rounded-full bg-pearl/5 text-pearl/30">
                      {r}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-inter font-semibold"
                  style={{ color: selectedMission === m.id ? m.couleur : 'rgba(255,255,255,0.3)' }}>
                  {selectedMission === m.id ? <CheckCircle className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  {selectedMission === m.id ? 'Sélectionné — remplissez le formulaire' : 'Candidater'}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Application form */}
        <AnimatePresence>
          {selectedMission && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="max-w-2xl mx-auto"
            >
              {submitted ? (
                <div className="card-royal text-center py-12">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-16 h-16 rounded-full bg-green-400/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </motion.div>
                  <h2 className="font-cinzel text-xl font-bold text-pearl mb-3">Candidature reçue !</h2>
                  <p className="font-inter text-sm text-pearl/45">
                    Merci pour votre disponibilité à servir le Royaume. Notre coordinateur bénévole vous contactera sous 72h pour un entretien.
                  </p>
                </div>
              ) : (
                <div className="card-royal" style={{ borderColor: `${mission?.couleur}25` }}>
                  <h2 className="font-cinzel text-base font-bold text-pearl mb-1">
                    Candidater — {mission?.titre}
                  </h2>
                  <p className="text-xs text-pearl/40 font-inter mb-6">
                    {mission?.plateforme} · {mission?.engagement}
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-pearl/40 font-inter uppercase tracking-wider mb-1.5 block">Votre nom *</label>
                        <input type="text" value={nom} onChange={e => setNom(e.target.value)} required
                          placeholder="Prénom & Nom" className="input-royal w-full" />
                      </div>
                      <div>
                        <label className="text-xs text-pearl/40 font-inter uppercase tracking-wider mb-1.5 block">Votre email *</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                          placeholder="votre@email.com" className="input-royal w-full" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-pearl/40 font-inter uppercase tracking-wider mb-1.5 block">Parlez-nous de vous *</label>
                      <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4}
                        placeholder="Votre témoignage, vos expériences de service, pourquoi cette mission vous parle…"
                        className="input-royal w-full resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-gold flex-1 justify-center py-3.5">
                        <Send className="w-4 h-4" />
                        Envoyer ma candidature
                      </button>
                      <button type="button" onClick={() => setSelectedMission(null)}
                        className="btn-ghost px-5">
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
