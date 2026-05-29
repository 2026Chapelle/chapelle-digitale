import type { Metadata } from 'next'
import { HeroSection } from '@/components/sections/HeroSection'
import { PlatformsSection } from '@/components/sections/PlatformsSection'
import { ImpactSection } from '@/components/sections/ImpactSection'
import { LiveSection } from '@/components/sections/LiveSection'
import { FormationsSection } from '@/components/sections/FormationsSection'
import { TestimonialsSection } from '@/components/sections/TestimonialsSection'
import { PrayerSection } from '@/components/sections/PrayerSection'
import { JoinSection } from '@/components/sections/JoinSection'
import { PodcastSection } from '@/components/sections/PodcastSection'

export const metadata: Metadata = {
  title: 'La Chapelle Internationale des Élus du Royaume — Une Église Ouverte au Monde',
  description: 'Rejoignez des milliers de croyants dans la plus grande église digitale francophone. Cultes en direct, formations bibliques, communauté mondiale, prière 24/7.',
}

export default function HomePage() {
  return (
    <div className="bg-charbon relative">
      <HeroSection />
      <LiveSection />
      <PlatformsSection />
      <ImpactSection />
      <FormationsSection />
      <PrayerSection />
      <TestimonialsSection />
      <PodcastSection />
      <JoinSection />
    </div>
  )
}
