import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { APP_NAME, BUSINESS_NAME, CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/brand";

export const metadata = { title: `Delete your account - ${APP_NAME}` };

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10 flex-1">
        <h1 className="font-display text-3xl text-ink mb-2">Delete your account</h1>
        <p className="text-sm text-ink/50 mb-8">For the {APP_NAME} website and mobile app</p>

        <div className="space-y-6 text-sm text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-ink mb-2">How to ask</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Contact us{CONTACT_EMAIL ? <> by email at <strong>{CONTACT_EMAIL}</strong> or</> : null} by phone or WhatsApp on <strong>{CONTACT_PHONE}</strong>.</li>
              <li>Say "Delete my {APP_NAME} account" and give the phone number or email you signed up with, so we can find your account.</li>
              <li>We may ask you to confirm it is you, for example with a one-time code sent to your phone.</li>
              <li>We will delete your account within 30 days and tell you when it is done.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">What is deleted</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your profile (name, phone, email) and password</li>
              <li>Saved addresses and location coordinates</li>
              <li>Favourites, reward points and referral details</li>
              <li>Chat messages, reviews and device notification tokens</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink mb-2">What we may keep</h2>
            <p>
              Order, invoice and payment records may be kept for as long as the law requires, for tax and accounting and to
              handle disputes. These are kept without being linked to your profile where we can. Open orders must be
              delivered or cancelled before the account is deleted. Deleting your account also cancels any weekly box plan.
            </p>
          </section>

          <p className="text-ink/60">
            See our <a className="text-saffron2 underline" href="/privacy">Privacy Policy</a> for more. {BUSINESS_NAME}.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
