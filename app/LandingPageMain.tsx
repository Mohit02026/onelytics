'use client'

import dynamic from 'next/dynamic'
import BaseLandingPage from '@/components/landing/BaseLandingPage'

const HeroScene = dynamic(() => import('@/components/landing/GalaxyNovaScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full" style={{
      background: 'radial-gradient(ellipse 70% 70% at 55% 50%, rgba(37,99,235,0.07) 0%, transparent 70%)',
    }} />
  ),
})

export default function LandingPageMain() {
  return (
    <BaseLandingPage
      HeroScene={HeroScene}
      heroBg="#f0f4ff"
      heroGlow="rgba(37,99,235,0.09)"
      canvasStyle={{ filter: 'drop-shadow(0 0 28px rgba(37,99,235,0.22))' }}
      label="Built for marketing agencies"
    />
  )
}
