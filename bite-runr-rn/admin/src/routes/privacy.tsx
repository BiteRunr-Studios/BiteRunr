import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: March 14, 2026
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <section>
            <p>
              BiteRunr ("we", "us", or "our") operates the BiteRunr mobile
              application (the "App"). This Privacy Policy explains how we
              collect, use, and protect your personal information when you use
              our App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Information We Collect
            </h2>

            <h3 className="font-medium mt-4 mb-2">Account Information</h3>
            <p>
              When you create an account, we collect your email address, first
              name, last name, and an optional profile picture. You may also
              sign in using Google or GitHub, in which case we receive basic
              profile information from those providers.
            </p>

            <h3 className="font-medium mt-4 mb-2">Order & Payment Data</h3>
            <p>
              We collect information about the group food orders you create or
              join, including item selections, quantities, prices, and order
              comments. Payment processing is handled by Stripe. We store your
              Stripe customer ID and payment transaction records but do not
              store your full credit card number — that is handled entirely by
              Stripe in accordance with PCI-DSS standards.
            </p>

            <h3 className="font-medium mt-4 mb-2">Payout Information</h3>
            <p>
              If you act as a runner and receive payouts, we use Stripe Connect
              to facilitate transfers. Stripe collects and manages your bank
              account or debit card details directly. We store your Stripe
              Connect account ID and payout status.
            </p>

            <h3 className="font-medium mt-4 mb-2">Social Features</h3>
            <p>
              We store your friend connections and friend requests within the
              App. Other users can search for you by name or email to send
              friend requests.
            </p>

            <h3 className="font-medium mt-4 mb-2">
              Device & Push Notifications
            </h3>
            <p>
              If you enable push notifications, we store your device push token
              to send you notifications about order updates, friend requests,
              and payment activity. You can disable notifications at any time in
              your device settings.
            </p>

            <h3 className="font-medium mt-4 mb-2">Camera & Photos</h3>
            <p>
              The App may request access to your camera to scan QR codes for
              joining group orders, and access to your photo library to set a
              profile picture. You may also take photos of receipts for price
              verification. Receipt images and related order text may be sent
              to AI processing providers to parse receipt lines or organize
              order summaries, and we do not keep receipt images as permanent
              storage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account</li>
              <li>To facilitate group food orders and split payments</li>
              <li>To process payments and runner payouts via Stripe</li>
              <li>
                To send you push notifications about order and payment activity
              </li>
              <li>To enable social features such as friend connections</li>
              <li>
                To send transactional emails (sign-in codes, email
                verification, password resets)
              </li>
              <li>To parse receipt images and structure order text</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Third-Party Services
            </h2>
            <p className="mb-3">
              We use the following third-party services to operate the App:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Stripe</strong> — Payment processing and runner payouts.
                Stripe processes your payment card and bank account information
                under its own privacy policy.
              </li>
              <li>
                <strong>Convex</strong> — Backend infrastructure and database
                hosting for app data.
              </li>
              <li>
                <strong>Resend</strong> — Transactional email delivery (sign-in
                codes, verification emails).
              </li>
              <li>
                <strong>OpenRouter and model providers</strong> — AI-assisted
                receipt parsing and order summarization. Receipt images and
                related order text are sent only for processing.
              </li>
              <li><strong>Expo</strong> — Push notification delivery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              4. Data We Do Not Collect
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                We do not collect GPS location data or track your physical
                location.
              </li>
              <li>
                We do not use analytics or advertising tracking SDKs (no Google
                Analytics, no ad identifiers).
              </li>
              <li>We do not sell your personal data to third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your account and order data for as long as your account
              is active. Receipt images are deleted immediately after
              processing. Email verification codes expire after 10 minutes.
              Order invite codes expire after 24 hours. If you delete your
              account, we will remove your personal data from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p>
              We take reasonable measures to protect your information, including
              encrypted communications (HTTPS), secure webhook signature
              verification, and secure token-based authentication. Payment data
              is handled by Stripe, which is PCI-DSS compliant.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and personal data</li>
              <li>Withdraw consent for push notifications at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              8. Children's Privacy
            </h2>
            <p>
              The App is not intended for children under 13. We do not knowingly
              collect personal information from children under 13. If you
              believe a child under 13 has provided us with personal
              information, please contact us so we can delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes through the App or by email. Your
              continued use of the App after changes constitutes acceptance of
              the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to
              exercise your data rights, please contact us at{' '}
              <a
                href="mailto:support@biterunr.com"
                className="text-blue-600 underline"
              >
                support@biterunr.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
