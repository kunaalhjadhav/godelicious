import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import {
  APP_NAME, BUSINESS_NAME, BUSINESS_ADDRESS, CONTACT_PHONE, CONTACT_EMAIL, GRIEVANCE_OFFICER,
} from "@/lib/brand";

export const metadata = { title: `Privacy Policy - ${APP_NAME}` };

const H = ({ children }) => <h2 className="font-display text-xl text-ink mb-2">{children}</h2>;

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10 flex-1">
        <h1 className="font-display text-3xl text-ink mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink/50 mb-8">Last updated: 23 October 2026</p>

        <div className="space-y-6 text-sm text-ink/80 leading-relaxed">
          <section>
            <H>1. Who we are</H>
            <p>
              {APP_NAME} is operated by {BUSINESS_NAME} ("we", "us"). We run this website and the {APP_NAME} mobile
              app (together, the "Platform") for ordering meal boxes, catering and food, booking event venues, and
              weekly meal boxes, with delivery in and around Mysuru, Karnataka.
            </p>
            <p className="mt-2">
              {BUSINESS_NAME}<br />
              {BUSINESS_ADDRESS}<br />
              Phone: {CONTACT_PHONE}
              {CONTACT_EMAIL ? <><br />Email: {CONTACT_EMAIL}</> : null}
            </p>
            <p className="mt-2">
              This policy explains what personal information we collect, why, who we share it with, and the choices you
              have. By using the Platform you agree to it. It is written to follow the Information Technology Act, 2000,
              the rules made under it, and India's Digital Personal Data Protection Act, 2023.
            </p>
          </section>

          <section>
            <H>2. Information we collect</H>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account details:</strong> name, phone number, email address, and your password (stored only as a secure hash). If you sign in with a phone number, we send a one-time code (OTP) by SMS.</li>
              <li><strong>Orders and bookings:</strong> items ordered, delivery address, contact phone, delivery date and time, guest count, notes, coupon used, order status, and order history. For weekly boxes, your plan, address and delivery days.</li>
              <li><strong>Location:</strong> if you tap "use my current location" or pick a place on the map, we collect your device's coordinates at that moment, and save the coordinates with your delivery address. We use them to check that your address is inside our delivery area (within 20 km of Mysuru) and for delivery. We do not track your location in the background.</li>
              <li><strong>Saved addresses, favourites, reward points and referrals:</strong> addresses you save, dishes you mark as favourites, reward points you earn or use, and your referral code and who you referred.</li>
              <li><strong>Messages and reviews:</strong> chats with our support team and ratings or reviews you write.</li>
              <li><strong>Venue enquiries:</strong> details you submit when you enquire about or request a venue.</li>
              <li><strong>Device information:</strong> a notification token for your device (so we can send order updates), and basic technical information such as app version and browser type.</li>
              <li><strong>Payments:</strong> we do <strong>not</strong> see or store your card, UPI or bank details. Payments are handled by Razorpay. We receive only the payment status and payment reference.</li>
            </ul>
          </section>

          <section>
            <H>3. How we use your information</H>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and run your account, and to sign you in</li>
              <li>To take, prepare and deliver your orders, and to run weekly boxes and venue requests</li>
              <li>To check that your address is inside our delivery area</li>
              <li>To take payment, apply coupons and reward points, and prevent fraud</li>
              <li>To send order updates, delivery alerts and support replies (SMS, notifications, WhatsApp)</li>
              <li>To send offers, only where you have not opted out</li>
              <li>To fix problems, improve the Platform, and keep it secure</li>
              <li>To meet legal duties, such as tax and accounting records</li>
            </ul>
          </section>

          <section>
            <H>4. Who we share it with</H>
            <p>We do not sell your personal information. We share it only as needed with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Razorpay:</strong> to take online payments.</li>
              <li><strong>Brand partners and venue partners:</strong> the name, phone number, address and order details needed to prepare, deliver or host your order or booking. We may alert them by app notification or WhatsApp.</li>
              <li><strong>Google:</strong> Google Maps is used to show the map, pick a location and turn coordinates into an address. Location coordinates you choose are sent to Google for that.</li>
              <li><strong>Firebase Cloud Messaging (Google):</strong> to deliver push notifications to your device.</li>
              <li><strong>SMS and WhatsApp providers (such as TextLocal and Meta's WhatsApp Business):</strong> to send one-time codes and order alerts.</li>
              <li><strong>Hosting and storage providers:</strong> our servers and database are hosted with cloud providers (such as Render and Supabase) and images may be stored with Cloudinary. They process data on our behalf.</li>
              <li><strong>Authorities:</strong> where the law requires it.</li>
            </ul>
          </section>

          <section>
            <H>5. Security</H>
            <p>
              We use encrypted connections (HTTPS), hashed passwords, and limit who can see your data. No system is
              perfectly secure, so we cannot promise absolute security. If you think your account has been misused,
              please contact us straight away.
            </p>
          </section>

          <section>
            <H>6. How long we keep it</H>
            <p>
              We keep your account and order information while your account is active. After you ask us to delete your
              account, we delete or anonymise your personal information, but we may keep order and payment records for as
              long as the law requires (for example for tax and accounting) and to deal with disputes.
            </p>
          </section>

          <section>
            <H>7. Your choices and rights</H>
            <ul className="list-disc pl-5 space-y-1">
              <li>See and update your details in your profile.</li>
              <li>Opt out of offers and notifications in your notification settings or your phone's settings.</li>
              <li>Withdraw permission for location in your phone settings at any time. You can still type your address, but orders must be inside our delivery area.</li>
              <li>Ask us for a copy of your data, to correct it, or to delete your account. See <a className="text-saffron2 underline" href="/delete-account">how to delete your account</a>.</li>
            </ul>
          </section>

          <section>
            <H>8. Cookies and local storage</H>
            <p>
              The website uses your browser's local storage (not third-party advertising cookies) to keep you signed in and
              to remember your cart. We do not show ads and we do not run advertising trackers.
            </p>
          </section>

          <section>
            <H>9. Children</H>
            <p>The Platform is for people aged 18 and over. We do not knowingly collect information from children under 18.</p>
          </section>

          <section>
            <H>10. Changes to this policy</H>
            <p>When we change this policy we update the date at the top. If a change is significant we will tell you in the app or on the website.</p>
          </section>

          <section>
            <H>11. Contact and grievances</H>
            <p>
              For any question, request or complaint about your data, contact our grievance officer, {GRIEVANCE_OFFICER}, at {BUSINESS_NAME},
              {" "}{BUSINESS_ADDRESS}. Phone: {CONTACT_PHONE}.{CONTACT_EMAIL ? ` Email: ${CONTACT_EMAIL}.` : ""} We aim to reply within 7 days.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
