import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Northbridge Digital. Read our terms for website design, SEO, social media, and digital growth services.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#ffffff08] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
              <span className="text-sm font-bold text-white">NB</span>
            </div>
            <span className="bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-lg font-bold text-transparent">
              Northbridge Digital
            </span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#888]">Last updated: April 11, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#ccc]">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Agreement to Terms</h2>
            <p>By accessing or using services provided by Northbridge Digital ("Company," "we," "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Services</h2>
            <p>Northbridge Digital provides digital growth services including but not limited to: website design and development, search engine optimization (SEO), social media management, content marketing, brand strategy, and digital systems implementation. Services are organized into two tracks (Build and Growth) with monthly subscription tiers.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Subscription Terms</h2>
            <p>All service packages require a 12-month minimum commitment. Subscriptions are billed monthly at the rate specified in your service agreement. Payment is due on the billing date each month. Failure to pay may result in suspension of services after a 14-day grace period.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Cancellation and Refunds</h2>
            <p>Early cancellation within the 12-month commitment period may incur an early termination fee equal to 50% of the remaining months on the agreement. Cancellation requests must be submitted in writing at least 30 days before the next billing cycle. No refunds are provided for partial months of service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Client Responsibilities</h2>
            <p>Clients are responsible for: providing accurate business information, timely responses to requests for content or approvals, maintaining access credentials for third-party services, and ensuring they have legal authority to authorize services on behalf of their business.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Intellectual Property</h2>
            <p>All work product created by Northbridge Digital for clients becomes the client's property upon full payment. Northbridge Digital retains the right to use anonymized case studies and portfolio examples. Pre-existing tools, templates, and systems used in service delivery remain Northbridge Digital's property.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Limitation of Liability</h2>
            <p>Northbridge Digital's total liability for any claim arising from services shall not exceed the total fees paid by the client in the 12 months preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages. We do not guarantee specific search engine rankings, traffic levels, or revenue outcomes.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Data and Privacy</h2>
            <p>We handle client data in accordance with our <Link href="/privacy" className="text-[#4FC3F7] hover:underline">Privacy Policy</Link>. Client data is not shared with third parties except as necessary to deliver services (e.g., domain registrars, analytics providers).</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Service Level</h2>
            <p>We aim to respond to client communications within 1 business day. Monthly deliverables are scoped according to the selected service tier. Priority support is available on Platform and Momentum tier packages.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Modifications</h2>
            <p>Northbridge Digital reserves the right to modify these terms with 30 days written notice. Continued use of services after modifications constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. Governing Law</h2>
            <p>These terms are governed by the laws of the State of Michigan, USA. Any disputes shall be resolved in the courts of Michigan.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">12. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:hello@thenorthbridgemi.org" className="text-[#4FC3F7] hover:underline">hello@thenorthbridgemi.org</a>.</p>
          </section>
        </div>

        <div className="mt-12 border-t border-[#222] pt-6">
          <Link href="/" className="text-sm text-[#888] hover:text-white">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
