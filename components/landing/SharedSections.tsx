'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function sparkPath(data: number[], w = 56, h = 18): string {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}


const FEATURE_SVGS = [
  <svg key={0} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="16" height="16" rx="2.5"/><path d="M6 14V10M10 14V7M14 14V11"/></svg>,
  <svg key={1} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 1v2.5M14.6 4.4l-1.8 1.8M17 10h-2.5M14.6 15.6l-1.8-1.8M10 17v2M5.4 15.6l1.8-1.8M3 10h2.5M5.4 4.4l1.8 1.8"/><circle cx="10" cy="10" r="3.5"/></svg>,
  <svg key={2} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="12 2 12 8 18 8"/><line x1="14" y1="13" x2="6" y2="13"/><line x1="14" y1="17" x2="6" y2="17"/></svg>,
  <svg key={3} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="14" height="10" rx="2"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/></svg>,
  <svg key={4} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>,
  <svg key={5} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 9A5.5 5.5 0 0 0 4.5 9c0 5.5-2.5 7-2.5 7h16s-2.5-1.5-2.5-7"/><path d="M12 17a2 2 0 0 1-4 0"/></svg>,
]

const F_COLORS = ['#2563eb', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

const F_SPARKS = [
  [30, 42, 38, 55, 48, 70, 65, 82],
  [20, 35, 28, 50, 62, 55, 72, 88],
  [45, 38, 55, 48, 62, 70, 65, 80],
  [35, 50, 42, 65, 58, 72, 68, 85],
  [25, 38, 52, 45, 60, 55, 68, 78],
  [40, 32, 55, 48, 70, 62, 78, 85],
]

const P_METRICS: [string, string][][] = [
  [['Sessions', '48.2k'], ['Bounce', '38%'], ['Conv', '1.2%']],
  [['Spend', '$24.8k'], ['ROAS', '3.8x'], ['CPC', '$1.24']],
  [['Clicks', '3.2k'], ['Pos #', '4.2'], ['CTR', '6.1%']],
  [['Reach', '180k'], ['CPC', '$0.82'], ['ROAS', '2.4x']],
  [['Views', '4.1k'], ['Calls', '142'], ['Photos', '280']],
  [['Impr', '22k'], ['Clicks', '840'], ['CTR', '3.8%']],
]

const KPI_SPARKS = [
  [58, 62, 55, 70, 65, 78, 88],
  [72, 68, 75, 80, 73, 84, 90],
  [65, 70, 62, 75, 72, 80, 85],
  [55, 62, 68, 72, 78, 82, 88],
]

const FEATURES = [
  { title: 'Unified Dashboard',   desc: 'All your platforms in one view. GA4, Ads, GSC, Meta — no more tab-switching.',   tag: 'Core'    },
  { title: 'AI-Powered Insights', desc: 'Surface anomalies, opportunities, and weekly highlights automatically.',           tag: 'AI'      },
  { title: 'One-Click Reports',   desc: 'Generate branded PDF reports for any client in seconds. Auto-schedule delivery.', tag: 'Reports' },
  { title: 'Client Portals',      desc: 'Password-protected read-only portals with your branding, not ours.',              tag: 'Portals' },
  { title: 'Multi-Workspace',     desc: 'Manage every client from one account. Switch instantly, no re-login.',            tag: 'Agency'  },
  { title: 'Smart Alerts',        desc: 'Slack or email when ROAS tanks, traffic drops, or conversions spike.',            tag: 'Alerts'  },
]

const PLATFORMS = [
  { abbr: 'GA4',  name: 'Google Analytics 4', desc: 'Sessions, events, conversions',   color: '#E8711A' },
  { abbr: 'Ads',  name: 'Google Ads',          desc: 'Spend, ROAS, keywords, QS',       color: '#4285F4' },
  { abbr: 'GSC',  name: 'Search Console',      desc: 'Clicks, impressions, positions',  color: '#34A853' },
  { abbr: 'Meta', name: 'Meta Ads',            desc: 'Campaigns, reach, frequency',     color: '#1877F2' },
  { abbr: 'GBP',  name: 'Google Business',     desc: 'Views, calls, bookings, reviews', color: '#FBBC04' },
  { abbr: 'LI',   name: 'LinkedIn Ads',        desc: 'Impressions, clicks, lead gen',   color: '#0A66C2' },
]

const MARQUEE = ['Google Analytics 4', 'Google Ads', 'Search Console', 'Meta Ads', 'Google Business', 'LinkedIn Ads', 'TikTok Ads', 'WordPress']
const MQ_CLR  = ['#E8711A', '#4285F4', '#34A853', '#1877F2', '#FBBC04', '#0A66C2', '#ff0050', '#21759B']
const BARS    = [42, 65, 38, 78, 52, 88, 61, 74, 55, 92, 68, 80, 45, 77, 95, 62, 73, 85, 50, 79]

export default function SharedSections() {
  const rootRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-up]').forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, y: 52 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' } },
        )
      })

      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
        gsap.fromTo(
          group.querySelectorAll<HTMLElement>('[data-si]'),
          { opacity: 0, y: 44, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.09, ease: 'power3.out',
            scrollTrigger: { trigger: group, start: 'top 84%' } },
        )
      })

      gsap.fromTo('.ot-mock',
        { rotateX: '14deg', scale: 0.88, opacity: 0.35, y: 70 },
        { rotateX: '2deg', scale: 1, opacity: 1, y: 0,
          scrollTrigger: { trigger: '.ot-mock-wrap', start: 'top 80%', end: 'top 10%', scrub: 1.6 } },
      )

      gsap.utils.toArray<HTMLElement>('[data-bar]').forEach((bar, i) => {
        const h = bar.getAttribute('data-bar') ?? '50'
        gsap.fromTo(bar,
          { height: '0%' },
          { height: `${h}%`, duration: 0.55, delay: i * 0.025, ease: 'power2.out',
            scrollTrigger: { trigger: '.ot-chart', start: 'top 85%', once: true } },
        )
      })

      gsap.to('.ot-cta-glow', {
        scale: 1.4, opacity: 0.5,
        scrollTrigger: { trigger: '.ot-cta', start: 'top 80%', end: 'top 15%', scrub: 2 },
      })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={rootRef}>

      {/* ── MARQUEE ──────────────────────────────────── */}
      <div className="border-y border-slate-100 bg-slate-50/80 py-5 overflow-hidden group">
        <div className="ot-mq group-hover:[animation-play-state:paused] flex gap-14 w-max whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((name, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[0.75rem] font-semibold text-slate-500 uppercase tracking-[0.06em]">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: MQ_CLR[i % MQ_CLR.length] }} />
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 py-36">
        <div data-up="" className="text-center max-w-2xl mx-auto mb-20">
          <div className="text-[0.7rem] font-bold text-blue-600 uppercase tracking-[0.1em] mb-4">Features</div>
          <h2 className="mb-5 font-extrabold tracking-[-0.025em] leading-tight"
            style={{ fontSize: 'clamp(2rem,3.4vw,2.7rem)', fontFamily: 'var(--font-jakarta, system-ui)' }}>
            Built for agencies that move fast
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            Everything you need to manage client analytics at scale — without switching between a dozen tools.
          </p>
        </div>

        <div data-stagger="" className="grid grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div data-si="" key={i}
              className="relative bg-white border border-slate-200 rounded-2xl p-8 group cursor-default transition-all duration-300 hover:-translate-y-2 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(79,70,229,0.1)] overflow-hidden"
              style={{
                boxShadow: '0 2px 24px rgba(79,70,229,0.05)',
                borderTop: `2px solid ${F_COLORS[i]}28`,
              }}>
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(105deg, transparent 38%, ${F_COLORS[i]}08 55%, transparent 72%)` }} />

              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                style={{ background: F_COLORS[i] + '14', color: F_COLORS[i] }}>
                <div className="w-5 h-5">{FEATURE_SVGS[i]}</div>
              </div>

              <h3 className="text-base font-bold mb-3 tracking-tight">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">{f.desc}</p>

              <div className="mb-5 opacity-40 group-hover:opacity-90 transition-opacity duration-300">
                <svg viewBox="0 0 56 18" width="56" height="18" style={{ overflow: 'visible' }}>
                  <path d={sparkPath(F_SPARKS[i])} fill="none" stroke={F_COLORS[i]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <span className="text-[0.68rem] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full uppercase tracking-wide">
                {f.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── DASHBOARD MOCKUP ─────────────────────────── */}
      <div className="ot-mock-wrap max-w-6xl mx-auto px-8 pb-36">
        <div data-up="" className="text-center mb-14">
          <div className="text-[0.7rem] font-bold text-blue-600 uppercase tracking-[0.1em] mb-4">Dashboard</div>
          <h2 className="font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(2rem,3vw,2.5rem)', fontFamily: 'var(--font-jakarta, system-ui)' }}>
            See everything at a glance
          </h2>
        </div>

        <div style={{ perspective: '1500px' }}>
          <div className="ot-mock bg-white border border-slate-200 rounded-2xl overflow-hidden"
            style={{ transformOrigin: 'center top', willChange: 'transform', boxShadow: '0 48px 100px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}>

            {/* Browser chrome */}
            <div className="bg-gradient-to-b from-slate-100 to-slate-50/80 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 flex justify-center">
                <div className="bg-white border border-slate-200 rounded-md px-5 py-1 text-[0.68rem] text-slate-400 w-48 text-center">
                  app.onelytics.io/dashboard
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[0.62rem] font-bold text-emerald-600 mr-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ot-pulse" />
                LIVE
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', minHeight: '360px' }}>
              <div className="bg-slate-50 border-r border-slate-100 p-3">
                <div className="text-[0.62rem] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Menu</div>
                {[
                  ['📊', 'Dashboard', true],
                  ['📈', 'Google Ads', false],
                  ['🔍', 'Search Console', false],
                  ['📱', 'Meta Ads', false],
                  ['🏢', 'GBP', false],
                  ['📄', 'Reports', false],
                ].map(([icon, label, active], i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[0.78rem] mb-0.5 font-medium ${active ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                    <span>{icon}</span>{label as string}
                  </div>
                ))}
              </div>

              <div className="p-5 bg-white">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    ['$24.8k', 'Ad Spend',    '↑ 12%',  '#3b82f6'],
                    ['48.2k',  'Sessions',    '↑ 8.4%', '#0ea5e9'],
                    ['3.8x',   'ROAS',        '↑ 0.4x', '#22c55e'],
                    ['1,204',  'Conversions', '↑ 21%',  '#818cf8'],
                  ].map(([v, l, d, c], ki) => (
                    <div key={ki} className="border border-slate-100 rounded-xl p-3">
                      <div className="text-xl font-black tracking-tight" style={{ color: c as string }}>{v}</div>
                      <div className="text-[0.65rem] text-slate-400 mt-0.5">{l}</div>
                      <div className="text-[0.65rem] text-emerald-500 font-bold mt-0.5">{d}</div>
                      <div className="mt-2 flex items-end gap-px" style={{ height: '16px' }}>
                        {KPI_SPARKS[ki].map((hv, j) => (
                          <div key={j} style={{ flex: 1, height: `${hv}%`, background: c as string, opacity: 0.18 + hv / 160, borderRadius: '1px 1px 0 0' }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ot-chart border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[0.66rem] font-bold text-slate-400 uppercase tracking-wider">Spend vs Revenue · Last 30 Days</div>
                    <div className="flex gap-3 text-[0.6rem] text-slate-400">
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded-sm" style={{ background: 'rgba(37,99,235,0.55)' }} />Spend</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded-sm" style={{ background: 'rgba(14,165,233,0.45)' }} />Revenue</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-[2px]" style={{ height: '88px' }}>
                    {BARS.map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" data-bar={h}
                        style={{ height: '0%', background: `linear-gradient(180deg,rgba(37,99,235,${0.32 + h / 220}) 0%,rgba(37,99,235,0.1) 100%)` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLATFORMS ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 py-36">
        <div data-up="" className="text-center max-w-xl mx-auto mb-16">
          <div className="text-[0.7rem] font-bold text-blue-600 uppercase tracking-[0.1em] mb-4">Integrations</div>
          <h2 className="mb-4 font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(2rem,3.4vw,2.7rem)', fontFamily: 'var(--font-jakarta, system-ui)' }}>
            Every platform. One connection.
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            Native integrations — not brittle API hacks. Connect in under 60 seconds per platform.
          </p>
        </div>

        <div data-stagger="" className="grid grid-cols-3 gap-4">
          {PLATFORMS.map((p, i) => (
            <div data-si="" key={i}
              className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.07)] hover:border-slate-300 group">
              <div className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[0.7rem] font-black flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: p.color + '18', color: p.color }}>
                  {p.abbr}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{p.desc}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
              </div>
              {/* Platform-colored accent bar on hover */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl"
                style={{ background: p.color }} />

              <div className="max-h-0 group-hover:max-h-14 overflow-hidden transition-all duration-300 ease-out">
                <div className="flex gap-0 border-t" style={{ borderColor: p.color + '22' }}>
                  {P_METRICS[i].map(([lbl, val]) => (
                    <div key={lbl} className="flex-1 text-center py-2.5 border-r last:border-r-0" style={{ borderColor: p.color + '16' }}>
                      <div className="text-[0.56rem] text-slate-400 uppercase tracking-wide mb-0.5">{lbl}</div>
                      <div className="text-[0.8rem] font-bold" style={{ color: p.color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="ot-cta relative overflow-hidden py-40 px-8">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 45%, #dbeafe 100%)' }} />
        <div className="absolute inset-0 opacity-[0.022]"
          style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="ot-cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)' }} />

        <div data-up="" className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="text-[0.7rem] font-bold text-indigo-500 uppercase tracking-[0.12em] mb-6">Get Started Today</div>
          <h2 className="text-slate-900 mb-6 font-black tracking-[-0.035em] leading-tight"
            style={{ fontSize: 'clamp(2.5rem,5vw,3.75rem)', fontFamily: 'var(--font-jakarta, system-ui)' }}>
            Stop switching tabs.<br />Start making decisions.
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed mb-12 max-w-xl mx-auto">
            Connect your marketing stack and start making better decisions, faster.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] px-9 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(79,70,229,0.28)] hover:shadow-[0_12px_48px_rgba(79,70,229,0.38)]">
              Start for free
            </Link>
            <Link href="/pricing" className="border-2 border-indigo-300 hover:border-indigo-400 text-indigo-700 hover:bg-indigo-50/60 active:scale-[0.98] px-9 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:-translate-y-0.5">
              See pricing
            </Link>
          </div>
          <div className="mt-5 text-sm text-slate-500">Free plan available · No credit card required · Setup in 5 minutes</div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-10 pt-14 pb-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="font-black text-xl tracking-tight text-slate-900 mb-3"
              style={{ fontFamily: 'var(--font-jakarta, system-ui)' }}>
              One<span className="text-blue-600">lytics</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Unified marketing analytics for agencies and performance-driven teams.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">Product</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><a href="/pricing"  className="hover:text-blue-600 transition-colors">Pricing</a></li>
              <li><a href="/login"    className="hover:text-blue-600 transition-colors">Sign in</a></li>
              <li><a href="/register" className="hover:text-blue-600 transition-colors">Get started</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">Legal</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms"   className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 px-10 py-5">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs text-slate-400">© 2026 Onelytics. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        .ot-mq{animation:ot-mq 28s linear infinite}
        @keyframes ot-mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .ot-pulse{animation:ot-pulse 2.2s ease-in-out infinite}
        @keyframes ot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.7)}}
        @media(max-width:900px){
          .grid-cols-3{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:600px){
          .grid-cols-3,.grid-cols-4{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  )
}
