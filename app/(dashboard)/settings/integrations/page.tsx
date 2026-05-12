'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw } from 'lucide-react'

interface IntegrationStatus {
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

interface IntegrationDef {
  id: string
  label: string
  description: string
  connectedKey: keyof IntegrationStatus
  detailKey?: keyof IntegrationStatus
  detailLabel?: string
  disconnectService?: string
  disconnectProvider?: string
  connectHref: string
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'ga4',
    label: 'Google Analytics (GA4)',
    description: 'Website sessions, users, traffic sources.',
    connectedKey: 'google',
    detailKey: 'propertyId',
    detailLabel: 'Property ID',
    disconnectService: 'ga4',
    connectHref: '/connect',
  },
  {
    id: 'ads',
    label: 'Google Ads',
    description: 'Ad spend, campaigns, keywords, conversions.',
    connectedKey: 'google',
    detailKey: 'googleAdsCustomerId',
    detailLabel: 'Customer ID',
    disconnectService: 'ads',
    connectHref: '/connect',
  },
  {
    id: 'gsc',
    label: 'Google Search Console',
    description: 'Organic keyword rankings and impressions.',
    connectedKey: 'google',
    detailKey: 'gscSiteUrl',
    detailLabel: 'Site URL',
    disconnectService: 'gsc',
    connectHref: '/connect',
  },
  {
    id: 'gbp',
    label: 'Google Business Profile',
    description: 'Profile views, calls, directions, messages.',
    connectedKey: 'gbp',
    detailKey: 'gbpLocationId',
    detailLabel: 'Location ID',
    disconnectService: 'gbp',
    connectHref: '/connect',
  },
  {
    id: 'meta',
    label: 'Meta Ads',
    description: 'Facebook & Instagram ad performance.',
    connectedKey: 'meta',
    detailKey: 'metaAdAccountId',
    detailLabel: 'Ad Account ID',
    disconnectProvider: 'meta',
    connectHref: '/connect',
  },
  {
    id: 'tiktok',
    label: 'TikTok Ads',
    description: 'TikTok campaign spend and video metrics.',
    connectedKey: 'tiktok',
    detailKey: 'tiktokAdvertiserId',
    detailLabel: 'Advertiser ID',
    disconnectProvider: 'tiktok',
    connectHref: '/connect',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Ads',
    description: 'LinkedIn campaign spend and engagement.',
    connectedKey: 'linkedin',
    detailKey: 'linkedinAccountId',
    detailLabel: 'Account ID',
    disconnectProvider: 'linkedin',
    connectHref: '/connect',
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    description: 'Blog posts, pages, comments.',
    connectedKey: 'wordpress',
    detailKey: 'wpSiteUrl',
    detailLabel: 'Site URL',
    disconnectProvider: 'wordpress',
    connectHref: '/connect',
  },
]

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/status')
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStatus() }, [])

  async function disconnect(integration: IntegrationDef) {
    setDisconnecting(integration.id)
    try {
      if (integration.disconnectService) {
        await fetch(`/api/integrations/google/disconnect?service=${integration.disconnectService}`, { method: 'POST' })
      } else if (integration.disconnectProvider) {
        await fetch(`/api/integrations/${integration.disconnectProvider}/disconnect`, { method: 'POST' })
      }
      await loadStatus()
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading integrations…</span>
      </div>
    )
  }

  const connected = INTEGRATIONS.filter((i) => status?.[i.connectedKey] && (i.detailKey ? !!status[i.detailKey] : true))
  const disconnectedList = INTEGRATIONS.filter((i) => !connected.includes(i))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Connected Integrations</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {connected.length} of {INTEGRATIONS.length} connected
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStatus} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {connected.map((integration) => {
                const detail = integration.detailKey ? status?.[integration.detailKey] : null
                return (
                  <div key={integration.id} className="flex items-center gap-4 px-5 py-4">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{integration.label}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {detail
                          ? <>{integration.detailLabel}: <span className="font-mono">{String(detail)}</span></>
                          : integration.description
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                        Connected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnect(integration)}
                        disabled={disconnecting === integration.id}
                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2"
                      >
                        {disconnecting === integration.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : 'Disconnect'
                        }
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Connected */}
      {disconnectedList.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Not Connected</h3>
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {disconnectedList.map((integration) => (
                  <div key={integration.id} className="flex items-center gap-4 px-5 py-4">
                    <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{integration.label}</p>
                      <p className="text-xs text-gray-400">{integration.description}</p>
                    </div>
                    <Link href={integration.connectHref}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                        <ExternalLink className="w-3 h-3" />
                        Connect
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-gray-400">
        To reconnect a service or update credentials, go to the{' '}
        <Link href="/connect" className="text-blue-500 hover:underline">Connect page</Link>.
      </p>
    </div>
  )
}
