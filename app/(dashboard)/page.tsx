import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">O</span>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to Onelytics
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
        Your unified marketing dashboard. Connect your first integration to start seeing your
        analytics data all in one place.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl text-left">
        <Link href="/connect">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer group dark:hover:border-blue-500 dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm font-bold">
                  GA
                </span>
                Google Analytics
              </CardTitle>
              <CardDescription>Connect GA4 to view web traffic</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-400"
              >
                <Plus className="w-4 h-4 mr-2" /> Connect
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/connect">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer group dark:hover:border-blue-500 dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
                  Ads
                </span>
                Google Ads
              </CardTitle>
              <CardDescription>Connect Ads to view campaign spend</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-400"
              >
                <Plus className="w-4 h-4 mr-2" /> Connect
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
