"use client";

import Nav from "@/components/Nav";
import { APP_NAME } from "@/lib/brand";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="bg-saffron/10 border-l-2 border-saffron2 px-4 py-3 mb-8 text-sm text-ink">
          <strong>Draft document.</strong> This is a starting template, not legal advice. The
          specific windows and percentages below (e.g. "72 hours," "50%") are placeholder business
          decisions — replace them with whatever your actual policy is, and have this reviewed by
          a qualified professional before relying on it.
        </div>

        <h1 className="font-display text-3xl text-ink mb-2">Refund & Cancellation Policy</h1>
        <p className="text-sm text-ink/50 mb-8">Last updated: [DATE]</p>

        <div className="space-y-6 text-sm text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-2">1. Everyday food orders</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Orders can be cancelled free of charge while status is still <strong>Pending</strong> or <strong>Confirmed</strong>, before preparation has started.</li>
              <li>Once an order status changes to <strong>Preparing</strong>, it can no longer be
                cancelled, as ingredients and preparation have already begun.</li>
              <li>If you receive the wrong item, a missing item, or an item in unacceptable
                condition, contact us via in-app chat within [24 hours] of delivery with a photo
                where possible. We will offer a replacement or refund at our discretion.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">2. Meal Box / Delivery Box / Catering bookings</h2>
            <p>Because these involve advance planning, staffing, and ingredient procurement tied
              to a specific event date, cancellation terms are based on how close to the event
              date you cancel:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>More than [72 hours]</strong> before the event: full refund.</li>
              <li><strong>[24–72 hours]</strong> before the event: [50%] refund.</li>
              <li><strong>Less than [24 hours]</strong> before the event: no refund, as staffing
                and procurement commitments are typically already made.</li>
            </ul>
            <p className="mt-2">
              To cancel a booking, go to My Orders → select the booking → contact support via
              chat, or email [YOUR CONTACT EMAIL] referencing your order number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">3. Brand partner items</h2>
            <p>
              The same windows above apply to items ordered from brand partners. Refund requests
              involving a brand partner's item are coordinated between {APP_NAME} and that
              partner; we aim to resolve these within [X business days].
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">4. How refunds are processed</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Online payments</strong> are refunded to your original payment method
                via Razorpay, typically within [5–7 business days], depending on your bank.</li>
              <li><strong>Cash on Delivery orders</strong> that qualify for a refund (e.g. an
                order cancelled before delivery, or a quality issue) are refunded via [bank
                transfer / UPI / store credit — pick one], since no online payment exists to
                reverse.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">5. Non-refundable situations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Change of mind after an order has entered preparation</li>
              <li>Incorrect delivery address or contact details provided by you</li>
              <li>Failure to be available to receive a scheduled delivery, after reasonable
                attempts to contact you</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">6. How to request a refund or raise an issue</h2>
            <p>
              Use the in-app chat (available from any order's detail page) or email
              [YOUR CONTACT EMAIL] with your order number. We aim to respond within [X hours/days].
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">7. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The version in effect at the time you
              placed an order applies to that order.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
