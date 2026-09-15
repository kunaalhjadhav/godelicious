# Godelicious — Master Guide (Current Status + Complete Setup)

This is the one document to use from here on — it consolidates everything scattered across many
rounds of changes into a single source of truth: what's built, what needs your configuration,
and exact steps to deploy and diagnose issues. If anything here conflicts with an older message,
**this document wins**.

---

## 1. Logo — how to replace it everywhere

The placeholder "G" monogram logo needs to be swapped in **four separate places** — there's no
single file that controls all of them.

### Customer website
Replace this file directly (same filename, so nothing else needs to change):
```
customer-web/public/logo.svg
```
If your new logo is a PNG instead of SVG, save it as `logo.png` and update the one reference to
it in `customer-web/app/layout.js` and `customer-web/components/Nav.js` (search for `logo.svg`
and change to `logo.png`).

### Admin dashboard
Same idea:
```
admin-dashboard/public/logo.svg
```

### Mobile app (in-app logo, e.g. login screen)
```
customer-app/src/assets/logo.png
```
Must be a PNG (not SVG — React Native doesn't render SVG natively without an extra library).

### Mobile app icon (the icon on the phone's home screen)
This is **not** part of the code I send you — it lives inside your native Android project folder
(`GodeliciousApp/android`), which I don't have access to. To replace it:
1. Generate icon sizes for every density using a tool like
   [icon.kitchen](https://icon.kitchen) or Android Studio's built-in Image Asset Studio
2. Replace the files in `GodeliciousApp/android/app/src/main/res/mipmap-*/ic_launcher.png`
   (and `ic_launcher_round.png`) for each density folder (`mipmap-mdpi`, `mipmap-hdpi`,
   `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`)
3. Rebuild the app for the new icon to appear

---

## 2. Complete environment variable checklist

Use this to audit what's actually set on each service right now. Anything marked **required**
breaks a core feature if missing; anything marked **optional** just disables that one feature
gracefully (nothing crashes).

### Backend (Railway)
| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | Required | Postgres connection (Supabase pooler string) |
| `JWT_SECRET` | Required | Session tokens |
| `JWT_EXPIRES_IN` | Required | e.g. `7d` |
| `CORS_ORIGIN` | Required | Comma-separated list of your admin + web URLs |
| `PORT` | Required | `8080` |
| `NODE_ENV` | Required | `production` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Required for payments | Test or live keys |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Optional but strongly recommended | Image uploads survive redeploys |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | Optional | Real OTP SMS delivery |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Optional | Push notifications |

### customer-web (Railway/Render)
| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Required | Your backend's URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Address auto-fill on checkout/booking |
| `NEXT_PUBLIC_FIREBASE_*` (6 values) | Optional | Web push notifications |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Optional | Required specifically for web push |

**Also**: `customer-web/public/firebase-messaging-sw.js` needs the same Firebase config values
pasted **directly into the file** — env vars don't reach it.

### admin-dashboard (Railway/Render)
| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Required | Your backend's URL |

### customer-app (mobile — not env vars, plain files you edit)
| File | What to fill in |
|---|---|
| `src/api/client.js` → `API_URL` | Your backend's live URL (never `10.0.2.2`) |
| `src/config.js` → `GOOGLE_MAPS_API_KEY` | For address auto-fill on mobile |

---

## 3. Diagnosing "order missing in admin"

I can't see your live system, so work through this checklist:

1. **Check the filter dropdown** on the admin Orders page — if it's set to a specific status
   (e.g., "Delivered"), an order in a different status won't show. Set it back to "All."
2. **Confirm the order actually completed on the customer side** — did the customer see an order
   confirmation screen, or did checkout show an error partway through? If checkout errored, the
   order was likely never created at all (not a display bug — genuinely doesn't exist yet).
3. **Check timing** — was this order placed before or after you deployed the transaction-timeout
   fix from a few rounds back? If before, it may have hit that exact timeout bug and silently
   failed to save.
4. **Confirm admin-dashboard is actually running your latest deployed code** — see the redeploy
   checklist in section 5. A stale deployment could be looking at old logic.

If none of these explain it, tell me the order ID (if the customer has one) or roughly when it
was placed, and whether the customer saw a success or error message — that narrows it down fast.

---

## 4. Diagnosing "delivery partner forward / add partner not updated"

This is almost certainly a **deployment gap**, not a bug — these features only exist in the code
if `admin-dashboard` has actually been redeployed with the round that added them. Check:

1. Does `/delivery-partners` even appear as a link in your admin sidebar? If not, the deploy
   hasn't picked up that code yet.
2. Go to Railway → admin-dashboard service → **Deployments** tab → check the timestamp of the
   most recent successful deploy. Does it match when you last pushed?
3. If it looks stale, re-run the push steps from section 5 below.

---

## 5. Complete redeploy checklist (do this now, top to bottom)

### Step 1 — Extract your latest zip fresh
Don't reuse an old extraction — get a clean copy from the most recent zip I've sent you.

### Step 2 — Copy files into your real project (all four folders this time)
```powershell
# Backend
xcopy D:\godelicious-new-temp\godelicious\backend D:\godelicious-project\godelicious\backend /E /I /Y /EXCLUDE:node_modules_exclude.txt

# Simpler alternative — just copy src, prisma, and config files individually as before,
# or if you're confident nothing local needs preserving besides .env, do a full folder replace:
```
If doing a full-folder copy, **back up your real `.env` file first**, copy the whole folder over,
then restore your `.env` back into place afterward.

### Step 3 — Fix the Postgres provider line (always reverts on fresh copy)
Open `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 4 — Install dependencies
```powershell
cd backend && npm install
cd ../admin-dashboard && npm install
cd ../customer-web && npm install
```

### Step 5 — Run any pending migrations
```powershell
cd backend
npx prisma migrate dev --name catch_up
```
(Prisma only applies what's actually new — safe to run even if there's nothing pending)

### Step 6 — Push each repo
```powershell
cd backend && git add . && git commit -m "Sync latest changes" && git push
cd ../admin-dashboard && git add . && git commit -m "Sync latest changes" && git push
cd ../customer-web && git add . && git commit -m "Sync latest changes" && git push
```

### Step 7 — Confirm all three redeploy successfully
Check each Railway/Render dashboard's Deployments tab — wait for all three to show green/live,
not still building or failed.

### Step 8 — Set/verify every environment variable from section 2
Go through the table above service by service.

### Step 9 — Rebuild mobile
```powershell
cd D:\godelicious-project\GodeliciousApp
```
Copy `customer-app/src`, `App.js`, `app.json`, `index.js` in, then:
```powershell
npx react-native run-android
```

### Step 10 — Full smoke test
- [ ] `https://your-backend-url/health` returns OK
- [ ] Home page shows the banner (or "Offers coming shortly")
- [ ] Place a test order — appears in admin Orders immediately
- [ ] Admin → Delivery Partners page exists, can add a partner
- [ ] Admin → Orders → Forward button works, opens WhatsApp with a message
- [ ] Checkout/Booking shows GST and Free Delivery lines
- [ ] "Use my location" auto-fills the address (if Maps key is set)
- [ ] OTP login works (if MSG91 is fully approved)
- [ ] Test payment with Razorpay test card completes

Whatever fails on this list, tell me exactly which checkbox and what you see — that turns
"nothing works" into a specific, fixable bug report.

---

## 6. Mobile: bottom nav icons, category images, and order details (this round)

**Bottom tab bar icons** — previously had none at all (just text labels), which is likely what
looked like "invisible" elements. Fixed using plain emoji icons (🍽️ 📦 💬 👤) — deliberately
**not** a vector icon library, since adding one means a new native dependency and another rebuild
risk on a project that's already fought through plenty of Gradle issues. If you want more
polished icons later, that's a deliberate follow-up, not a quick fix.

**Categories now support images** — admin's Categories page has an image upload field, and the
customer website's category selector now shows circular image cards instead of plain text chips.
**Mobile's equivalent home-screen category selector was not updated this round** — same visual
change can be ported to `HomeScreen.js` on request.

**Admin order cards now show**: placement date/time, a clickable map link for the address, correct
gram labeling for weight-sold items (previously showed a raw, confusing number like "2750×"),
and a discount line when a coupon was used.

---

## 7. Logo, splash screen, and app icon — step by step

### Logo (in-app, all three surfaces)
Already covered in section 1 above — replace `logo.svg`/`logo.png` in each of `customer-web`,
`admin-dashboard`, and `customer-app`.

### Splash screen (the screen shown while the app is loading)
This app doesn't use a splash-screen library (deliberately — avoiding another native dependency).
The splash is controlled by two native Android files inside your `GodeliciousApp` project:

1. **Background color**: `android/app/src/main/res/values/colors.xml` — find or add:
   ```xml
   <color name="splashscreen_background">#1C1B19</color>
   ```
   (use your brand's charcoal, or whatever color you want the splash background to be)

2. **Splash image**: place your logo image at:
   ```
   android/app/src/main/res/drawable/splashscreen_logo.png
   ```
   (create the `drawable` folder if it doesn't exist)

3. Confirm `android/app/src/main/res/values/styles.xml` references it — look for a
   `SplashTheme` or similar style and confirm `android:windowBackground` points at a drawable
   that includes `splashscreen_logo`. If this file doesn't already have splash-related entries
   (varies by exactly how the project was originally scaffolded), this may need a small manual
   addition — send me the current contents of `styles.xml` and I'll give you the exact lines.

4. Rebuild for changes to appear — a splash screen can't be previewed without a full rebuild.

### App icon (home screen icon)
Covered in section 1 — regenerate all `mipmap-*` densities using
[icon.kitchen](https://icon.kitchen) or Android Studio's Image Asset Studio, replace the files
in `GodeliciousApp/android/app/src/main/res/mipmap-*/`, rebuild.
