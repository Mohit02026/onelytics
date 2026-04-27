import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your workspace and account preferences.</p>
      </div>

      <div className="space-y-6">
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Workspace Profile</CardTitle>
            <CardDescription>Update your workspace details and branding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Workspace Name</label>
              <Input defaultValue="My Workspace" className="max-w-md dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage who has access to this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
              Team management will be available in Phase 7.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
