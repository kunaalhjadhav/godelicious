"use client";

import Nav from "@/components/Nav";
import { APP_NAME } from "@/lib/brand";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="bg-saffron/10 border-l-2 border-saffron2 px-4 py-3 mb-8 text-sm text-ink">
          <strong>Draft document.</strong> This is a starting template, not legal advice. Have it
          reviewed by a qualified professional for your jurisdiction before relying on it, and
          replace every <code>[bracketed placeholder]</code> below with your actual details.
        </div>

        <h1 className="font-display text-3xl text-ink mb-2">Terms of Service</h1>
        <p className="text-sm text-ink/50 mb-8">Last updated: [DATE]</p>

        <div className="space-y-6 text-sm text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-2">1. Acceptance of terms</h2>
            <p>
              By creating an account or placing an order on {APP_NAME} (the "Platform"), you agree
              to these Terms of Service. If you do not agree, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">2. Description of service</h2>
            <p>
              The Platform allows you to browse and order food, book catering services (with
              optional staffing and add-ons), and purchase items from independent third-party
              brand partners who list their own menus on the Platform. {APP_NAME} facilitates
              these transactions but, for brand-partner items specifically, is not the seller of
              record — the brand partner is responsible for the preparation and quality of their
              own items.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">3. Accounts</h2>
            <p>
              You must provide accurate information when registering, and are responsible for
              keeping your login credentials confidential. You are responsible for all activity
              under your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">4. Orders and pricing</h2>
            <p>
              All prices are displayed in [YOUR CURRENCY, e.g. INR (₹)] and are subject to change
              without notice. Placing an order is an offer to purchase, which we (or the relevant
              brand partner) may accept or decline — for example, if an item becomes unavailable
              after you order. Order confirmation will be shown in the app and reflected in your
              order history.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">5. Payments</h2>
            <p>
              Online payments are processed securely through Razorpay. Cash on Delivery may be
              offered at our discretion and can be disabled at any time. For Cash on Delivery
              orders, payment is confirmed by our staff upon collection.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">6. Catering and event bookings</h2>
            <p>
              Bookings for Meal Box, Delivery Box, and Catering Order packages require a date,
              time, and guest count. Optional staffing is charged per staff member at the rate
              shown at checkout, set by us. Booking a date does not guarantee availability until
              confirmed by our team — we will contact you if there is a conflict. See our{" "}
              <a href="/refund-policy" className="text-saffron2 underline">Refund & Cancellation Policy</a>{" "}
              for cancellation terms specific to bookings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">7. Brand partners</h2>
            <p>
              Items sold by brand partners are prepared and fulfilled by that partner, not by
              {" "}{APP_NAME} directly. We review brand partner applications before their menu
              becomes visible to customers, but we do not independently verify every menu item or
              guarantee the quality, safety, or accuracy of a brand partner's listings beyond what
              they represent to us. If you have an issue with a brand-partner order, contact us
              and we will help coordinate a resolution with that partner.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">8. Conduct</h2>
            <p>
              You agree not to misuse the Platform, including providing false information,
              attempting to interfere with its operation, or submitting abusive, false, or
              misleading reviews.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">9. Reviews</h2>
            <p>
              Reviews must reflect your genuine experience. We reserve the right to remove
              reviews that are offensive, fraudulent, or violate these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">10. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, {APP_NAME} is not liable for indirect,
              incidental, or consequential damages arising from your use of the Platform,
              including issues caused by third-party brand partners, delivery delays, or events
              outside our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">11. Termination</h2>
            <p>
              We may suspend or terminate your account for violation of these terms, fraudulent
              activity, or abuse of the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">12. Governing law</h2>
            <p>
              These terms are governed by the laws of [YOUR JURISDICTION, e.g. India], without
              regard to conflict-of-law principles. Disputes will be subject to the exclusive
              jurisdiction of the courts of [YOUR CITY/STATE].
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">13. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the Platform after
              changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">14. Contact us</h2>
            <p>Questions about these terms: [YOUR CONTACT EMAIL]</p>
          </section>
        </div>
      </div>
    </div>
  );
}
