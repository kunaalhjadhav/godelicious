# Godelicious — Production Readiness Guide

This is the complete list of what stands between the current build and something you can safely
put in front of real customers with real money. Each section says clearly whether it's **already
done for you in this codebase** or **something only you can do** (external accounts, business
decisions, content only you can write).

Work through it top to bottom — items are roughly ordered by how badly things break if skipped.

---

## 1. Image/video storage — Cloudinary (done in code, you need to add credentials)

**The problem:** Railway/Render's filesystem is ephemeral. Every image uploaded through the admin
dashboard (menu photos, banners, order-type images, brand logos) was being saved to local disk —
which gets wiped on every redeploy.

**What's already done:** `backend/src/config/upload.js` and `backend/src/routes/uploads.routes.js`
now upload to Cloudinary automatically **if credentials are present**, and fall back to local disk
(with a console warning) if they're not — so local development still works with zero setup.

### Your steps

1. Sign up free at cloudinary.com (free tier: 25GB storage/bandwidth, plenty to start)
2. Dashboard -> copy your **Cloud name**, **API Key**, **API Secret**
3. Add to your backend's environment variables (locally in `.env`, and on Railway/Render):
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Run `npm install` locally (picks up the new `cloudinary` package) and redeploy
5. **Test it**: upload a new menu item image via the admin dashboard, then trigger a redeploy
   (even a trivial commit), and confirm the image still loads afterward — that's the real test,
   since local-disk images would have silently disappeared here before this fix

**Any images/videos uploaded before this fix are already gone** if you've redeployed since
uploading them. Re-upload anything currently broken after setting this up.

---

## 2. Security hardening (mostly done, some steps only you can do)

**Already done:** `helmet` (secure HTTP headers) and rate limiting (300 requests/15min general,
20 requests/15min on login/registration endpoints specifically, to blunt brute-force attempts)
are now wired into `backend/src/index.js`.

### Your steps

- **Change every seed password immediately** if you haven't already:
  - `admin@godelicious.com / Admin@123`
  - `staff@godelicious.com / Staff@123`
  - `customer@godelicious.com / Customer@123`
  These are printed in this codebase's `prisma/seed.js` — anyone who's seen this project's code
  (which, per this conversation, is a real number of people at this point) knows them.
- **Generate a real `JWT_SECRET`** — if it's still `"change_this_to_a_long_random_string"` from
  the `.env.example` template, generate a real one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Paste the output as `JWT_SECRET` on your deployed backend. **Changing this logs out every
  currently-logged-in user** (their tokens become invalid) — do this during low-traffic hours.
- **Lock down `CORS_ORIGIN`** — confirm it's the exact list of your real domains, not `*`:
  ```
  CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
  ```
- **Confirm HTTPS is enforced** — Railway and Render both provide this automatically on their
  generated domains and custom domains; nothing to configure, just don't disable it.

---

## 3. TextLocal for OTP login (implemented — you need an account + DLT registration)

**Real TextLocal integration is now built in** to `backend/src/controllers/otp.controller.js`,
with automatic fallback to a dev-only mode (returns the code in the API response) if you haven't
set up credentials yet — nothing else breaks either way. Unlike MSG91/Twilio, TextLocal has no
built-in "verify" service — this app generates the 6-digit code itself, sends it via TextLocal's
plain SMS API, and checks it against what's stored, same as the dev-mode fallback always did.

### Your steps

1. Sign up at [textlocal.in](https://www.textlocal.in)
2. Get your **API Key**: Dashboard → Settings → **API Keys** → **Create Key**
3. Register a **Sender ID**: a 6-character alphabetic ID that appears as the sender name (e.g.
   `GODELI`). In India this requires **DLT registration** of both the sender ID and a message
   template matching the exact text your code sends — can take 1–3 business days, start early.
   The template text to register: `Your Godelicious verification code is {#var#}. Valid for 10 minutes.`
4. Add both as backend environment variables:
   ```
   TEXTLOCAL_API_KEY=<your api key>
   TEXTLOCAL_SENDER=<your approved sender id>
   ```
5. Redeploy, then **test with a real phone number**
6. Once confirmed working, set `NODE_ENV=production` on your deployed backend — this disables
   the dev-mode "show me the code" fallback, which is correct behavior for real users

### Note on the phone number format

The code defaults to assuming a 10-digit number is Indian and prefixes `91` automatically. If
you ever need international customers, adjust `toMsg91Number()` in `otp.controller.js`
accordingly.

---

## 4. Razorpay — switch to live mode (your account, your business verification)

**Check this right now:** if `RAZORPAY_KEY_ID` on your live backend starts with `rzp_test_`,
**no customer has paid you any real money yet**, regardless of how many "successful" orders show
up — test mode simulates payment without moving funds.

### Your steps

1. Razorpay Dashboard -> complete **KYC/business verification** (PAN, bank account, business
   proof) — required before live mode activates, can take a few business days
2. Razorpay will typically ask for your **Privacy Policy, Terms of Service, and
   Refund/Cancellation Policy URLs** during this review — see section 5 below, do that first
3. Once approved, Dashboard -> Settings -> API Keys -> generate **live** keys (`rzp_live_...`)
4. Replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` on your deployed backend with the live values
5. Place one real, small test transaction yourself end-to-end (a genuine payment, not a dummy
   card) to confirm money actually moves and the order completes correctly

---

## 5. Legal & compliance pages (drafted — you still need to review and finalize)

Razorpay (and good practice generally) requires these before going live. **Draft versions are
now live** at `customer-web/app/privacy`, `/terms`, and `/refund-policy` (linked in the site
footer) — each one clearly banners itself as a draft and marks every `[bracketed placeholder]`
that needs your actual business details (legal name, address, jurisdiction, contact email, and
your real cancellation-window policy for bookings).

**These are starting templates, not legal advice.** Have them reviewed by someone qualified for
your jurisdiction, fill in every placeholder, and remove the draft banners once finalized —
`legal/README.md` has more on this.

---

## 6. Mobile app parity (deferred work — same patterns as web, needs porting)

The following exist on **web** but were never ported to the **mobile app**:
- The order-types/booking flow (Meal Box / Delivery Box / Catering Order -> date/staff/addons form)
- Brand partner browsing (`/brands` list -> brand's combo menu)

These aren't bugs — they were explicitly deferred earlier in this build to prioritize other
features. The good news: the mobile screens can follow the exact same structure as their web
counterparts (`OrderTypesSection`, the booking form, `BrandsPage`/brand detail) — same API calls,
same logic, just React Native components instead of React DOM ones. This is a real chunk of work,
not a quick fix — ask when you're ready to tackle it and we'll port them screen by screen,
following the `APK_BUILD_GUIDE.md` process for getting the rebuilt app onto a device again.

---

## 7. Nice-to-have enhancements (not blockers, listed for completeness)

- **Google Maps** — only "use my current location" works today (free, no key). A full interactive
  map with address autocomplete needs your own Google Maps API key.
- **Real push notifications** — currently in-app only. True push (phone buzzes with app closed)
  needs Firebase Cloud Messaging: a Firebase project, device token registration, and a
  server-side send step.
- **Custom fonts on mobile** — currently uses the OS default; web has Fraunces/Inter/IBM Plex Mono.
- **UI polish pass** — also explicitly deferred earlier; functional but not a final visual pass.

---

## 8. Things worth adding before real scale (not urgent day one)

- **Error tracking** — Sentry has a generous free tier; catches production errors you'd
  otherwise only hear about from confused customers
- **Database backups** — confirm your Postgres provider (Supabase/Railway/Render) has automatic
  backups enabled, and that you know how to restore one before you need to
- **Automated tests** — none currently exist; not blocking launch, but worth adding for the
  payment and order-creation logic specifically as the codebase grows
- **Webhook for Razorpay** — currently payment confirmation only happens via the checkout widget's
  callback. A server-side webhook (Razorpay -> your backend) is a more robust pattern if a
  customer's browser closes mid-payment; ask if you want this added

---

## 9. Pre-launch smoke test checklist

Do this entire flow for real, on the live deployed site/app, not locally, right before opening
to real customers:

- [ ] Register a new customer account (both password and OTP methods, if SMS is set up)
- [ ] Browse menu, add a combo item with option selection, add to cart
- [ ] Apply a real coupon code, confirm discount calculates correctly
- [ ] Complete checkout with **online payment** (a real small transaction if live mode is on)
- [ ] Complete a separate checkout with **COD**
- [ ] Confirm both orders appear correctly in the admin dashboard
- [ ] Advance an order through its full status lifecycle from admin, confirm customer sees updates
- [ ] Confirm a COD order via admin, confirm payment status updates
- [ ] Submit a review on a delivered order
- [ ] Register a test brand partner, confirm their brand is hidden from customers pre-approval
- [ ] Approve that brand from admin, confirm it now appears in `/brands` on the customer site
- [ ] Add a menu item as that brand partner, confirm a customer can find and order it
- [ ] Submit a brand offer, approve it from admin
- [ ] Book a Meal Box / Delivery Box / Catering order through the new booking flow, with staff and
      an add-on selected, confirm the price breakdown and final total are correct
- [ ] Upload a new image via admin, redeploy, confirm the image survives
- [ ] Check `/health` on the backend returns `ok`
- [ ] Confirm `CORS_ORIGIN` is locked to your real domains, not `*`

If every box above is checked on the live environment, you're in a genuinely defensible place to
call this production ready — until then, treat it as "feature-complete, pre-launch."

---

## 10. Firebase push notifications (backend + web done, mobile deliberately deferred)

Real push notifications (order status updates, chat replies) now work on **backend and web**,
with a graceful no-op fallback if you haven't set up Firebase yet — nothing else breaks either way.

### Your steps (backend + web)

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. **Backend credentials**: Project Settings → Service Accounts → Generate new private key
   (downloads a JSON file). Copy `project_id`, `client_email`, and `private_key` into
   `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` on your backend —
   the private key has real newlines in the JSON, which env vars can't hold, so paste it with
   literal `\n` sequences (the code un-escapes them automatically)
3. **Web credentials**: Project Settings → General → Your apps → add a Web app if you haven't,
   copy the config values into the `NEXT_PUBLIC_FIREBASE_*` vars in `customer-web`
4. **VAPID key**: Project Settings → Cloud Messaging → Web configuration → Generate key pair →
   `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
5. **Also paste your web config directly into** `customer-web/public/firebase-messaging-sw.js` —
   this file is a static asset and can't read `.env` values, so the same config goes in twice
6. Redeploy backend and web, then test: log in on the site, accept the browser's notification
   permission prompt, have an admin change an order's status or reply in chat, confirm a real
   OS-level notification appears

### Mobile — deliberately not done yet

Adding Firebase to the mobile app needs **new native dependencies**
(`@react-native-firebase/app`, `@react-native-firebase/messaging`) plus a `google-services.json`
file and Gradle configuration changes. Given how much Gradle/dependency-resolution trouble this
project's mobile build has already been through, this is being treated as its own careful,
isolated step rather than bundled into a larger round of changes — ask when you're ready to
tackle it specifically, so it gets full attention if something goes wrong.
