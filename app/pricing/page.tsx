'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'

const plans = [
  {
    name: 'Solo',
    monthly: 29,
    annual: 24,
    desc: 'Perfect for freelancers managing one client.',
    highlight: false,
    features: [
      '1 workspace',
      '5 platform integrations',
      'Unified dashboard',
      'Monthly reports (PDF)',
      'Email support',
      '6-month data history',
    ],
  },
  {
    name: 'Agency',
    monthly: 99,
    annual: 79,
    desc: 'Everything you need to run a growing agency.',
    highlight: true,
    features: [
      '10 workspaces',
      'All platform integrations',
      'Unified dashboard',
      'AI-powered PDF reports',
      'White-label reports',
      '24-month data history',
      'Priority email support',
      'Multi-user access',
    ],
  },
  {
    name: 'Scale',
    monthly: 249,
    annual: 199,
    desc: 'For established agencies managing high-spend accounts.',
    highlight: false,
    features: [
      'Unlimited workspaces',
      'All platform integrations',
      'Unified dashboard',
      'AI-powered PDF reports',
      'White-label reports',
      'Unlimited data history',
      'Dedicated account manager',
      'Custom integrations on request',
      'SLA guarantee',
    ],
  },
]

const faqs = [
  {
    q: 'Can I change plans later?',
    a: 'Yes — upgrade or downgrade at any time. Changes apply at the start of the next billing cycle.',
  },
  {
    q: 'What counts as a workspace?',
    a: 'One workspace = one client or brand. Each workspace has its own integrations, dashboard, and report history.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. All plans include a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What integrations are included?',
    a: 'Google Analytics 4, Google Ads, Search Console, Google Business Profile, Meta Ads, TikTok Ads, LinkedIn Ads, and WordPress.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If you cancel within 7 days of your first paid charge, we will issue a full refund. After that, refunds are not available.',
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen text-gray-900" style={{ fontFamily: 'var(--font-sans)', background: 'linear-gradient(180deg, #E8EFFE 0%, #EEF2FF 20%, #F0F5FF 60%, #EBF0FF 100%)' }}>

      {/* NAV */}
      <nav className="h-16 border-b border-blue-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-sm leading-none">O</span>
            </div>
            <span className="font-bold text-gray-900 text-[1.1rem] tracking-tight">Onelytics</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
          Simple, transparent pricing
        </div>
        <h1
          className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight mb-4"
          style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}
        >
          Plans that grow{' '}
          <span style={{ background: 'linear-gradient(130deg, #2563EB 0%, #3B82F6 50%, #1D4ED8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            with your agency
          </span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
          Start free. Upgrade when you need more workspaces or power features. No hidden fees.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-3 bg-white/80 border border-blue-100 rounded-full p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Annual
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Save 20%</span>
          </button>
        </div>
      </section>

      {/* PLANS */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-7 flex flex-col gap-5 transition-all ${
                plan.highlight
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200/60 scale-[1.02]'
                  : 'bg-white/80 border-blue-100 hover:border-blue-300 hover:shadow-md backdrop-blur-sm'
              }`}
            >
              {plan.highlight && (
                <span className="text-[10px] font-extrabold bg-white/20 text-white px-2.5 py-1 rounded-full self-start uppercase tracking-wider">
                  Most popular
                </span>
              )}
              <div>
                <h2 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h2>
                <p className={`text-sm ${plan.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{plan.desc}</p>
              </div>
              <div>
                <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}>
                  ${annual ? plan.annual : plan.monthly}
                </span>
                <span className={`text-sm ml-1 ${plan.highlight ? 'text-blue-100' : 'text-gray-400'}`}>/mo</span>
                {annual && (
                  <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-blue-100' : 'text-gray-400'}`}>
                    Billed annually (${(annual ? plan.annual : plan.monthly) * 12}/yr)
                  </p>
                )}
              </div>
              <Link
                href="/register"
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Start free trial
                <ChevronRight className="w-4 h-4" />
              </Link>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-blue-500'}`} />
                    <span className={plan.highlight ? 'text-blue-50' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-blue-100">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-2xl font-bold text-gray-900 text-center mb-12"
            style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}
          >
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-[10px]">O</span>
            </div>
            <span className="text-white font-bold text-sm">Onelytics</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-xs">&copy; 2025 Onelytics. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
