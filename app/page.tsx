'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart2, FileText, RefreshCw, Building2, ChevronRight, Check } from 'lucide-react'

const PLATFORMS = [
  { name: 'Google Analytics', abbr: 'GA4', color: '#F9AB00', bg: '#FFF8E1' },
  { name: 'Google Ads',       abbr: 'Ads', color: '#4285F4', bg: '#E8F0FE' },
  { name: 'Search Console',   abbr: 'GSC', color: '#34A853', bg: '#E6F4EA' },
  { name: 'Meta Ads',         abbr: 'Meta',color: '#1877F2', bg: '#E7F3FF' },
  { name: 'TikTok Ads',       abbr: 'TT',  color: '#FF0050', bg: '#FFF0F4' },
  { name: 'LinkedIn Ads',     abbr: 'LI',  color: '#0A66C2', bg: '#E1ECFA' },
  { name: 'Google Business',  abbr: 'GBP', color: '#EA4335', bg: '#FDE8E7' },
  { name: 'WordPress',        abbr: 'WP',  color: '#21759B', bg: '#E1EFF5' },
]

const FEATURES = [
  { icon: BarChart2, title: 'Unified overview',    desc: 'All paid and organic channels in one view. Spot growth drivers and budget drains at a glance.'                    },
  { icon: FileText,  title: 'AI-powered reports',  desc: 'Generate branded PDF reports with an AI narrative in seconds. Share professionally, not painfully.'               },
  { icon: RefreshCw, title: 'Automatic sync',      desc: 'Data refreshes every 24 hours. No manual CSV exports, no outdated numbers.'                                       },
  { icon: Building2, title: 'Multi-workspace',     desc: 'Manage multiple clients from one login. Each workspace is fully isolated and secure.'                             },
]

const STEPS = [
  { title: 'Connect your tools',   desc: 'OAuth in one click for Google, Meta, TikTok, LinkedIn and more — no API keys needed.'               },
  { title: 'See the full picture', desc: 'Your unified dashboard is ready instantly. All your metrics, one clean view.'                        },
  { title: 'Report to clients',    desc: 'Generate AI-powered PDFs with your brand in minutes. Impress clients, not overwhelm them.'           },
]

const BG_ICONS = [
  { symbol: 'G',   color: '#4285F4', size: 50, top: '8%',  left: '2%',    anim: 'bgi1', delay: '0s',   dur: '7s'   },
  { symbol: 'f',   color: '#1877F2', size: 42, top: '28%', left: '1%',    anim: 'bgi2', delay: '1.2s', dur: '9s'   },
  { symbol: 'M',   color: '#0081FB', size: 38, top: '62%', left: '2.5%',  anim: 'bgi3', delay: '0.5s', dur: '6s'   },
  { symbol: 'TT',  color: '#FF0050', size: 36, top: '80%', left: '5%',    anim: 'bgi4', delay: '2s',   dur: '8s'   },
  { symbol: 'in',  color: '#0A66C2', size: 44, top: '5%',  right: '3%',   anim: 'bgi2', delay: '0.8s', dur: '10s'  },
  { symbol: 'GA',  color: '#F9AB00', size: 34, top: '30%', right: '2%',   anim: 'bgi1', delay: '1.8s', dur: '7.5s' },
  { symbol: 'WP',  color: '#21759B', size: 38, top: '58%', right: '1.5%', anim: 'bgi3', delay: '0.3s', dur: '9.5s' },
  { symbol: '+',   color: '#2563EB', size: 28, top: '72%', right: '4%',   anim: 'bgi4', delay: '2.5s', dur: '6.5s' },
  { symbol: 'SC',  color: '#34A853', size: 30, top: '18%', left: '8%',    anim: 'bgi4', delay: '3s',   dur: '8s'   },
  { symbol: 'Ads', color: '#EA4335', size: 26, top: '88%', right: '12%',  anim: 'bgi2', delay: '1.5s', dur: '7s'   },
  { symbol: 'X',   color: '#14171A', size: 32, top: '15%', right: '9%',   anim: 'bgi3', delay: '2.2s', dur: '9s'   },
]

const NAV_LINKS = [
  { label: 'Features',      href: '#features'      },
  { label: 'How it works',  href: '#how-it-works'  },
  { label: 'Integrations',  href: '#integrations'  },
  { label: 'Pricing',       href: '/pricing'        },
]

export default function LandingPage() {
  const [scrolled, setScrolled]           = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el))

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id) })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    document.querySelectorAll('section[id]').forEach((s) => sectionObserver.observe(s))

    return () => {
      window.removeEventListener('scroll', onScroll)
      revealObserver.disconnect()
      sectionObserver.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen text-gray-900" style={{ fontFamily: 'var(--font-sans)', background: 'linear-gradient(150deg, #D5E3FF 0%, #E2EEFF 18%, #EAF0FF 40%, #E0EBFF 65%, #D8E6FF 100%)' }}>

      {/* NAV */}
      <nav className={`fixed top-0 inset-x-0 z-50 h-16 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-blue-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-sm leading-none">O</span>
            </div>
            <span className="font-bold text-gray-900 text-[1.1rem] tracking-tight">Onelytics</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center">
              {NAV_LINKS.map((link) => {
                const isActive = link.href.startsWith('#') && activeSection === link.href.slice(1)
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              })}
            </div>
            <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all">Sign in</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 pb-24 px-6 overflow-hidden relative min-h-[92vh] flex items-center">
        {/* Gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '5%', left: '-5%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', animation: 'ol-blob1 12s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '-8%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', animation: 'ol-blob2 15s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '40%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', animation: 'ol-blob3 10s ease-in-out infinite' }} />
        </div>

        {/* Floating platform icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {BG_ICONS.map((icon, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: icon.top,
                left: icon.left,
                right: icon.right,
                width: icon.size,
                height: icon.size,
                borderRadius: '30%',
                background: `${icon.color}28`,
                border: `1.5px solid ${icon.color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: icon.color,
                fontSize: icon.size > 40 ? '16px' : icon.size > 32 ? '13px' : '11px',
                fontWeight: '800',
                opacity: 0.7,
                animation: `${icon.anim} ${icon.dur} ease-in-out ${icon.delay} infinite`,
                backdropFilter: 'blur(2px)',
                boxShadow: `0 4px 16px ${icon.color}18`,
              }}
            >
              {icon.symbol}
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto relative w-full">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Copy */}
            <div className="space-y-6">
              <div className="ol-hero-fade" style={{ animationDelay: '0s' }}>
                <span className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-300 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Built for marketing agencies
                </span>
              </div>

              <div className="ol-hero-fade" style={{ animationDelay: '0.1s' }}>
                <h1 className="text-5xl lg:text-[3.4rem] font-extrabold leading-[1.08] tracking-tight" style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}>
                  All your marketing.<br />
                  <span className="ol-grad-text">One smart dashboard.</span>
                </h1>
              </div>

              <div className="ol-hero-fade" style={{ animationDelay: '0.2s' }}>
                <p className="text-lg text-gray-600 leading-relaxed max-w-[420px]">
                  Connect Google Analytics, Ads, Meta, TikTok, LinkedIn and more. See your full performance picture — no spreadsheets, no back-and-forth.
                </p>
              </div>

              <div className="ol-hero-fade flex flex-wrap gap-3" style={{ animationDelay: '0.3s' }}>
                <Link href="/register" className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-300/50 text-sm">
                  Get started free
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center gap-2 bg-white/80 border border-blue-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:border-blue-400 hover:text-blue-700 transition-all text-sm backdrop-blur-sm">
                  See pricing
                </Link>
              </div>

              <div className="ol-hero-fade flex flex-wrap items-center gap-5" style={{ animationDelay: '0.4s' }}>
                {['No credit card', 'Free trial included', 'Cancel anytime'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup */}
            <div className="hidden lg:flex justify-end">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST MARQUEE */}
      <section className="py-8 border-y border-blue-100/60 overflow-hidden">
        <p className="text-center text-[10px] font-bold text-blue-400 uppercase tracking-[0.18em] mb-5">
          Connects with the tools you already use
        </p>
        <div className="overflow-hidden">
          <div className="ol-marquee">
            {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0 text-gray-500 text-sm font-medium select-none">
                <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: p.bg, color: p.color }}>
                  {p.abbr.slice(0, 2)}
                </div>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '-15%', right: '-6%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)', animation: 'ol-blob2 16s ease-in-out 2s infinite' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 70%)', animation: 'ol-blob3 13s ease-in-out infinite' }} />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14" data-reveal>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}>
              Built for how agencies actually work
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-[1.05rem]">Every tool your team needs to report faster, spot issues sooner, and prove results clearly.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-blue-100 hover:shadow-md hover:border-blue-300 transition-all cursor-default" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '10%', left: '-8%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', animation: 'ol-blob1 14s ease-in-out 1s infinite' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '-6%', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', animation: 'ol-blob3 11s ease-in-out 3s infinite' }} />
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14" data-reveal>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}>
              Up and running in minutes
            </h2>
            <p className="text-gray-500">No complex setup. No developer needed.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center" data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto mb-4 shadow-md shadow-blue-300/50">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrations" className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '-8%', left: '25%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(147,51,234,0.09) 0%, transparent 70%)', animation: 'ol-blob2 17s ease-in-out 1.5s infinite' }} />
          <div style={{ position: 'absolute', bottom: '-12%', right: '-8%', width: '370px', height: '370px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', animation: 'ol-blob1 12s ease-in-out 4s infinite' }} />
          <div style={{ position: 'absolute', bottom: '20%', left: '-5%', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.11) 0%, transparent 70%)', animation: 'ol-blob3 15s ease-in-out 0.5s infinite' }} />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3" data-reveal style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}>
            Works with every platform you use
          </h2>
          <p className="text-gray-500 mb-12" data-reveal>One-click OAuth — no API keys, no developer required.</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-5 justify-items-center" data-reveal>
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-transform duration-200 group-hover:scale-110 shadow-sm" style={{ background: p.bg, color: p.color }}>
                  {p.abbr.slice(0, 2)}
                </div>
                <span className="text-[10px] text-gray-400 hidden sm:block leading-tight text-center">
                  {p.name.replace(' Ads', '').replace(' Analytics', '').replace(' Business', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto" data-reveal>
          <div
            className="relative overflow-hidden rounded-3xl px-10 py-16 text-center"
            style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)', boxShadow: '0 24px 64px rgba(37,99,235,0.28)' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', bottom: '-40%', left: '-8%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-jakarta, var(--font-sans))' }}>
                Ready to see the full picture?
              </h2>
              <p className="text-blue-100 text-lg mb-10">Start your free trial. No credit card required.</p>
              <div className="flex justify-center gap-4 flex-wrap">
                <Link href="/register" className="bg-white text-blue-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
                  Get started free
                </Link>
                <Link href="/pricing" className="bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/25 hover:bg-white/20 transition-colors text-sm">
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-extrabold text-xs">O</span>
                </div>
                <span className="text-white font-bold text-base">Onelytics</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">Unified marketing analytics for agencies and performance-driven teams.</p>
            </div>
            <div className="flex gap-10 text-sm">
              <div className="space-y-3">
                <p className="text-white font-semibold text-sm">Product</p>
                <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                <Link href="/login" className="block hover:text-white transition-colors">Sign in</Link>
                <Link href="/register" className="block hover:text-white transition-colors">Get started</Link>
              </div>
              <div className="space-y-3">
                <p className="text-white font-semibold text-sm">Legal</p>
                <Link href="/privacy" className="block hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="block hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-xs text-center">
            &copy; 2025 Onelytics. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}

function DashboardMockup() {
  return (
    <div
      className="w-[420px] rounded-2xl overflow-hidden border border-blue-200/60"
      style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 25px 60px rgba(37,99,235,0.2), 0 8px 24px rgba(37,99,235,0.1)' }}
    >
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5" style={{ background: 'rgba(248,250,255,0.95)' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="text-[10px] text-gray-400 ml-3 font-mono">app.onelytics.io/dashboard</span>
      </div>
      <div className="flex" style={{ height: 280 }}>
        <div className="w-11 bg-gray-900 flex flex-col items-center pt-4 gap-3 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-blue-600" />
          {[0, 1, 2, 3].map((i) => <div key={i} className="w-5 h-5 rounded bg-gray-700" />)}
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-hidden" style={{ background: '#F5F8FF' }}>
          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Overview — last 30 days</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Ad Spend', v: '$12.4K', c: '#2563EB' },
              { l: 'Clicks',   v: '8.3K',  c: '#16A34A' },
              { l: 'Conv.',    v: '143',   c: '#9333EA' },
              { l: 'ROAS',     v: '3.2x',  c: '#EA580C' },
            ].map((m) => (
              <div key={m.l} className="bg-white rounded-lg p-2 border border-blue-100">
                <p className="text-[7px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{m.l}</p>
                <p className="text-xs font-bold" style={{ color: m.c }}>{m.v}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-3 border border-blue-100">
            <p className="text-[8px] text-gray-400 mb-2 font-medium">Daily Ad Spend</p>
            <div className="flex items-end gap-0.5 h-16">
              {[38, 52, 43, 61, 58, 74, 55, 68, 71, 82, 66, 90, 78, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: `rgba(37,99,235,${0.2 + h / 200})` }} />
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Google', 'Meta', 'TikTok', 'LinkedIn'].map((p) => (
              <span key={p} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold border border-blue-100">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
