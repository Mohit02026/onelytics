import dynamic from 'next/dynamic'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Onelytics — Unified Marketing Analytics',
  description: 'Connect GA4, Google Ads, Search Console, Meta, and more. All your marketing data in one smart dashboard.',
}

const LandingPage = dynamic(() => import('./LandingPageMain'), { ssr: false })

export default function Page() {
  return <LandingPage />
}
