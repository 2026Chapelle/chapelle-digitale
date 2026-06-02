import { GivingProductsGrid } from '@/components/features/giving/GivingProductsGrid'
import { Crown, Shield, Check } from 'lucide-react'

export const metadata = {
  title: 'Partenariat — Citadelle du Royaume',
  description: 'Devenez partenaire bâtisseur du Royaume.',
}

const AVANTAGES = [
  'Lettre prophétique mensuelle',
  'Accès aux rencontres partenaires',
  'Contenus de leadership premium',
  'Accompagnement pastoral dédié',
]

export default function PartenariatPage() {
  return (
    <div className="min-h-screen bg-abyss pt-20">
      <div className="relative border-b border-pearl/5 pb-16 pt-16">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal text-center">
          <div className="section-label justify-center mb-4"><Crown className="w-3 h-3" /> Partenariat</div>
          <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
            Devenir
            <span className="text-gradient-gold block">partenaire du Royaume</span>
          </h1>
          <p className="text-pearl/50 font-inter text-lg max-w-2xl mx-auto">
            Rejoignez les bâtisseurs qui soutiennent la vision avec constance et engagement.
          </p>
        </div>
      </div>

      <div className="container-royal py-16">
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <GivingProductsGrid page="partenariat" columns={2} />
          </div>
          <div className="lg:col-span-2 card-royal">
            <h3 className="font-cinzel text-base font-bold text-pearl mb-4">Ce que reçoivent nos partenaires</h3>
            <ul className="space-y-3">
              {AVANTAGES.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-sm font-inter text-pearl/65">
                  <Check className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 mt-6 text-xs text-pearl/30">
              <Shield className="w-3.5 h-3.5 text-green-400" />
              <span>Paiement sécurisé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
