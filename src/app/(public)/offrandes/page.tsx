import { GivingProductsGrid } from '@/components/features/giving/GivingProductsGrid'
import { Flower2, Shield } from 'lucide-react'

export const metadata = {
  title: 'Offrandes — Citadelle du Royaume',
  description: 'Apportez votre offrande et semez dans le Royaume.',
}

export default function OffrandesPage() {
  return (
    <div className="min-h-screen bg-abyss pt-20">
      <div className="relative border-b border-pearl/5 pb-16 pt-16">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal text-center">
          <div className="section-label justify-center mb-4"><Flower2 className="w-3 h-3" /> Offrande</div>
          <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
            Apporter une
            <span className="text-gradient-gold block">offrande</span>
          </h1>
          <p className="text-pearl/50 font-inter text-lg max-w-2xl mx-auto">
            « Chacun donnera ce qu’il pourra, selon les bénédictions que l’Éternel ton Dieu t’aura accordées. » — Deutéronome 16:17
          </p>
        </div>
      </div>
      <div className="container-royal py-16 max-w-4xl">
        <GivingProductsGrid />
        <div className="flex items-center justify-center gap-3 mt-8 text-xs text-pearl/30">
          <Shield className="w-3.5 h-3.5 text-green-400" />
          <span>Paiement sécurisé • Aucune donnée bancaire stockée sur ce site</span>
        </div>
      </div>
    </div>
  )
}
