import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Onelytics',
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: May 24, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
        <p className="text-gray-700 leading-relaxed">
          By accessing or using Onelytics (&ldquo;the Service&rdquo;), operated by Growth Driven Digital,
          you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
        <p className="text-gray-700 leading-relaxed">
          Onelytics is a marketing analytics platform that aggregates data from connected advertising
          and analytics accounts (Google Ads, Google Analytics, Meta Ads, LinkedIn, TikTok, WordPress)
          into a unified dashboard and reporting tool for marketing agencies and businesses.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
          <li>You must provide accurate information when creating an account.</li>
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You must be at least 18 years old to use the Service.</li>
          <li>One person or legal entity may not maintain more than one free account.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
        <p className="text-gray-700 leading-relaxed mb-3">You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
          <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
          <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
          <li>Use the Service to store or transmit malicious code.</li>
          <li>Resell or sublicense access to the Service without prior written consent.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Third-Party Integrations</h2>
        <p className="text-gray-700 leading-relaxed">
          By connecting third-party accounts (Meta, Google, LinkedIn, TikTok, etc.), you authorise
          Onelytics to access data from those platforms on your behalf via their official APIs, solely
          to provide the Service. You are responsible for ensuring your use of connected platform data
          complies with the respective platform&apos;s terms of service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
        <p className="text-gray-700 leading-relaxed">
          The Service, including its design, code, and branding, is owned by Growth Driven Digital.
          Your data remains yours. We claim no ownership over the analytics data retrieved from your
          connected accounts.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
        <p className="text-gray-700 leading-relaxed">
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind, either express or implied.
          We do not warrant that the Service will be uninterrupted, error-free, or that data retrieved
          from third-party platforms will be accurate or complete.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
        <p className="text-gray-700 leading-relaxed">
          To the fullest extent permitted by law, Growth Driven Digital shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the Service,
          including loss of data or revenue.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
        <p className="text-gray-700 leading-relaxed">
          We reserve the right to suspend or terminate your account at any time for violations of
          these Terms. You may terminate your account at any time by contacting us. Upon termination,
          your data will be deleted within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
        <p className="text-gray-700 leading-relaxed">
          We may update these Terms from time to time. Continued use of the Service after changes
          constitutes acceptance of the updated Terms. We will notify users of material changes by
          email where possible.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          For any questions about these Terms, contact us at:{' '}
          <a href="mailto:mohit@growthdrivendigital.com" className="text-blue-600 underline">
            mohit@growthdrivendigital.com
          </a>
        </p>
      </section>
    </main>
  )
}
