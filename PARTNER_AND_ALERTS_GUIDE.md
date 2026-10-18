# Partner portals + order alerts — setup guide

## What was added
1. **New-order alerts** to admin: dashboard pop-up + beep, browser push (Firebase), and WhatsApp (Cloud API).
2. **Brand partner portal**: Orders (live), Order History (date filter), Inventory (stock in/out, low-stock),
   My Menu with **admin approval** for new items, edits (price/photo/name) and removals.
3. **Admin > Item Approvals** page: approve / reject with a note.
4. **Venue partner portal** (`/venue/login`, `/venue/register`): calendar of requests, accept/reject with a quote,
   tariffs by event type (hall / food per plate / other services), venue details (event types, services, food), blocked dates.
5. **Admin > Venue Partners**: approve venues before customers see them.
6. **Customer web**: "Book a venue" (browse, tariffs, send request, track under My venue requests).
7. Push + WhatsApp also go to: brand partners (their own items only), venue owners (new request), customers (venue accepted/declined).

Mobile app (GodeliciousApp): new **Book a venue** screens (browse, tariffs, request with date/time pills, My venue requests) and push-notification code. Push needs the extra steps in `customer-app/PUSH_SETUP.md`. iOS push is not set up.

## Step 1 — Database (PowerShell, from D:\godelicious-project\godelicious\backend)
After copying the new files over your project:
```
cd D:\godelicious-project\godelicious\backend
npm install
npx prisma migrate dev --name partner_features
```
Make sure `schema.prisma` says `provider = "postgresql"` (this zip already does) and DATABASE_URL points to Supabase.
Existing menu items stay visible (they default to APPROVED).

## Step 2 — Admin dashboard
```
cd D:\godelicious-project\godelicious\admin-dashboard
npm install
```
(adds the `firebase` package). Then push everything to git; Railway redeploys. Add the NEXT_PUBLIC_FIREBASE_* variables to the
Railway **admin** service (redeploy after — they are baked in at build time) and paste the same config into
`admin-dashboard/public/firebase-messaging-sw.js`.

## Step 3 — Browser push alerts
Sign in to admin → bottom-left **Turn on alerts** → Allow. Do the same on each device/browser (brand and venue portals have the same button).
Backend needs the FIREBASE_* variables (already in PRODUCTION_READY_GUIDE.md section 10).

## Step 4 — WhatsApp alerts (optional, needs Meta approval)
1. https://developers.facebook.com → My Apps → Create App → Business → add the **WhatsApp** product.
2. WhatsApp > API Setup: copy the **Phone number ID**. Use the free test number first (it can message only recipients you verify in that page).
3. Create a permanent token: Business Settings > Users > System Users > Add (Admin) > Generate token with `whatsapp_business_messaging` + `whatsapp_business_management`.
4. WhatsApp Manager > Message templates > Create: Category **Utility**, name `order_alert`, language English, body: `Godelicious alert: {{1}}` with a sample value. Wait for approval.
5. Railway backend variables: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE_NAME=order_alert`, `WHATSAPP_TEMPLATE_LANG=en`.
6. Admin > Settings > put your WhatsApp number (919916989185 format) > Save.
7. For your own number as the sender (not the test number) Meta requires business verification (DS Enterprises documents). Messages are billed per conversation by Meta.

Without a template name, plain text is used, which WhatsApp delivers only if that person messaged your business number in the last 24 hours.
If you skip WhatsApp, nothing breaks.

## Step 5 — Try it
- Admin: Item Approvals, Venue Partners, Settings.
- Brand partner: https://<admin-url>/partner/register → add item → admin approves → item shows to customers.
- Venue partner: https://<admin-url>/venue/register → add details + tariffs → admin approves in Venue Partners →
  customer web /venues → send request → owner sees it in Calendar & Requests → Accept with a quote.

## Mobile app update
Copy the new `customer-app` files over `D:\godelicious-project\GodeliciousApp` (src\push.js, src\api\client.js, src\navigation, src\context, src\screens\Venue*.js, MyVenueRequestsScreen.js, HomeScreen.js). **Keep your own `src\config.js` and the Railway URL in client.js** if you changed it.
Then rebuild: `cd android` → `.\gradlew.bat assembleRelease`. Push: follow `PUSH_SETUP.md`.


---

# Part 4 — Home-screen features (rewards, weekly box, party planner, favourites…)

## A. Backend (PowerShell)

```powershell
cd D:\godelicious-project\godelicious\backend
npm install
npx prisma migrate dev --name preview_features
git add .
git commit -m "Preview features"
git push
```
Railway redeploys by itself after the push. To apply the new database tables on Railway, run once:
```powershell
npx prisma migrate deploy
```
(with your Railway/Supabase DATABASE_URL set in `.env`).

## B. Admin dashboard — do these once, or the features stay empty

1. **Menu → edit each item**: set *Planner role* (Main / Sweet / Drink) and *Serves per unit*.
   - Party planner and Weekly meal box only use items tagged **Main**.
   - For items sold by kg, "serves" means guests per kg (e.g. 12 for Mysore pak).
2. **Coupons**: tick *Show in app* (and add a title) on coupons you want in "Offers for you".
3. **Settings**: set Delivery fee, Free delivery above, Weekly meal box saving %, Referral reward points.
   - Delivery fee 0 = delivery always free (the default).
4. **Weekly Meal Boxes** (new sidebar link): see all plans, pause/resume/cancel, and "Create due orders now".

## C. Mobile app

Copy the new `customer-app\src` files over `D:\godelicious-project\GodeliciousApp\src`, **keeping your own `src\config.js` and the Railway URL in `api\client.js`**. Then:
```powershell
cd D:\godelicious-project\GodeliciousApp
npm install
cd android
.\gradlew.bat assembleRelease
```
APK: `android\app\build\outputs\apk\release\app-release.apk`

## D. How the rules work

- Prices include 5% GST (shown as "GST included"). Nothing is added on top.
- Reward points: 1 point per ₹10 on delivered orders; 10 points = ₹1.
- Referral: both people get the reward when the friend's first order is delivered.
- Orders need 15 hours' notice. Delivery slots: 8 AM–9 PM, every 30 minutes.
- Weekly box: customer can skip/change until 6 PM the day before. A normal Cash-on-Delivery order is created automatically after that cutoff (checked every 15 minutes).

## E. Not included / be aware

- No live driver tracking (needs a driver app). The map shows only the delivery address.
- Weekly boxes are pay-on-delivery per order, not weekly online billing.
- Kannada text should be checked by a native speaker.
- iOS push is not set up.
- This was syntax-checked and the logic tested with sample data, but not run against a real database or built into an APK here — do a test order, a test weekly box and a test referral before launch.

**Update:** minimum grams per weight item is now enforced (set it per item in Menu → "Minimum order (g)"; default 1000 g). The app starts at that amount and the server rejects smaller orders. If you want 500 g allowed on an item, set its minimum to 500.


---

# Part 5 — GST on top, meal boxes, banners, edit/delete, new logo

## What changed
- **GST 5% is added on top** of the bill (after any coupon). It is not included in item prices. It is not charged on delivery. The percentage can be changed in Admin → Settings.
- **Coupons** work when the cart subtotal is ₹1000 or more (Settings → coupon minimum). If the discount takes the amount below ₹1000, checkout still works: GST is added and the customer pays.
- **Meal boxes**: build them in Admin → Meal Boxes (pick dishes, add a photo). Customers see each dish's photo and name in rows after the description. A minimum of **10 meals** per order is needed, and customers can mix boxes (Settings → meal box minimum).
- **Banners** uploaded in Admin now show in the app and website. Images are stored in the database, so they survive deploys. **Old banners and photos uploaded before this update must be uploaded again once.**
- **Menu items and categories** can be edited and deleted. An item that has past orders is hidden (archived) rather than erased. A category that has dishes asks where to move them.
- New logo (green lotus) in admin, website, app launcher (Android and iOS icon sets).

## 1. Copy the files (PowerShell)
Unzip `godelicious-project.zip` to a folder, e.g. `D:\godelicious-new`. Then copy over your project without touching your OTP login files:

```powershell
robocopy "D:\godelicious-new\godelicious" "D:\godelicious-project\godelicious" /E /XD node_modules .next .git /XF otp.controller.js auth.routes.js OtpForm.js
```

The zip does not contain your OTP login files (login page, register page, lib/api.js, OtpForm.js, otp.controller.js, auth.routes.js), so yours stay as they are.

Copy the app too:
```powershell
robocopy "D:\godelicious-new\godelicious\customer-app" "D:\godelicious-project\GodeliciousApp" /E /XD node_modules
```
App icons: copy `android-resources\res` into `GodeliciousApp\android\app\src\main\res` and `ios-resources\AppIcon.appiconset` into `ios\GodeliciousApp\Images.xcassets\`.

## 2. Database and Railway
```powershell
cd D:\godelicious-project\godelicious\backend
npx prisma migrate dev --name meal_boxes_gst
cd ..
git add .
git commit -m "GST, meal boxes, banners, edit/delete, logo"
git push
```
In Railway, open both services (backend, admin, website) → Deployments and confirm the newest one is green. The bottom of the admin sidebar and the website footer show a build stamp **2026-10-18.1**. If you do not see it, that service did not redeploy: check its Root Directory (admin-dashboard / customer-web / backend) and press Redeploy.

## 3. Admin steps (once)
1. Settings: check GST %, coupon minimum (1000), meal-box minimum (10), minimum order.
2. Meal Boxes: create your boxes.
3. Banners: upload them again.
4. Menu: try editing a dish and deleting a test dish.

## 4. Rebuild
Admin and website rebuild on Railway automatically. For the app: `cd D:\godelicious-project\GodeliciousApp; npm install; cd android; .\gradlew assembleRelease`. For iOS, push to GitHub and run Codemagic.

## 5. Things to know
- The "Meal Box" tile on the home screen now opens the meal-box list instead of the booking form.
- The 10-meal minimum is across all boxes in the cart, and it is enforced by the server too.
- The website now matches the app for the home screen, meal boxes, GST, a phone tab bar and the logo. The website does not yet have the Planner, Weekly Box, Favourites and Addresses pages that the app has.
- Nothing was tested against a live database or a real phone; please test one order end to end (with and without a coupon) after deploying.
- Kannada wording needs a native speaker to check.


## 6. Delivery area (20 km)
Orders are accepted only when the delivery location is within **20 km** of the centre point. The centre is set to Vijayanagar 4th Stage, Mysuru (12.322983, 76.5878328), which is what Google Maps gives for that area, so it can be a little off your exact house. For the exact spot: in Google Maps right-click your house, click the two numbers shown, then paste them in **Admin → Settings → Latitude / Longitude** and Save. The radius and an on/off switch are there too.

- Outside the area, customers see "Service not available to this area yet. Coming shortly. Thank you." in the app and website, and the server refuses the order.
- Customers must pick a location (current location or on the map) so the distance can be checked. A typed address alone is not enough.
- Run the migration again (`npx prisma migrate dev --name service_area`), then push.
- Weekly box subscriptions are not covered by this check yet.
