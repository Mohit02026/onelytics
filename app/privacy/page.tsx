import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Onelytics',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: July 3, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
        <p className="text-gray-700 leading-relaxed">
          Onelytics (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a marketing analytics platform operated by
          Growth Driven Digital. This Privacy Policy explains how we collect, use, and protect
          information when you use our service at onelytics.app.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
          <li><strong>Account information:</strong> Name, email address, and password when you register.</li>
          <li><strong>Connected platform data:</strong> When you connect advertising or analytics accounts (Google Ads, Google Analytics, Meta Ads, LinkedIn, TikTok, WordPress), we access performance metrics such as spend, impressions, clicks, and conversions via those platforms&apos; official APIs.</li>
          <li><strong>Usage data:</strong> Pages visited, features used, and timestamps to improve the service.</li>
          <li><strong>OAuth tokens:</strong> Access tokens issued by third-party platforms to retrieve your data. These are encrypted at rest using AES-256-GCM.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
          <li>To display aggregated marketing analytics in your dashboard.</li>
          <li>To generate PDF reports on your behalf.</li>
          <li>To send notifications you configure (e.g. Slack alerts).</li>
          <li>To maintain and improve the platform.</li>
          <li>We do not sell your data or use it for advertising purposes.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Third-Party Platforms</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          Onelytics connects to the following platforms solely to retrieve analytics data on your behalf:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>Meta (Facebook / Instagram) — via Meta Marketing API</li>
          <li>Google — via Google Ads API, Google Analytics Data API, Search Console API, and Google Business Profile Performance API</li>
          <li>LinkedIn — via LinkedIn Marketing Developer Platform</li>
          <li>TikTok — via TikTok for Business API</li>
          <li>WordPress — via WordPress REST API</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mt-3">
          Data retrieved from these platforms is used only to populate your Onelytics dashboard and reports.
          We do not share this data with any other third parties.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
        <p className="text-gray-700 leading-relaxed">
          Analytics data is cached for up to 24 hours to reduce API calls. Account data is retained
          while your account is active. You may request deletion of your account and associated data
          at any time by contacting us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Data Deletion</h2>
        <p className="text-gray-700 leading-relaxed">
          You can disconnect any platform integration at any time from your Settings page, which
          immediately deletes the stored access tokens for that platform. To delete your full account
          and all associated data, email us at{' '}
          <a href="mailto:mohit@growthdrivendigital.com" className="text-blue-600 underline">
            mohit@growthdrivendigital.com
          </a>{' '}
          and we will process your request within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Security</h2>
        <p className="text-gray-700 leading-relaxed">
          All data is transmitted over HTTPS. OAuth tokens are encrypted at rest using AES-256-GCM.
          Passwords are hashed using bcrypt. We follow industry-standard practices to protect your information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
        <p className="text-gray-700 leading-relaxed">
          We use session cookies strictly for authentication purposes. We do not use tracking or
          advertising cookies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          For any privacy-related questions or data deletion requests, contact us at:{' '}
          <a href="mailto:mohit@growthdrivendigital.com" className="text-blue-600 underline">
            mohit@growthdrivendigital.com
          </a>
        </p>
      </section>
    </main>
  )
}
