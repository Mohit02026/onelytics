'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity, BarChart3, Search, Share2, Globe, Loader2,
  CheckCircle2, XCircle, AlertCircle, Music2, Briefcase, Building2,
} from 'lucide-react'

interface ConnectionStatus {
  google: boolean
  meta: boolean
  wordpress: boolean
  tiktok: boolean
  linkedin: boolean
  gbp: boolean
  propertyId: string | null
  gscSiteUrl: string | null
  googleAdsCustomerId: string | null
  gbpLocationId: string | null
  wpSiteUrl: string | null
  metaAdAccountId: string | null
  tiktokAdvertiserId: string | null
  linkedinAccountId: string | null
}

interface Ga4Property { id: string; name: string; account: string }
interface GscSite { url: string; permission: string }
interface GbpLocation { id: string; name: string; address: string }
type ActivePicker = 'ga4' | 'gsc' | 'ads' | 'gbp' | null

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
    id: 'gbp',
    name: 'Google Business',
    icon: Building2,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    description: 'Track local search views, calls, directions, and reviews.',
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

const PARTIAL_LABELS: Record<string, string> = {
  google: 'Connected — select property',
  'google-ads': 'Connected — needs customer ID',
  gsc: 'Connected — select site',
  gbp: 'Connected — select location',
  meta: 'Connected — needs ad account',
  tiktok: 'Connected — needs advertiser ID',
  linkedin: 'Connected — needs account ID',
}

function ConnectPageInner() {
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<ConnectionStatus>({
    google: false, meta: false, wordpress: false, tiktok: false, linkedin: false, gbp: false,
    propertyId: null, gscSiteUrl: null, googleAdsCustomerId: null, gbpLocationId: null,
    wpSiteUrl: null, metaAdAccountId: null, tiktokAdvertiserId: null, linkedinAccountId: null,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [activePicker, setActivePicker] = useState<ActivePicker>(null)

  // GA4 picker
  const [ga4Properties, setGa4Properties] = useState<Ga4Property[]>([])
  const [ga4PickerLoading, setGa4PickerLoading] = useState(false)
  const [ga4PickerError, setGa4PickerError] = useState('')
  const [selectedGa4, setSelectedGa4] = useState('')
  const [ga4SaveLoading, setGa4SaveLoading] = useState(false)
  const [ga4SaveError, setGa4SaveError] = useState('')

  // GSC picker
  const [gscSites, setGscSites] = useState<GscSite[]>([])
  const [gscPickerLoading, setGscPickerLoading] = useState(false)
  const [gscPickerError, setGscPickerError] = useState('')
  const [selectedGsc, setSelectedGsc] = useState('')
  const [gscSaveLoading, setGscSaveLoading] = useState(false)
  const [gscSaveError, setGscSaveError] = useState('')

  // GBP picker
  const [gbpLocations, setGbpLocations] = useState<GbpLocation[]>([])
  const [gbpPickerLoading, setGbpPickerLoading] = useState(false)
  const [gbpPickerError, setGbpPickerError] = useState('')
  const [selectedGbp, setSelectedGbp] = useState('')
  const [gbpSaveLoading, setGbpSaveLoading] = useState(false)
  const [gbpSaveError, setGbpSaveError] = useState('')

  // Ads picker (manual)
  const [adsCustomerInput, setAdsCustomerInput] = useState('')
  const [adsCustomerLoading, setAdsCustomerLoading] = useState(false)
  const [adsCustomerError, setAdsCustomerError] = useState('')

  // WordPress form
  const [wpFormOpen, setWpFormOpen] = useState(false)
  const [wpSiteUrl, setWpSiteUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [wpAppPassword, setWpAppPassword] = useState('')
  const [wpLoading, setWpLoading] = useState(false)
  const [wpError, setWpError] = useState('')

  // Meta ad account
  const [metaAdInput, setMetaAdInput] = useState('')
  const [metaAdLoading, setMetaAdLoading] = useState(false)
  const [metaAdError, setMetaAdError] = useState('')
  const [metaAdAccounts, setMetaAdAccounts] = useState<{ id: string; name: string; active: boolean }[]>([])
  const [metaAdAccountsLoading, setMetaAdAccountsLoading] = useState(false)

  const [tiktokAdInput, setTiktokAdInput] = useState('')
  const [tiktokAdLoading, setTiktokAdLoading] = useState(false)
  const [tiktokAdError, setTiktokAdError] = useState('')

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

  useEffect(() => {
    fetchStatus().then(() => {
      // Auto-fetch Meta ad accounts if Meta is connected but no ad account selected yet
    })
  }, [fetchStatus])

  useEffect(() => {
    if (status.meta && !status.metaAdAccountId && metaAdAccounts.length === 0) {
      setMetaAdAccountsLoading(true)
      fetch('/api/integrations/meta/ad-account')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setMetaAdAccounts(d) })
        .finally(() => setMetaAdAccountsLoading(false))
    }
  }, [status.meta, status.metaAdAccountId, metaAdAccounts.length])

  const openGa4Picker = useCallback(async () => {
    setActivePicker('ga4')
    setGa4PickerLoading(true)
    setGa4PickerError('')
    setSelectedGa4('')
    setGa4SaveError('')
    try {
      const res = await fetch('/api/integrations/google/ga4-properties')
      const data = await res.json()
      if (res.ok) {
        setGa4Properties(data.properties ?? [])
      } else {
        setGa4PickerError(data.error ?? 'Failed to load properties.')
      }
    } catch {
      setGa4PickerError('Network error. Please try again.')
    } finally {
      setGa4PickerLoading(false)
    }
  }, [])

  const openGscPicker = useCallback(async () => {
    setActivePicker('gsc')
    setGscPickerLoading(true)
    setGscPickerError('')
    setSelectedGsc('')
    setGscSaveError('')
    try {
      const res = await fetch('/api/integrations/google/gsc-sites')
      const data = await res.json()
      if (res.ok) {
        setGscSites(data.sites ?? [])
      } else {
        setGscPickerError(data.error ?? 'Failed to load sites.')
      }
    } catch {
      setGscPickerError('Network error. Please try again.')
    } finally {
      setGscPickerLoading(false)
    }
  }, [])

  const openGbpPicker = useCallback(async () => {
    setActivePicker('gbp')
    setGbpPickerLoading(true)
    setGbpPickerError('')
    setSelectedGbp('')
    setGbpSaveError('')
    try {
      const res = await fetch('/api/integrations/google/gbp-location')
      const data = await res.json()
      if (res.ok) {
        setGbpLocations(data ?? [])
      } else {
        setGbpPickerError(data.error ?? 'Failed to load locations.')
      }
    } catch {
      setGbpPickerError('Network error. Please try again.')
    } finally {
      setGbpPickerLoading(false)
    }
  }, [])

  useEffect(() => {
    const googleParam = searchParams.get('google')
    const metaParam = searchParams.get('meta')
    const tiktokParam = searchParams.get('tiktok')
    const linkedinParam = searchParams.get('linkedin')
    const error = searchParams.get('error')

    if (googleParam === 'connected') {
      const service = searchParams.get('service') ?? 'ga4'
      fetchStatus()
      if (service === 'ga4') {
        setToast({ type: 'success', message: 'Google connected — select your GA4 property below.' })
        openGa4Picker()
      } else if (service === 'gsc') {
        setToast({ type: 'success', message: 'Google connected — select your Search Console site below.' })
        openGscPicker()
      } else if (service === 'gbp') {
        setToast({ type: 'success', message: 'Google connected — select your Google Business location below.' })
        openGbpPicker()
      } else if (service === 'ads') {
        setToast({ type: 'success', message: 'Google connected — enter your Ads customer ID below.' })
        setActivePicker('ads')
      }
    } else if (metaParam === 'connected') {
      setToast({ type: 'success', message: 'Meta account connected.' })
      fetchStatus()
      setMetaAdAccountsLoading(true)
      fetch('/api/integrations/meta/ad-account')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setMetaAdAccounts(d) })
        .finally(() => setMetaAdAccountsLoading(false))
    } else if (tiktokParam === 'connected') {
      setToast({ type: 'success', message: 'TikTok account connected.' })
      fetchStatus()
    } else if (linkedinParam === 'connected') {
      setToast({ type: 'success', message: 'LinkedIn account connected.' })
      fetchStatus()
    } else if (error) {
      setToast({ type: 'error', message: ERROR_MESSAGES[error] ?? 'An error occurred.' })
    }
  }, [searchParams, fetchStatus, openGa4Picker, openGscPicker, openGbpPicker])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleConnect(id: string) {
    if (id === 'google' || id === 'google-ads' || id === 'gsc' || id === 'gbp') {
      const service = id === 'google' ? 'ga4' : id === 'google-ads' ? 'ads' : id === 'gsc' ? 'gsc' : 'gbp'

      if (status.google) {
        if (service === 'ga4') { openGa4Picker(); return }
        if (service === 'gsc') { openGscPicker(); return }
        if (service === 'gbp') { openGbpPicker(); return }
        if (service === 'ads') { setActivePicker('ads'); setAdsCustomerError(''); setAdsCustomerInput(''); return }
      }

      setActionLoading(id)
      try {
        const res = await fetch(`/api/integrations/google/connect?service=${service}`)
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

    if (id === 'wordpress') { setWpFormOpen(true); return }

    if (id === 'meta') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/meta/connect')
        if (res.ok) { window.location.href = (await res.json()).url }
        else { setToast({ type: 'error', message: 'Failed to start Meta authorization.' }); setActionLoading(null) }
      } catch { setToast({ type: 'error', message: 'Network error. Please try again.' }); setActionLoading(null) }
      return
    }

    if (id === 'tiktok') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/tiktok/connect')
        if (res.ok) { window.location.href = (await res.json()).url }
        else { setToast({ type: 'error', message: 'Failed to start TikTok authorization.' }); setActionLoading(null) }
      } catch { setToast({ type: 'error', message: 'Network error. Please try again.' }); setActionLoading(null) }
      return
    }

    if (id === 'linkedin') {
      setActionLoading(id)
      try {
        const res = await fetch('/api/integrations/linkedin/connect')
        if (res.ok) { window.location.href = (await res.json()).url }
        else { setToast({ type: 'error', message: 'Failed to start LinkedIn authorization.' }); setActionLoading(null) }
      } catch { setToast({ type: 'error', message: 'Network error. Please try again.' }); setActionLoading(null) }
    }
  }

  async function handleDisconnect(id: string) {
    const endpoint =
      id === 'google' || id === 'google-ads' || id === 'gsc' || id === 'gbp' ? '/api/integrations/google/disconnect' :
      id === 'wordpress' ? '/api/integrations/wordpress/disconnect' :
      id === 'meta' ? '/api/integrations/meta/disconnect' :
      id === 'tiktok' ? '/api/integrations/tiktok/disconnect' :
      id === 'linkedin' ? '/api/integrations/linkedin/disconnect' : null

    if (!endpoint) return
    setActionLoading(id)
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        if (id === 'google' || id === 'google-ads' || id === 'gsc' || id === 'gbp') setActivePicker(null)
        await fetchStatus()
        setToast({ type: 'success', message: `${id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' ')} disconnected.` })
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSaveGa4() {
    setGa4SaveError('')
    if (!selectedGa4) { setGa4SaveError('Please select a property.'); return }
    setGa4SaveLoading(true)
    try {
      const res = await fetch('/api/integrations/google/property', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedGa4 }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setActivePicker(null); setToast({ type: 'success', message: 'GA4 property saved.' }) }
      else { setGa4SaveError(data.error ?? 'Failed to save.') }
    } finally { setGa4SaveLoading(false) }
  }

  async function handleSaveGsc() {
    setGscSaveError('')
    if (!selectedGsc) { setGscSaveError('Please select a site.'); return }
    setGscSaveLoading(true)
    try {
      const res = await fetch('/api/integrations/google/gsc-site', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: selectedGsc }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setActivePicker(null); setToast({ type: 'success', message: 'Search Console site saved.' }) }
      else { setGscSaveError(data.error ?? 'Failed to save.') }
    } finally { setGscSaveLoading(false) }
  }

  async function handleSaveGbp() {
    setGbpSaveError('')
    if (!selectedGbp) { setGbpSaveError('Please select a location.'); return }
    setGbpSaveLoading(true)
    const loc = gbpLocations.find(l => l.id === selectedGbp)
    try {
      const res = await fetch('/api/integrations/google/gbp-location', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedGbp, locationName: loc?.name || selectedGbp }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setActivePicker(null); setToast({ type: 'success', message: 'Google Business location saved.' }) }
      else { setGbpSaveError(data.error ?? 'Failed to save.') }
    } finally { setGbpSaveLoading(false) }
  }

  async function handleSaveAds() {
    setAdsCustomerError('')
    if (!adsCustomerInput.trim()) { setAdsCustomerError('Customer ID is required.'); return }
    setAdsCustomerLoading(true)
    try {
      const res = await fetch('/api/integrations/google/ads-customer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: adsCustomerInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setActivePicker(null); setAdsCustomerInput(''); setToast({ type: 'success', message: 'Google Ads customer ID saved.' }) }
      else { setAdsCustomerError(data.error ?? 'Failed to save.') }
    } finally { setAdsCustomerLoading(false) }
  }

  async function handleConnectWordPress() {
    setWpError('')
    if (!wpSiteUrl.trim() || !wpUsername.trim() || !wpAppPassword.trim()) { setWpError('All fields are required.'); return }
    setWpLoading(true)
    try {
      const res = await fetch('/api/integrations/wordpress/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: wpSiteUrl.trim(), username: wpUsername.trim(), appPassword: wpAppPassword.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStatus(); setWpFormOpen(false)
        setWpSiteUrl(''); setWpUsername(''); setWpAppPassword('')
        setToast({ type: 'success', message: 'WordPress connected.' })
      } else { setWpError(data.error ?? 'Failed to connect WordPress.') }
    } finally { setWpLoading(false) }
  }

  async function handleSaveMetaAdAccount() {
    setMetaAdError('')
    if (!metaAdInput.trim()) { setMetaAdError('Ad account ID is required.'); return }
    setMetaAdLoading(true)
    try {
      const res = await fetch('/api/integrations/meta/ad-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId: metaAdInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setMetaAdInput(''); setToast({ type: 'success', message: 'Meta ad account ID saved.' }) }
      else { setMetaAdError(data.error ?? 'Failed to save.') }
    } finally { setMetaAdLoading(false) }
  }

  async function handleSaveTikTokAdvertiserId() {
    setTiktokAdError('')
    if (!tiktokAdInput.trim()) { setTiktokAdError('Advertiser ID is required.'); return }
    setTiktokAdLoading(true)
    try {
      const res = await fetch('/api/integrations/tiktok/ad-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advertiserId: tiktokAdInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setTiktokAdInput(''); setToast({ type: 'success', message: 'TikTok advertiser ID saved.' }) }
      else { setTiktokAdError(data.error ?? 'Failed to save.') }
    } finally { setTiktokAdLoading(false) }
  }

  async function handleSaveLinkedInAccountId() {
    setLinkedinAdError('')
    if (!linkedinAdInput.trim()) { setLinkedinAdError('Account ID is required.'); return }
    setLinkedinAdLoading(true)
    try {
      const res = await fetch('/api/integrations/linkedin/ad-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: linkedinAdInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) { await fetchStatus(); setLinkedinAdInput(''); setToast({ type: 'success', message: 'LinkedIn account ID saved.' }) }
      else { setLinkedinAdError(data.error ?? 'Failed to save.') }
    } finally { setLinkedinAdLoading(false) }
  }

  function getServiceState(id: string): 'not-connected' | 'partial' | 'connected' {
    if (id === 'google') {
      if (!status.google) return 'not-connected'
      return status.propertyId ? 'connected' : 'partial'
    }
    if (id === 'google-ads') {
      if (!status.google) return 'not-connected'
      return status.googleAdsCustomerId ? 'connected' : 'partial'
    }
    if (id === 'gsc') {
      if (!status.google) return 'not-connected'
      return status.gscSiteUrl ? 'connected' : 'partial'
    }
    if (id === 'gbp') {
      if (!status.google) return 'not-connected'
      return status.gbpLocationId ? 'connected' : 'partial'
    }
    if (id === 'wordpress') return status.wordpress ? 'connected' : 'not-connected'
    if (id === 'meta') {
      if (!status.meta) return 'not-connected'
      return status.metaAdAccountId ? 'connected' : 'partial'
    }
    if (id === 'tiktok') {
      if (!status.tiktok) return 'not-connected'
      return status.tiktokAdvertiserId ? 'connected' : 'partial'
    }
    if (id === 'linkedin') {
      if (!status.linkedin) return 'not-connected'
      return status.linkedinAccountId ? 'connected' : 'partial'
    }
    return 'not-connected'
  }

  function renderGa4Picker() {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select your GA4 property</p>
        {ga4PickerLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading properties…
          </div>
        ) : ga4PickerError ? (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{ga4PickerError}</p>
        ) : ga4Properties.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No GA4 properties found in your account.</p>
        ) : (
          <select
            value={selectedGa4}
            onChange={(e) => setSelectedGa4(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">— select a property —</option>
            {ga4Properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.account}</option>
            ))}
          </select>
        )}
        {ga4SaveError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{ga4SaveError}</p>}
        <div className="flex gap-2">
          <Button onClick={handleSaveGa4} disabled={ga4SaveLoading || ga4PickerLoading || ga4Properties.length === 0} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
            {ga4SaveLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
          </Button>
          <Button variant="outline" onClick={() => setActivePicker(null)} className="shrink-0">Cancel</Button>
        </div>
      </div>
    )
  }

  function renderGscPicker() {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select your Search Console site</p>
        {gscPickerLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading sites…
          </div>
        ) : gscPickerError ? (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{gscPickerError}</p>
        ) : gscSites.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No verified sites found in your Search Console.</p>
        ) : (
          <select
            value={selectedGsc}
            onChange={(e) => setSelectedGsc(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">— select a site —</option>
            {gscSites.map((s) => (
              <option key={s.url} value={s.url}>{s.url}</option>
            ))}
          </select>
        )}
        {gscSaveError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{gscSaveError}</p>}
        <div className="flex gap-2">
          <Button onClick={handleSaveGsc} disabled={gscSaveLoading || gscPickerLoading || gscSites.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
            {gscSaveLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
          </Button>
          <Button variant="outline" onClick={() => setActivePicker(null)} className="shrink-0">Cancel</Button>
        </div>
      </div>
    )
  }

  function renderGbpPicker() {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select your Google Business location</p>
        {gbpPickerLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading locations…
          </div>
        ) : gbpPickerError ? (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{gbpPickerError}</p>
        ) : gbpLocations.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No verified locations found in your Google Business Profile.</p>
        ) : (
          <select
            value={selectedGbp}
            onChange={(e) => setSelectedGbp(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— select a location —</option>
            {gbpLocations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} {l.address ? `(${l.address})` : ''}</option>
            ))}
          </select>
        )}
        {gbpSaveError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{gbpSaveError}</p>}
        <div className="flex gap-2">
          <Button onClick={handleSaveGbp} disabled={gbpSaveLoading || gbpPickerLoading || gbpLocations.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
            {gbpSaveLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
          </Button>
          <Button variant="outline" onClick={() => setActivePicker(null)} className="shrink-0">Cancel</Button>
        </div>
      </div>
    )
  }

  function renderAdsPicker() {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Enter your Google Ads Customer ID</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Find it in Google Ads → click the help icon → Customer ID. Format: 123-456-7890
        </p>
        <input
          type="text"
          value={adsCustomerInput}
          onChange={(e) => setAdsCustomerInput(e.target.value)}
          placeholder="123-456-7890"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {adsCustomerError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{adsCustomerError}</p>}
        <div className="flex gap-2">
          <Button onClick={handleSaveAds} disabled={adsCustomerLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {adsCustomerLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
          </Button>
          <Button variant="outline" onClick={() => { setActivePicker(null); setAdsCustomerInput(''); setAdsCustomerError('') }} className="shrink-0">Cancel</Button>
        </div>
      </div>
    )
  }

  function getPickerForCard(id: string) {
    if (id === 'google' && activePicker === 'ga4') return renderGa4Picker()
    if (id === 'google-ads' && activePicker === 'ads') return renderAdsPicker()
    if (id === 'gsc' && activePicker === 'gsc') return renderGscPicker()
    if (id === 'gbp' && activePicker === 'gbp') return renderGbpPicker()
    return null
  }

  const needsMetaAdAccount = status.meta && !status.metaAdAccountId
  const needsTikTokAdvertiserId = status.tiktok && !status.tiktokAdvertiserId
  const needsLinkedInAccountId = status.linkedin && !status.linkedinAccountId

  return (
    <div className="max-w-5xl mx-auto py-6">
      {toast && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Sources</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your marketing platforms to pull data into Onelytics.
        </p>
      </div>

      {/* TikTok advertiser ID prompt */}
      {needsTikTokAdvertiserId && (
        <div className="mb-6 p-4 border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <p className="text-sm font-medium text-teal-800 dark:text-teal-300 mb-1">One more step — enter your TikTok Advertiser ID</p>
          <p className="text-xs text-teal-700 dark:text-teal-400 mb-3">Find it in TikTok Ads Manager → Account settings. Numeric ID only.</p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input type="text" value={tiktokAdInput} onChange={(e) => setTiktokAdInput(e.target.value)} placeholder="1234567890"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {tiktokAdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{tiktokAdError}</p>}
            </div>
            <Button onClick={handleSaveTikTokAdvertiserId} disabled={tiktokAdLoading} className="bg-teal-500 hover:bg-teal-600 text-white shrink-0">
              {tiktokAdLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
            </Button>
          </div>
        </div>
      )}

      {/* LinkedIn account ID prompt */}
      {needsLinkedInAccountId && (
        <div className="mb-6 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">One more step — enter your LinkedIn Ad Account ID</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">Find it in LinkedIn Campaign Manager → Account Assets. Numeric ID only.</p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input type="text" value={linkedinAdInput} onChange={(e) => setLinkedinAdInput(e.target.value)} placeholder="1234567890"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {linkedinAdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{linkedinAdError}</p>}
            </div>
            <Button onClick={handleSaveLinkedInAccountId} disabled={linkedinAdLoading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              {linkedinAdLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
            </Button>
          </div>
        </div>
      )}

      {/* Meta ad account picker */}
      {needsMetaAdAccount && (
        <div className="mb-6 p-4 border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
          <p className="text-sm font-medium text-pink-800 dark:text-pink-300 mb-1">One more step — select your Meta Ad Account</p>
          <p className="text-xs text-pink-700 dark:text-pink-400 mb-3">
            Choose the ad account you want to pull data from.
          </p>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {metaAdAccountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-pink-700 dark:text-pink-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching your ad accounts…
                </div>
              ) : metaAdAccounts.length > 0 ? (
                <select
                  value={metaAdInput}
                  onChange={(e) => setMetaAdInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an ad account…</option>
                  {metaAdAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id}){!a.active ? ' — inactive' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={metaAdInput} onChange={(e) => setMetaAdInput(e.target.value)} placeholder="act_1234567890"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              {metaAdError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{metaAdError}</p>}
            </div>
            <Button onClick={handleSaveMetaAdAccount} disabled={metaAdLoading || !metaAdInput} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              {metaAdLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const serviceState = getServiceState(integration.id)
          const connected = serviceState === 'connected'
          const partial = serviceState === 'partial'
          const isActive = actionLoading === integration.id
          const isAvailable = integration.phase === 2
          const showWpForm = integration.id === 'wordpress' && wpFormOpen && !connected
          const pickerPanel = getPickerForCard(integration.id)
          const isGoogleService = integration.id === 'google' || integration.id === 'google-ads' || integration.id === 'gsc' || integration.id === 'gbp'

          return (
            <Card key={integration.id} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col">
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
                          <CheckCircle2 className="w-3 h-3" />Connected
                        </Badge>
                      ) : partial ? (
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 font-medium border-0 gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {PARTIAL_LABELS[integration.id] ?? 'Needs setup'}
                        </Badge>
                      ) : isAvailable ? (
                        <Badge variant="outline" className="text-gray-500 font-medium">Not Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 font-medium">Phase {integration.phase}</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{integration.description}</p>

                {showWpForm && (
                  <div className="mb-4 space-y-3">
                    <InputField label="Site URL (root domain, not /wp-admin)" value={wpSiteUrl} onChange={setWpSiteUrl} placeholder="https://abilityschoolnj.org" />
                    <InputField label="Username" value={wpUsername} onChange={setWpUsername} placeholder="admin" />
                    <InputField label="Application Password" value={wpAppPassword} onChange={setWpAppPassword} placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" type="password" />
                    {wpError && <p className="text-xs text-red-600 dark:text-red-400">{wpError}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Generate an Application Password in WordPress → Users → Profile.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleConnectWordPress} disabled={wpLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                        {wpLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}Save & Connect
                      </Button>
                      <Button variant="outline" onClick={() => { setWpFormOpen(false); setWpError('') }} className="shrink-0">Cancel</Button>
                    </div>
                  </div>
                )}

                {pickerPanel}

                {!showWpForm && !pickerPanel && (
                  isAvailable ? (
                    connected ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                          onClick={() => handleDisconnect(integration.id)}
                          disabled={isActive}
                        >
                          {isActive ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Disconnect
                        </Button>
                        {isGoogleService && (
                          <Button variant="outline" className="shrink-0" onClick={() => handleConnect(integration.id)} disabled={isActive}>
                            Change
                          </Button>
                        )}
                      </div>
                    ) : partial ? (
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                        onClick={() => handleConnect(integration.id)}
                        disabled={isActive}
                      >
                        {isActive && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Set Up {integration.name}
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
