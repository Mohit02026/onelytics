'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import SharedSections from './SharedSections'

gsap.registerPlugin(ScrollTrigger)

interface Props {
  HeroScene: React.ComponentType<{ scrollProgressRef: React.MutableRefObject<number> }>
  heroBg?: string
  heroGlow?: string
  canvasStyle?: React.CSSProperties
  label?: string
}

export default function BaseLandingPage({
  HeroScene,
  heroBg      = '#f0f4ff',
  heroGlow    = 'rgba(37,99,235,0.08)',
  canvasStyle = {},
  label       = 'Now in Public Beta',
}: Props) {
  const scrollProgressRef = useRef(0)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenis.on('scroll', () => ScrollTrigger.update())
    const tickerFn = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tickerFn)
    gsap.ticker.lagSmoothing(0)

    const onScroll = () => {
      scrollProgressRef.current = Math.min(window.scrollY / window.innerHeight, 1)
      if (navRef.current) {
        navRef.current.dataset.stuck = window.scrollY > 44 ? 'true' : 'false'
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const ctx = gsap.context(() => {
      gsap.timeline({ delay: 0.25 })
        .fromTo('.ot-badge', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' })
        .fromTo('.ot-h1',    { opacity: 0, y: 38 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, '-=0.2')
        .fromTo('.ot-sub',   { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7,  ease: 'power3.out' }, '-=0.4')
        .fromTo('.ot-btns',  { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6,  ease: 'power3.out' }, '-=0.35')
        .fromTo('.ot-proof', { opacity: 0 },         { opacity: 1,       duration: 0.45 },                     '-=0.2')
    })

    ScrollTrigger.refresh()

    return () => {
      ctx.revert()
      gsap.ticker.remove(tickerFn)
      lenis.destroy()
      window.removeEventListener('scroll', onScroll)
      ScrollTrigger.killAll()
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────── */}
      <nav ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-4 transition-all duration-300"
        data-stuck="false">
        <div className="font-black text-xl tracking-tight"
          style={{ fontFamily: 'var(--font-jakarta, system-ui)' }}>
          One<span className="text-blue-600">lytics</span>
        </div>
        <div className="flex gap-8 text-sm font-medium text-slate-500">
          {['Features', 'Integrations', 'Pricing', 'Docs'].map(l => (
            <a key={l} href="#" className="hover:text-slate-900 transition-colors">{l}</a>
          ))}
        </div>
        <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-white px-5 py-2.5 rounded-xl border-2 border-blue-600 hover:bg-blue-600 transition-all duration-200 hover:-translate-y-px active:scale-[0.98]">
          Sign in
        </Link>
        <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-[0_0_24px_rgba(37,99,235,0.3)] hover:-translate-y-px active:scale-[0.98]">
          Get Started Free
        </Link>
      </nav>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative h-screen overflow-hidden" style={{ background: heroBg }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.028]"
          style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '38px 38px' }} />
        <div className="absolute inset-y-0 right-0 w-[56%] pointer-events-none">
          <div className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse 72% 72% at 55% 50%, ${heroGlow} 0%, ${heroGlow.replace(/[\d.]+\)$/, '0.04)')} 50%, transparent 74%)` }} />
          <div className="w-full h-full" style={canvasStyle}>
            <HeroScene scrollProgressRef={scrollProgressRef} />
          </div>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center pl-16 pr-8 max-w-[680px]">
          <div className="ot-badge mb-8 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-[0.7rem] font-bold uppercase tracking-[0.08em] px-4 py-1.5 rounded-full w-fit">
            <span className="ot-pulse w-1.5 h-1.5 rounded-full bg-sky-400 block" />
            {label}
          </div>
          <h1 className="ot-h1 mb-6 leading-[1.04] tracking-[-0.04em] text-slate-900"
            style={{ fontSize: 'clamp(2.8rem, 5.2vw, 4.6rem)', fontWeight: 900, fontFamily: 'var(--font-jakarta, system-ui)', letterSpacing: '-0.02em' }}>
            All your data.<br />
            <span style={{ background: 'linear-gradient(130deg,#1d4ed8 0%,#2563eb 40%,#0ea5e9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              One dashboard.
            </span>
          </h1>
          <p className="ot-sub text-slate-500 leading-[1.75] mb-10 max-w-[460px]"
            style={{ fontSize: 'clamp(1rem,1.3vw,1.15rem)' }}>
            Connect GA4, Google Ads, Search Console, Meta, and more.
            Stop switching tabs — start making better decisions, faster.
          </p>
          <div className="ot-btns flex gap-3.5 mb-12 flex-wrap">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 shadow-[0_0_48px_rgba(37,99,235,0.34)] hover:shadow-[0_0_72px_rgba(37,99,235,0.52)] hover:-translate-y-0.5">
              Start for free
            </Link>
            <Link href="/pricing" className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-8 py-3.5 rounded-xl font-medium text-base transition-all duration-200 hover:-translate-y-0.5">
              See pricing
            </Link>
          </div>
        </div>
        <div className="ot-scroll-cue absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-400 text-[0.66rem] uppercase tracking-widest">
          <span>Scroll</span>
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <path d="M6 1v14M1 10l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      <SharedSections />

      <style>{`
        .ot-pulse{animation:ot-pulse 2.2s ease-in-out infinite}
        @keyframes ot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.7)}}
        .ot-scroll-cue{animation:ot-bounce 2.4s ease-in-out infinite}
        @keyframes ot-bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}
        nav[data-stuck="true"]{
          background:rgba(255,255,255,0.92);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border-bottom:1px solid rgba(226,232,240,0.9);
          box-shadow:0 1px 0 rgba(0,0,0,0.04);
        }
        @media(prefers-reduced-motion:reduce){
          *{animation-duration:0.01ms!important;transition-duration:0.01ms!important}
        }
      `}</style>
    </div>
  )
}
