import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { APP_NAME, BUSINESS_NAME, BUSINESS_ADDRESS, CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/brand";

export const metadata = { title: `Cancellation & Refund Policy - ${APP_NAME}` };

// Business rules in one place, so the page and any later change stay in step.
const POLICY = {
  updated: "6 November 2026",
  fullRefundHours: 24,     // cancel at least this long before the delivery time: full refund
  partRefundHours: 12,     // between this and fullRefundHours: part refund
  partRefundPct: 50,
  issueReportHours: 2,     // report a problem with a delivered order within this time
  refundDays: "5 to 7 working days",
  venueFullDays: 7,        // venue advance: full refund if cancelled this many days before
  venuePartDays: 3,
  venuePartPct: 50,
};

const H = ({ children }) => <h2 className="font-display text-xl text-ink mb-2">{children}</h2>;

export default function RefundPolicyPage() {
  const p = POLICY;
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10 flex-1">
        <h1 className="font-display text-3xl text-ink mb-2">Cancellation & Refund Policy</h1>
        <p className="text-sm text-ink/50 mb-8">
          For the {APP_NAME} website and mobile app. Last updated: {p.updated}.
        </p>

        <div className="space-y-7 text-sm text-ink/80 leading-relaxed">
          <p>
            {APP_NAME} is run by {BUSINESS_NAME}, Mysuru. We cook every order fresh for the delivery time you choose,
            so the closer it is to that time, the more of the order is already bought and prepared. This policy explains
            what you get back if you cancel, and what we do if something goes wrong.
          </p>

          <section>
            <H>1. Cancelling a food order</H>
            <p className="mb-2">Orders are placed at least 15 hours before delivery. The refund depends on how long before the
              chosen delivery time you cancel:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-line bg-white">
                <thead className="bg-paper">
                  <tr><th className="px-3 py-2 border-b border-line">When you cancel</th><th className="px-3 py-2 border-b border-line">Refund</th></tr>
                </thead>
                <tbody>
                  <tr><td className="px-3 py-2 border-b border-line">{p.fullRefundHours} hours or more before delivery</td><td className="px-3 py-2 border-b border-line">Full refund</td></tr>
                  <tr><td className="px-3 py-2 border-b border-line">{p.partRefundHours} to {p.fullRefundHours} hours before delivery</td><td className="px-3 py-2 border-b border-line">{p.partRefundPct}% of the amount paid</td></tr>
                  <tr><td className="px-3 py-2">Less than {p.partRefundHours} hours before delivery, or once the order is being prepared</td><td className="px-3 py-2">No refund</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2">This applies to meal boxes, party and catering orders, items sold by weight and brand partner items.</p>
          </section>

          <section>
            <H>2. Cash on delivery orders with an advance</H>
            <ul className="list-disc pl-5 space-y-1">
              <li>Orders above ₹3,000 can be paid partly in cash on delivery, after an advance paid online (25% for orders up to ₹6,000, 50% above that).</li>
              <li>If you cancel, the table in section 1 applies to the advance you paid. Nothing is owed on the cash part.</li>
              <li>If you refuse the order at the door without cancelling in time, the advance is not refunded.</li>
            </ul>
          </section>

          <section>
            <H>3. Venue bookings</H>
            <p className="mb-2">The advance paid to confirm a venue booking is refunded as follows:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>{p.venueFullDays} days or more</strong> before the event: full refund of the advance.</li>
              <li><strong>{p.venuePartDays} to {p.venueFullDays} days</strong> before the event: {p.venuePartPct}% of the advance.</li>
              <li><strong>Less than {p.venuePartDays} days</strong> before the event: no refund.</li>
              <li>If the venue owner cancels or cannot host your event, the full advance is refunded.</li>
            </ul>
            <p className="mt-2">The balance for the venue is settled directly with the venue owner on the terms they quote.</p>
          </section>

          <section>
            <H>4. Weekly meal box plans</H>
            <p>You can skip a day, pause or cancel your plan from the app until the evening before a delivery day. Boxes
              already prepared for the next day cannot be refunded.</p>
          </section>

          <section>
            <H>5. When we cancel</H>
            <p>If we cannot deliver your order (for example because of an item running out, bad weather or your address being
              outside our delivery area), we will tell you as early as we can and refund everything you paid, in full.</p>
          </section>

          <section>
            <H>6. Problems with a delivered order</H>
            <p className="mb-2">If something is missing, wrong, spilled or not up to standard:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tell us within <strong>{p.issueReportHours} hours</strong> of delivery through the in-app chat or by phone, with a photo where you can.</li>
              <li>We will check and offer a replacement, a refund for the affected items, or credit on your next order.</li>
              <li>Food that has been mostly eaten, kept out for a long time, or stored incorrectly after delivery is not covered.</li>
            </ul>
          </section>

          <section>
            <H>7. When no refund is given</H>
            <ul className="list-disc pl-5 space-y-1">
              <li>A late cancellation, as set out in sections 1 and 3</li>
              <li>A wrong address or phone number given by you, or nobody available to receive the order after we try to reach you</li>
              <li>A change of mind about taste or quantity after delivery, when the food is as described</li>
            </ul>
          </section>

          <section>
            <H>8. How refunds are paid</H>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Online payments</strong> go back to the same card, UPI or bank account through Razorpay, usually within {p.refundDays} after we approve the refund. Your bank may take longer to show it.</li>
              <li><strong>Cash payments</strong> are refunded by UPI or bank transfer to an account you give us.</li>
              <li>Coupon discounts and reward points used on a cancelled order are not paid out as cash. Points are returned to your account.</li>
            </ul>
          </section>

          <section>
            <H>9. How to cancel or ask for a refund</H>
            <ul className="list-disc pl-5 space-y-1">
              <li>Open the order in <strong>My Orders</strong> and message us from the in-app chat, quoting the order number.</li>
              <li>Or call or WhatsApp us on <strong>{CONTACT_PHONE}</strong>{CONTACT_EMAIL ? <>, or email <strong>{CONTACT_EMAIL}</strong></> : null}.</li>
              <li>The time we receive your message is the time used for the refund rules above.</li>
            </ul>
          </section>

          <section>
            <H>10. Changes to this policy</H>
            <p>We may update this policy. The version shown here when you placed your order applies to that order.</p>
          </section>

          <p className="text-ink/60">{BUSINESS_NAME}, {BUSINESS_ADDRESS}.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
