import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#ffffff08] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
              <span className="text-sm font-bold text-white">NB</span>
            </div>
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-lg font-bold text-transparent">
              Northbridge Digital
            </span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#888]">Last updated: April 11, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#ccc]">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Information We Collect</h2>
            <p className="mb-2">We collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Contact information (name, email, phone number)</li>
              <li>Business information (company name, website, industry)</li>
              <li>Service preferences and project details</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Communications (emails, support requests, form submissions)</li>
            </ul>
            <p className="mt-3">We automatically collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Usage data when you access our dashboard</li>
              <li>Email interaction data (opens, clicks) for communications you've opted into</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and improve our services</li>
              <li>To communicate about your projects and account</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send service updates and reports</li>
              <li>To respond to support requests</li>
              <li>To improve our platform and service quality</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Information Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Service providers</strong> who help deliver our services (hosting, email, payment processing)</li>
              <li><strong>Third-party tools</strong> integrated at your request (domain registrars, analytics)</li>
              <li><strong>Legal requirements</strong> when required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Data Security</h2>
            <p>We protect your data using industry-standard measures including encrypted connections (HTTPS/TLS), secure database access controls, and regular security audits. Payment information is handled by Stripe and never stored on our servers.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Data Retention</h2>
            <p>We retain your data for the duration of your service agreement plus 12 months. After that period, data is archived or deleted unless required by law. You may request data export or deletion at any time.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Email Communications</h2>
            <p>We send transactional emails related to your account and services. Marketing emails require your explicit consent. You can unsubscribe from marketing emails at any time. We comply with CAN-SPAM and applicable email regulations. We do not send communications between 9 PM and 8 AM in your timezone.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Cookies and Tracking</h2>
            <p>Our website uses essential cookies for authentication and session management. We do not use third-party advertising trackers. If we add analytics, we will use privacy-focused tools and update this policy accordingly.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Children's Privacy</h2>
            <p>Our services are not directed at individuals under 18. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Changes to This Policy</h2>
            <p>We may update this policy periodically. We will notify you of material changes via email or dashboard notification at least 30 days before changes take effect.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. Contact</h2>
            <p>For privacy-related questions or to exercise your data rights, contact us at <a href="mailto:hello@thenorthbridgemi.org" className="text-[#3b82f6] hover:underline">hello@thenorthbridgemi.org</a>.</p>
            <p className="mt-2">Northbridge Digital<br />Michigan, USA</p>
          </section>
        </div>

        <div className="mt-12 border-t border-[#222] pt-6">
          <Link href="/" className="text-sm text-[#888] hover:text-white">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
