import { GivingProductsGrid } from '@/components/features/giving/GivingProductsGrid'
import { KeyRound, Shield, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Accès au parcours — Citadelle du Royaume',
  description: 'Accédez au parcours Destinée et engagez votre marche.',
}

const ETAPES = [
  { t: 'Révélation', d: 'Comprendre votre identité et votre appel.' },
  { t: 'Formation', d: 'Recevoir les fondements et grandir en maturité.' },
  { t: 'Activation', d: 'Entrer dans votre destinée et porter du fruit.' },
]

export default function DestineeAccesPage() {
  return (
    <div className="min-h-screen bg-abyss pt-20">
      <div className="relative border-b border-pearl/5 pb-16 pt-16">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal text-center">
          <div className="section-label justify-center mb-4"><KeyRound className="w-3 h-3" /> Parcours Destinée</div>
          <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
            Accéder au
            <span className="text-gradient-gold block">parcours Destinée</span>
          </h1>
          <p className="text-pearl/50 font-inter text-lg max-w-2xl mx-auto">
            Un cheminement structuré pour révéler et activer votre appel.
          </p>
        </div>
      </div>

      <div className="container-royal py-16">
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 space-y-4">
            {ETAPES.map((e, i) => (
              <div key={e.t} className="card-royal flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-cinzel font-bold text-gold" style={{ background: 'rgba(212,175,55,0.12)' }}>
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-1">{e.t}</h3>
                  <p className="font-inter text-sm text-pearl/50">{e.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="card-royal text-center mb-4">
              <Sparkles className="w-5 h-5 text-gold mx-auto mb-2" />
              <p className="font-cormorant italic text-pearl/60 text-sm">
                « Car je connais les projets que j’ai formés sur vous. » — Jérémie 29:11
              </p>
            </div>
            <GivingProductsGrid page="destinee-acces" columns={2} />
            <div className="flex items-center justify-center gap-2 mt-5 text-xs text-pearl/30">
              <Shield className="w-3.5 h-3.5 text-green-400" />
              <span>Paiement sécurisé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
