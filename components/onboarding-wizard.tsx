'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Users, Plug, ArrowRight, Loader2, Check } from 'lucide-react'

const STEPS = [
  { id: 'agency', label: 'Your Agency', icon: Building2 },
  { id: 'client', label: 'First Client', icon: Users },
  { id: 'connect', label: 'Connect', icon: Plug },
]

export function OnboardingWizard() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [orgName, setOrgName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [saving, setSaving] = useState(false)

  if (session?.user?.onboarded) return null

  async function finish(goConnect = false) {
    setSaving(true)
    try {
      await fetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: orgName.trim() || undefined,
          workspaceName: workspaceName.trim() || undefined,
        }),
      })
      await update({ onboarded: true })
      if (goConnect) router.push('/connect')
      else router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <p className="text-xs text-blue-200 font-medium uppercase tracking-wider mb-1">Getting started</p>
          <h2 className="text-xl font-bold text-white">Welcome to Onelytics</h2>
          <p className="text-sm text-blue-200 mt-0.5">Let&apos;s set up your agency in 3 quick steps.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-gray-100 text-gray-400 dark:bg-gray-800'
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                i === step ? 'text-gray-900 dark:text-white' : 'text-gray-400'
              }`}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-1 ${i < step ? 'bg-green-300' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6 min-h-[200px] flex flex-col">
          {step === 0 && (
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">What&apos;s your agency called?</h3>
                <p className="text-sm text-gray-500">This is your top-level organisation — all client workspaces live under it.</p>
              </div>
              <Input
                autoFocus
                placeholder="e.g. Acme Marketing Agency"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setStep(1)}
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Name your first client workspace</h3>
                <p className="text-sm text-gray-500">Each client gets their own workspace with separate integrations, reports, and settings.</p>
              </div>
              <Input
                autoFocus
                placeholder="e.g. Acme Corp"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Connect your first integration</h3>
                <p className="text-sm text-gray-500">Link Google Analytics, Google Ads, Meta, or any other platform to start pulling live data into your dashboard.</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-400">
                You can connect integrations now or skip and do it later from <span className="font-medium text-gray-900 dark:text-white">Connect Accounts</span> in the sidebar.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={saving}>
              Back
            </Button>
          ) : (
            <button
              onClick={() => finish(false)}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={saving}
            >
              Skip setup
            </button>
          )}

          <div className="flex gap-2">
            {step === 2 ? (
              <>
                <Button variant="outline" onClick={() => finish(false)} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Skip for now'}
                </Button>
                <Button
                  onClick={() => finish(true)}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Connect integrations <ArrowRight className="w-3.5 h-3.5" /></>}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setStep(s => s + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
