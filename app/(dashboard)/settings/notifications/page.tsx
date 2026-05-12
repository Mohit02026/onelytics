'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Send } from 'lucide-react'

const EVENTS = [
  { label: 'Report generated', description: 'When a report finishes generating' },
  { label: 'Report failed', description: 'When report generation fails' },
  { label: 'Integration disconnected', description: 'When a connected account is removed' },
  { label: 'Member joined', description: 'When someone accepts a workspace invite' },
]

export default function NotificationsPage() {
  const [webhook, setWebhook] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/workspace/notifications')
      .then(r => r.json())
      .then(d => {
        const url = d.slackWebhookUrl ?? ''
        setWebhook(url)
        setSaved(url)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/workspace/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackWebhookUrl: webhook }),
      })
      if (res.ok) {
        setSaved(webhook)
        setStatus({ ok: true, msg: 'Saved' })
      } else {
        const d = await res.json()
        setStatus({ ok: false, msg: d.error ?? 'Failed to save' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    const url = saved || webhook
    if (!url) return
    setTesting(true)
    setStatus(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '✅ Test notification from Onelytics — your Slack alerts are working!',
        }),
      })
      setStatus(res.ok
        ? { ok: true, msg: 'Test message sent to Slack' }
        : { ok: false, msg: 'Slack returned an error — check your webhook URL' })
    } catch {
      setStatus({ ok: false, msg: 'Could not reach Slack — check the URL' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-gray-500 py-8"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span></div>
  }

  const isDirty = webhook !== saved

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <p className="text-sm text-gray-500 mt-0.5">Get Slack alerts when key events happen in this workspace.</p>
      </div>

      {/* Slack webhook */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 54 54" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
            <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
            <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
            <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.248a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386" fill="#E01E5A"/>
          </svg>
          <h4 className="font-medium text-sm text-gray-900 dark:text-white">Slack webhook</h4>
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
          >
            How to create a webhook <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={webhook}
            onChange={e => { setWebhook(e.target.value); setStatus(null) }}
            placeholder="https://hooks.slack.com/services/..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            onClick={handleTest}
            disabled={testing || (!webhook && !saved)}
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Test
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-4 py-2 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium transition-colors flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
          </button>
        </div>

        {status && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${status.ok ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
            {status.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {status.msg}
          </div>
        )}
      </div>

      {/* Events */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">Events that trigger a notification</h4>
        <div className="space-y-3">
          {EVENTS.map(e => (
            <div key={e.label} className="flex items-start gap-3">
              <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${saved ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${saved ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{e.label}</p>
                <p className="text-xs text-gray-500">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
        {!saved && (
          <p className="text-xs text-gray-400 mt-4">Add a webhook URL above to enable these alerts.</p>
        )}
      </div>
    </div>
  )
}
