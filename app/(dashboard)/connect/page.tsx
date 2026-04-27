import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, BarChart3, Search, Share2 } from 'lucide-react';

export default function ConnectPage() {
  const integrations = [
    { id: 'ga4', name: 'Google Analytics 4', icon: BarChart3, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/50', status: 'disconnected', description: 'Track website traffic, user behavior, and conversions.' },
    { id: 'ads', name: 'Google Ads', icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50', status: 'disconnected', description: 'Monitor ad spend, clicks, CPC, and campaign ROAS.' },
    { id: 'gsc', name: 'Search Console', icon: Search, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/50', status: 'disconnected', description: 'Analyze organic search traffic and keyword rankings.' },
    { id: 'meta', name: 'Meta Ads', icon: Share2, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/50', status: 'disconnected', description: 'Track Facebook and Instagram ad performance.' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Sources</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Connect your marketing platforms to pull data into Onelytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${integration.bg} ${integration.color}`}>
                  <integration.icon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {integration.status === 'connected' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 font-medium border-0">Connected</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 font-medium">Not Connected</Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {integration.description}
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                Connect {integration.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
