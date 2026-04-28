'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, BarChart3, Search, Share2, Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface ConnectionStatus {
  google: boolean
  meta: boolean
  propertyId: string | null
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
    phase: 3,
  },
  {
    id: 'gsc',
    name: 'Search Console',
    icon: Search,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    description: 'Analyze organic search traffic and keyword rankings.',
    phase: 4,
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    icon: Share2,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/50',
    description: 'Track Facebook and Instagram ad performance.',
    phase: 5,
  },
]

function isConnected(id: string, status: ConnectionStatus): boolean {
  if (id === 'google') return status.google
  if (id === 'meta') return status.meta
  return false
}

export default function ConnectPage() {
  const [status, setStatus] = useState<ConnectionStatus>({ google: false, meta: false, propertyId: null })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/integrations/status')
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  async function handleConnect(id: string) {
    if (id !== 'google') return // only Google implemented in Phase 2
    setActionLoading(id)
    try {
      const res = await fetch('/api/integrations/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) await fetchStatus()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDisconnect(id: string) {
    if (id !== 'google') return
    setActionLoading(id)
    try {
      const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' })
      if (res.ok) await fetchStatus()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Sources</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your marketing platforms to pull data into Onelytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const connected = isConnected(integration.id, status)
          const isActive = actionLoading === integration.id
          const isAvailable = integration.phase === 2 // only GA4 in Phase 2

          return (
            <Card
              key={integration.id}
              className="dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${integration.bg} ${integration.color}`}
                  >
                    <integration.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {loading ? (
                        <span className="inline-block w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ) : connected ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 font-medium border-0 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </Badge>
                      ) : isAvailable ? (
                        <Badge variant="outline" className="text-gray-500 font-medium">
                          Not Connected
                        </Badge>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {integration.description}
                </p>

                {isAvailable ? (
                  connected ? (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={isActive}
                    >
                      {isActive ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
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
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
