"use client";

import Nav from "@/components/Nav";
import { APP_NAME } from "@/lib/brand";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="bg-saffron/10 border-l-2 border-saffron2 px-4 py-3 mb-8 text-sm text-ink">
          <strong>Draft document.</strong> This is a starting template, not legal advice. Have it
          reviewed by a qualified professional for your jurisdiction before relying on it, and
          replace every <code>[bracketed placeholder]</code> below with your actual details.
        </div>

        <h1 className="font-display text-3xl text-ink mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink/50 mb-8">Last updated: [DATE]</p>

        <div className="prose-legal space-y-6 text-sm text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-2">1. Who we are</h2>
            <p>
              {APP_NAME} ("we," "us," "our") operates this website and mobile application
              (together, the "Platform"), through which you can order food, book catering
              services, and purchase items from independent brand partners who sell through our
              Platform. This policy explains what personal information we collect, how we use it,
              and the choices you have.
            </p>
            <p className="mt-2">
              Registered business name: [YOUR LEGAL BUSINESS NAME]<br />
              Registered address: [YOUR BUSINESS ADDRESS]<br />
              Contact email: [YOUR CONTACT EMAIL]
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">2. Information we collect</h2>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account information:</strong> name, email address, phone number, and password (stored as a secure hash, never in plain text).</li>
              <li><strong>Order information:</strong> delivery/event address, order contents, order history, event date/time/guest count for bookings.</li>
              <li><strong>Location information:</strong> if you choose to use "use my current location" at checkout, we collect your device's GPS coordinates at that moment. We do not track your location in the background.</li>
              <li><strong>Payment information:</strong> we do not store your card, UPI, or bank details ourselves — payments are processed by our payment partner, Razorpay, under their own privacy and security practices.</li>
              <li><strong>Communications:</strong> messages you send through our in-app chat with our support team, and reviews you submit.</li>
              <li><strong>Usage information:</strong> pages visited, actions taken, and device/browser information, collected automatically to help us operate and improve the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">3. How we use your information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and manage your account</li>
              <li>To process, fulfill, and deliver your orders and bookings</li>
              <li>To process payments (via Razorpay) and prevent fraud</li>
              <li>To communicate with you about your orders, and to respond to support requests</li>
              <li>To send you offers or promotional notifications, where you have not opted out</li>
              <li>To operate our brand-partner marketplace, including sharing your name, phone
                number, and order details with the specific brand partner(s) whose items you
                ordered, solely so they can prepare and fulfill that order</li>
              <li>To improve, secure, and maintain the Platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">4. Who we share information with</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Razorpay</strong> (payment processing)</li>
              <li><strong>[YOUR SMS PROVIDER]</strong> (sending OTP codes for phone login, if enabled)</li>
              <li><strong>Cloudinary</strong> (secure storage of images/videos uploaded to the Platform)</li>
              <li><strong>Brand partners</strong>, limited to order details necessary for them to
                fulfill items you've ordered from them</li>
              <li>Law enforcement or regulators, where required by applicable law</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">5. Data security</h2>
            <p>
              We use industry-standard measures to protect your information, including encrypted
              connections (HTTPS), hashed passwords, and access controls limiting who can view
              your data internally. No system is completely secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">6. Data retention</h2>
            <p>
              We retain your account and order information for as long as your account is active,
              and for a reasonable period afterward as required for accounting, legal, or dispute
              resolution purposes. You may request deletion of your account as described below.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">7. Your rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal information
              by contacting us at [YOUR CONTACT EMAIL]. You may also update most of your account
              details directly from your profile, and opt out of promotional notifications from
              the Notifications settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">8. Cookies and local storage</h2>
            <p>
              We use browser local storage (not third-party tracking cookies) to keep you signed
              in and to remember items in your cart between visits.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">9. Children's privacy</h2>
            <p>
              The Platform is not directed at children under 18. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">10. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be reflected by
              updating the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">11. Contact us</h2>
            <p>Questions about this policy: [YOUR CONTACT EMAIL]</p>
          </section>
        </div>
      </div>
    </div>
  );
}
