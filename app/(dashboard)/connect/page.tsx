'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  BarChart3,
  Search,
  Share2,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Music2,
  Briefcase,
} from 'lucide-react'

interface ConnectionStatus {
  google: boolean
  meta: boolean
  wordpress: boolean
  tiktok: boolean
  linkedin: boolean
  propertyId: string | null
  gscSiteUrl: string | null
  wpSiteUrl: string | null
  metaAdAccountId: string | null
  tiktokAdvertiserId: string | null
  linkedinAccountId: string | null
}

const integrations = [
  {
    id: 'google',
    name: 'Google Analytics 4',
    icon: BarChart3,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    description: 'Track website traffic, user behavior, and conversions.',
    phase: 2,
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    icon: Activity,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    description: 'Monitor ad spend, clicks, CPC, and campaign ROAS.',
    phase: 2,
  },
  {
    id: 'gsc',
    name: 'Search Console',
    icon: Search,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    description: 'Analyze organic search traffic and keyword rankings.',
    phase: 2,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: Globe,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/50',
    description: 'Track posts, drafts, and content activity from your WordPress site.',
    phase: 2,
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    icon: Share2,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/50',
    description: 'Track Facebook and Instagram ad spend, reach, and conversions.',
    phase: 2,
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    icon: Music2,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/50',
    description: 'Monitor TikTok ad spend, impressions, clicks, and conversions.',
    phase: 2,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Ads',
    icon: Briefcase,
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    description: 'Track B2B LinkedIn ad campaigns — spend, CTR, and lead conversions.',
    phase: 2,
  },
]

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: 'Google authorization was cancelled.',
  meta_denied: 'Meta authorization was cancelled.',
  tiktok_denied: 'TikTok authorization was cancelled.',
  linkedin_denied: 'LinkedIn authorization was cancelled.',
  invalid_state: 'Security check failed. Please try again.',
  invalid_callback: 'Something went wrong with the OAuth callback.',
  token_exchange_failed: 'Could not exchange the authorization code. Check your app credentials.',
}

function ConnectPageInner() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<ConnectionStatus>({
    google: false, meta: false, wordpress: false, tiktok: false, linkedin: false,
    propertyId: null, gscSiteUrl: null, wpSiteUrl: null, metaAdAccountId: null,
    tiktokAdvertiserId: null, linkedinAccountId: null,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // GA4 property ID
  const [propertyInput, setPropertyInput] = useState('')
  const [propertyLoading, setPropertyLoading] = useState(false)
  const [propertyError, setPropertyError] = useState('')

  // GSC site URL
  const [gscInput, setGscInput] = useState('')
  const [gscLoading, setGscLoading] = useState(false)
  const [gscError, setGscError] = useState('')

  // WordPress form
  const [wpFormOpen, setWpFormOpen] = useState(false)
  const [wpSiteUrl, setWpSiteUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [wpAppPassword, setWpAppPassword] = useState('')
  const [wpLoading, setWpLoading] = useState(false)
  const [wpError, setWpError] = useState('')

  // Meta ad account ID
  const [metaAdInput, setMetaAdInput] = useState('')
  const [metaAdLoading, setMetaAdLoading] = useState(false)
  const [metaAdError, setMetaAdError] = useState('')

  // TikTok advertiser ID
  const [tiktokAdInput, setTiktokAdInput] = useState('')
  const [tiktokAdLoading, setTiktokAdLoading] = useState(false)
  const [tiktokAdError, setTiktokAdError] = useState('')

  // LinkedIn account ID
  const [linkedinAdInput, setLinkedinAdInput] = useState('')
  const [linkedinAdLoading, setLinkedinAdLoading] = useState(false)
  const [linkedinAdError, setLinkedinAdError] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/status')
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    const googleConnected = searchParams.get('google')
    const metaConnected = searchParams.get('meta')
    const tiktokConnected = searchParams.get('tiktok')
    const linkedinConnected = searchParams.get('linkedin')
    const error = searchParams.get('error')
    if (googleConnected === 'connected') {
      setToast({ type: 'success', message: 'Google account connected.' })
      fetchStatus()
    } else if (metaConnected === 'connected') {
      setToast({ type: 'success', message: 'Meta account connected.' })
      fetchStatus()
    } else if (tiktokConnected === 'connected') {
      setToast({ type: 'success', message: 'TikTok account connected.' })
      fetchStatus()
    } else if (linkedinConnected === 'connected') {
      setToast({ type: 'success', message: 'LinkedIn account connected.' })
      fetchStatus()
    } else if (error) {
      setToast({ type: 'error', message: ERROR_MESSAGES[error] ?? 'An error occurred.' })
    }
  }, [searchParams, fetchStatus])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleConnect(id: string) {
    if (id === 'google' || id === 'google-ads' || id === 'gsc') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/google/connect')
        if (res.ok) {
          const { url } = await res.json()
          window.location.href = url
        } else {
          setToast({ type: 'error', message: 'Failed to start Google authorization.' })
          setActionLoading(null)
        }
      } catch {
        setToast({ type: 'error', message: 'Network error. Please try again.' })
        setActionLoading(null)
      }
      return
    }
    if (id === 'wordpress') {
      setWpFormOpen(true)
      return
    }
    if (id === 'meta') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/meta/connect')
        if (res.ok) {
          const { url } = await res.json()
          window.location.href = url
        } else {
          setToast({ type: 'error', message: 'Failed to start Meta authorization.' })
          setActionLoading(null)
        }
      } catch {
        setToast({ type: 'error', message: 'Network error. Please try again.' })
        setActionLoading(null)
      }
      return
    }
    if (id === 'tiktok') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/tiktok/connect')
        if (res.ok) {
          const { url } = await res.json()
          window.location.href = url
        } else {
          setToast({ type: 'error', message: 'Failed to start TikTok authorization.' })
          setActionLoading(null)
        }
      } catch {
        setToast({ type: 'error', message: 'Network error. Please try again.' })
        setActionLoading(null)
      }
      return
    }
    if (id === 'linkedin') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/linkedin/connect')
        if (res.ok) {
          const { url } = await res.json()
          window.location.href = url
        } else {
          setToast({ type: 'error', message: 'Failed to start LinkedIn authorization.' })
          setActionLoading(null)
        }
      } catch {
        setToast({ type: 'error', message: 'Network error. Please try again.' })
        setActionLoading(null)
      }
    }
  }

  async function handleDisconnect(id: string) {
    if (id === 'google' || id === 'google-ads' || id === 'gsc') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' })
        if (res.ok) {
          await fetchStatus()
          setToast({ type: 'success', message: 'Google account disconnected.' })
        }
      } finally {
        setActionLoading(null)
      }
      return
    }
    if (id === 'wordpress') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/wordpress/disconnect', { method: 'POST' })
        if (res.ok) {
          await fetchStatus()
          setToast({ type: 'success', message: 'WordPress disconnected.' })
        }
      } finally {
        setActionLoading(null)
      }
      return
    }
    if (id === 'meta') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/meta/disconnect', { method: 'POST' })
        if (res.ok) {
          await fetchStatus()
          setToast({ type: 'success', message: 'Meta account disconnected.' })
        }
      } finally {
        setActionLoading(null)
      }
      return
    }
    if (id === 'tiktok') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/tiktok/disconnect', { method: 'POST' })
        if (res.ok) {
          await fetchStatus()
          setToast({ type: 'success', message: 'TikTok account disconnected.' })
        }
      } finally {
        setActionLoading(null)
      }
      return
    }
    if (id === 'linkedin') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/linkedin/disconnect', { method: 'POST' })
        if (res.ok) {
          await fetchStatus()
          setToast({ type: 'success', message: 'LinkedIn account disconnected.' })
        }
      } finally {
        setActionLoading(null)
      }
    }
  }

  async function handleSavePropertyId() {
    setPropertyError('')
    if (!propertyInput.trim()) { setPropertyError('Property ID is required.'); return }
    setPropertyLoading(true)
    try {
      const res = await fetch('/api/integrations/google/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: propertyInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus()
        setPropertyInput('')
        setToast({ type: 'success', message: 'GA4 property ID saved.' })
      } else {
        setPropertyError(data.error ?? 'Failed to save property ID.')
      }
    } finally {
      setPropertyLoading(false)
    }
  }

  async function handleSaveGscSite() {
    setGscError('')
    if (!gscInput.trim()) { setGscError('Site URL is required.'); return }
    setGscLoading(true)
    try {
      const res = await fetch('/api/integrations/google/gsc-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: gscInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus()
        setGscInput('')
        setToast({ type: 'success', message: 'Search Console site saved.' })
      } else {
        setGscError(data.error ?? 'Failed to save site URL.')
      }
    } finally {
      setGscLoading(false)
    }
  }

  async function handleConnectWordPress() {
    setWpError('')
    if (!wpSiteUrl.trim() || !wpUsername.trim() || !wpAppPassword.trim()) {
      setWpError('All fields are required.')
      return
    }
    setWpLoading(true)
    try {
      const res = await fetch('/api/integrations/wordpress/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: wpSiteUrl.trim(), username: wpUsername.trim(), appPassword: wpAppPassword.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus()
        setWpFormOpen(false)
        setWpSiteUrl(''); setWpUsername(''); setWpAppPassword('')
        setToast({ type: 'success', message: 'WordPress connected.' })
      } else {
        setWpError(data.error ?? 'Failed to connect WordPress.')
      }
    } finally {
      setWpLoading(false)
    }
  }

  async function handleSaveMetaAdAccount() {
    setMetaAdError('')
    if (!metaAdInput.trim()) { setMetaAdError('Ad account ID is required.'); return }
    setMetaAdLoading(true)
    try {
      const res = await fetch('/api/integrations/meta/ad-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId: metaAdInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus()
        setMetaAdInput('')
        setToast({ type: 'success', message: 'Meta ad account ID saved.' })
      } else {
        setMetaAdError(data.error ?? 'Failed to save ad account ID.')
      }
    } finally {
      setMetaAdLoading(false)
    }
  }

  async function handleSaveTikTokAdvertiserId() {
    setTiktokAdError('')
    if (!tiktokAdInput.trim()) { setTiktokAdError('Advertiser ID is required.'); return }
    setTiktokAdLoading(true)
    try {
      const res = await fetch('/api/integrations/tiktok/ad-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiserId: tiktokAdInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus()
        setTiktokAdInput('')
        setToast({ type: 'success', message: 'TikTok advertiser ID saved.' })
      } else {
        setTiktokAdError(data.error ?? 'Failed to save advertiser ID.')
      }
    } finally {
      setTiktokAdLoading(false)
    }
  }

  async function handleSaveLinkedInAccountId() {
    setLinkedinAdError('')
    if (!linkedinAdInput.trim()) { setLinkedinAdError('Account ID is required.'); return }
    setLinkedinAdLoading(true)
    try {
      const res = await fetch('/api/integrations/linkedin/ad-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: linkedinAdInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus()
        setLinkedinAdInput('')
        setToast({ type: 'success', message: 'LinkedIn account ID saved.' })
      } else {
        setLinkedinAdError(data.error ?? 'Failed to save account ID.')
      }
    } finally {
      setLinkedinAdLoading(false)
    }
  }

  const googleConnected = status.google
  const needsPropertyId = googleConnected && !status.propertyId
  const needsGscSite = googleConnected && !status.gscSiteUrl
  const needsMetaAdAccount = status.meta && !status.metaAdAccountId
  const needsTikTokAdvertiserId = status.tiktok && !status.tiktokAdvertiserId
  const needsLinkedInAccountId = status.linkedin && !status.linkedinAccountId

  function getConnectedStatus(id: string) {
    if (id === 'google') return status.google
    if (id === 'google-ads') return status.google
    if (id === 'gsc') return status.google && !!status.gscSiteUrl
    if (id === 'wordpress') return status.wordpress
    if (id === 'meta') return status.meta && !!status.metaAdAccountId
    if (id === 'tiktok') return status.tiktok && !!status.tiktokAdvertiserId
    if (id === 'linkedin') return status.linkedin && !!status.linkedinAccountId
    return false
  }

  function getBadgeLabel(id: string) {
    if (id === 'google') return status.propertyId ? 'Connected' : 'Connected — needs property ID'
    if (id === 'google-ads') return 'Connected'
    if (id === 'gsc') return status.gscSiteUrl ? 'Connected' : 'Connected — needs site URL'
    if (id === 'wordpress') return 'Connected'
    if (id === 'meta') return status.metaAdAccountId ? 'Connected' : 'Connected — needs ad account ID'
    if (id === 'tiktok') return status.tiktokAdvertiserId ? 'Connected' : 'Connected — needs advertiser ID'
    if (id === 'linkedin') return status.linkedinAccountId ? 'Connected' : 'Connected — needs account ID'
    return 'Connected'
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      {toast && (
        <div
          className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Sources</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your marketing platforms to pull data into Onelytics.
        </p>
      </div>

      {/* GA4 property ID prompt */}
      {needsPropertyId && (
        <div className="mb-6 p-4 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
            One more step — enter your GA4 Property ID
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
            Google Analytics → Admin → Property Settings. Format:{' '}
            <code className="font-mono bg-orange-100 dark:bg-orange-900/50 px-1 rounded">properties/XXXXXXXXX</code>
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={propertyInput}
                onChange={(e) => setPropertyInput(e.target.value)}
                placeholder="properties/123456789"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {propertyError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{propertyError}</p>}
            </div>
            <Button onClick={handleSavePropertyId} disabled={propertyLoading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              {propertyLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* GSC site URL prompt */}
      {needsGscSite && (
        <div className="mb-6 p-4 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
            Add your Search Console site URL
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-400 mb-3">
            Find it in Search Console → Property selector. Examples:{' '}
            <code className="font-mono bg-purple-100 dark:bg-purple-900/50 px-1 rounded">https://example.com/</code>{' '}
            or{' '}
            <code className="font-mono bg-purple-100 dark:bg-purple-900/50 px-1 rounded">sc-domain:example.com</code>
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={gscInput}
                onChange={(e) => setGscInput(e.target.value)}
                placeholder="https://example.com/"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {gscError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{gscError}</p>}
            </div>
            <Button onClick={handleSaveGscSite} disabled={gscLoading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              {gscLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* TikTok advertiser ID prompt */}
      {needsTikTokAdvertiserId && (
        <div className="mb-6 p-4 border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <p className="text-sm font-medium text-teal-800 dark:text-teal-300 mb-1">
            One more step — enter your TikTok Advertiser ID
          </p>
          <p className="text-xs text-teal-700 dark:text-teal-400 mb-3">
            Find it in TikTok Ads Manager → Account settings. Numeric ID only.
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={tiktokAdInput}
                onChange={(e) => setTiktokAdInput(e.target.value)}
                placeholder="1234567890"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {tiktokAdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{tiktokAdError}</p>}
            </div>
            <Button onClick={handleSaveTikTokAdvertiserId} disabled={tiktokAdLoading} className="bg-teal-500 hover:bg-teal-600 text-white shrink-0">
              {tiktokAdLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* LinkedIn account ID prompt */}
      {needsLinkedInAccountId && (
        <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
            One more step — enter your LinkedIn Ad Account ID
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
            Find it in LinkedIn Campaign Manager → Account Assets. Numeric ID only.
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={linkedinAdInput}
                onChange={(e) => setLinkedinAdInput(e.target.value)}
                placeholder="1234567890"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {linkedinAdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{linkedinAdError}</p>}
            </div>
            <Button onClick={handleSaveLinkedInAccountId} disabled={linkedinAdLoading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              {linkedinAdLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Meta ad account ID prompt */}
      {needsMetaAdAccount && (
        <div className="mb-6 p-4 border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
          <p className="text-sm font-medium text-pink-800 dark:text-pink-300 mb-1">
            One more step — enter your Meta Ad Account ID
          </p>
          <p className="text-xs text-pink-700 dark:text-pink-400 mb-3">
            Find it in Meta Business Manager → Ad Accounts. Format:{' '}
            <code className="font-mono bg-pink-100 dark:bg-pink-900/50 px-1 rounded">act_XXXXXXXXXX</code>
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={metaAdInput}
                onChange={(e) => setMetaAdInput(e.target.value)}
                placeholder="act_1234567890"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {metaAdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{metaAdError}</p>}
            </div>
            <Button onClick={handleSaveMetaAdAccount} disabled={metaAdLoading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              {metaAdLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const connected = getConnectedStatus(integration.id)
          const isActive = actionLoading === integration.id
          const isAvailable = integration.phase === 2
          const showWpForm = integration.id === 'wordpress' && wpFormOpen && !connected

          return (
            <Card
              key={integration.id}
              className="dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${integration.bg} ${integration.color}`}>
                    <integration.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {loading ? (
                        <span className="inline-block w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ) : connected ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 font-medium border-0 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {getBadgeLabel(integration.id)}
                        </Badge>
                      ) : isAvailable ? (
                        <Badge variant="outline" className="text-gray-500 font-medium">Not Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 font-medium">
                          Phase {integration.phase}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {integration.description}
                </p>

                {/* WordPress inline form */}
                {showWpForm && (
                  <div className="mb-4 space-y-3">
                    <InputField label="Site URL" value={wpSiteUrl} onChange={setWpSiteUrl} placeholder="https://example.com" />
                    <InputField label="Username" value={wpUsername} onChange={setWpUsername} placeholder="admin" />
                    <InputField label="Application Password" value={wpAppPassword} onChange={setWpAppPassword} placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" type="password" />
                    {wpError && <p className="text-xs text-red-600 dark:text-red-400">{wpError}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Generate an Application Password in WordPress → Users → Profile.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleConnectWordPress} disabled={wpLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        {wpLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                        Save & Connect
                      </Button>
                      <Button variant="outline" onClick={() => { setWpFormOpen(false); setWpError('') }} className="shrink-0">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {!showWpForm && (
                  isAvailable ? (
                    connected ? (
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                        onClick={() => handleDisconnect(integration.id)}
                        disabled={isActive}
                      >
                        {isActive ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={() => handleConnect(integration.id)}
                        disabled={isActive}
                      >
                        {isActive && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect {integration.name}
                      </Button>
                    )
                  ) : (
                    <Button disabled className="w-full" variant="outline">
                      Coming in Phase {integration.phase}
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function InputField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectPageInner />
    </Suspense>
  )
}
