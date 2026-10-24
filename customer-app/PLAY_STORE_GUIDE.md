# Godelicious: Google Play Store Guide (Windows / PowerShell)

Google Play wants an **AAB** (Android App Bundle), not an APK, for new apps. An APK is still handy for
installing on your own phone. This guide ends with both.

Some Play rules change often (target Android level, test requirements, form questions). Where this guide
says "check", the Play Console will show the current rule.

---

## Part A. Before you build (do these first)

1. **Point the app at your live backend.** Edit `GodeliciousApp\src\api\client.js`, line 11:
   ```
   export const API_URL = "https://api.godelicious.in";
   ```
   Use your real backend address (the `api.godelicious.in` subdomain if you set it up, otherwise the
   Render address, for example `https://godelicious.onrender.com`). No `/` at the end.
   Build the final app only after this is right, because the address is built into the app.
2. **Razorpay live keys:** the backend must use your **live** keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) before
   customers pay. Test keys do not take real money.
3. **Reviewer login:** Google reviewers cannot receive a real SMS. On the backend set `REVIEW_PHONE` (a number you
   choose) and `REVIEW_OTP` (a 6-digit code you choose). You enter both in Play Console under App access (Part D).
4. **Google Maps key:** put your key in `GodeliciousApp\src\config.js` (`GOOGLE_MAPS_API_KEY`) so "use my current
   location" fills the address. The 20 km delivery check needs the location it captures.
5. **App icon:** the new lotus icons are in `android-resources\res`. Copy them into
   `GodeliciousApp\android\app\src\main\res`.

## Part B. Set the app identity (permanent)

The **application id** is the app's permanent name on Google Play. It can never change after you publish.
Choose it now, in lowercase, for example `com.godelicious.app`.

Open `GodeliciousApp\android\app\build.gradle` (Notepad is fine) and, in `defaultConfig`, set:
```
applicationId "com.godelicious.app"
versionCode 1
versionName "1.0.0"
```
Every new upload to Play needs a higher `versionCode` (2, 3, 4 ...).

## Part C. Create your signing key (once, and back it up)

1. Make the key (needs Java, which you already have for the Android build):
   ```powershell
   cd D:\godelicious-project\GodeliciousApp\android\app
   keytool -genkeypair -v -storetype PKCS12 -keystore godelicious-upload.keystore -alias godelicious -keyalg RSA -keysize 2048 -validity 10000
   ```
   It asks for a password and your name and organisation. **Write the password down.**
2. **Back up `godelicious-upload.keystore` and its password** somewhere safe (a USB drive and a password manager).
   Never put it on GitHub. If you lose it you must ask Google to reset your upload key.
3. Tell Gradle about it. Open (or create) `C:\Users\<YourName>\.gradle\gradle.properties` and add:
   ```
   GODELICIOUS_UPLOAD_STORE_FILE=godelicious-upload.keystore
   GODELICIOUS_UPLOAD_KEY_ALIAS=godelicious
   GODELICIOUS_UPLOAD_STORE_PASSWORD=your-password
   GODELICIOUS_UPLOAD_KEY_PASSWORD=your-password
   ```
4. In `android\app\build.gradle`, inside `android { ... }`, add a release signing config and use it:
   ```
   signingConfigs {
       release {
           storeFile file(GODELICIOUS_UPLOAD_STORE_FILE)
           storePassword GODELICIOUS_UPLOAD_STORE_PASSWORD
           keyAlias GODELICIOUS_UPLOAD_KEY_ALIAS
           keyPassword GODELICIOUS_UPLOAD_KEY_PASSWORD
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```
   If `buildTypes { release { ... } }` already exists, change its `signingConfig` line to `signingConfigs.release`
   instead of the debug one.

## Part D. Build the files

```powershell
cd D:\godelicious-project\GodeliciousApp
npm install
cd android
.\gradlew clean
.\gradlew bundleRelease     # the file for Google Play
.\gradlew assembleRelease   # an APK for installing on your own phone
```
Outputs:
- Play file: `android\app\build\outputs\bundle\release\app-release.aab`
- Phone file: `android\app\build\outputs\apk\release\app-release.apk`

Install the APK on your phone first and test sign-in, a meal-box order, checkout and payment.

**Target Android level:** Play only accepts apps built for a recent Android level (the "target SDK"). This project
was created with React Native 0.75, whose default level may be older than Play currently requires. If Play Console
rejects the upload with a message about "target API level", send that message and the contents of
`android\build.gradle`, and the exact changes can be worked out. This can need a newer Android Gradle plugin.

## Part E. Create the Play Console account

1. Go to **play.google.com/console** and sign in with the Google account you want to own the app (use a company
   account, not a personal one you may lose access to).
2. Pay the **one-time registration fee** (about US$25).
3. Choose the account type:
   - **Organisation** (recommended if DS Enterprises is a registered business): needs a D-U-N-S number (free to
     request) and business documents. No mandatory testing period.
   - **Personal**: new personal accounts must first run a **closed test with at least 12 testers for 14 days in a row**
     before they can publish to production (check the Console for the current number).
4. Verify your identity (ID, address, phone). Verification can take a few days.

## Part F. Create the app

Console, then **Create app**: name **Godelicious**, language English (India), type **App**, **Free**,
accept the declarations.

### Store listing (Grow, then Main store listing)
- **Short description** (80 characters max), for example: `Order meal boxes and catering from Godelicious, delivered fresh in Mysuru.`
- **Full description** (4000 max): what you sell, meal boxes (minimum 10 meals), delivery area (20 km from Mysuru),
  weekly boxes, venue booking.
- **App icon:** 512 x 512 PNG (make it from `brand-assets\logo-icon-1024.png`).
- **Feature graphic:** 1024 x 500 PNG (a banner with your logo and a food photo).
- **Phone screenshots:** at least 2, up to 8 (the guide screenshots in the project are a good starting point).
- **Category:** Food & drink. **Contact email and phone.** **Website:** `https://godelicious.in`

### App content (Policy, then App content). Every section must be completed
- **Privacy policy URL:** `https://godelicious.in/privacy` (the page already exists in the website).
- **App access:** choose "all or some functionality is restricted", then enter the reviewer phone number and the OTP
  you set as `REVIEW_PHONE` and `REVIEW_OTP`, with a note: "Sign in with this number and code, then place an order."
- **Ads:** No.
- **Content rating:** answer the questionnaire honestly (no violence, no user-generated content that is public).
- **Target audience:** 18 and over.
- **Data safety:** declare what the app collects and shares. For Godelicious:
  - Collected: name, email, phone number, delivery address and location (while using the app), order history,
    device identifiers for notifications.
  - Payments: handled by Razorpay; the app does not store card details.
  - Data is encrypted in transit (HTTPS). Users can ask for deletion (state your support email).
- **Location permission:** declare it is used while the app is open, to fill the delivery address.
- **Financial features / government / health declarations:** answer No unless they apply.
- **Account deletion:** Google requires a way to request deleting an account. Provide a web page or email in the form.

## Part G. Test, then publish

1. **Testing, then Internal testing, then Create new release.** Upload the `.aab`, add yourself and a few testers
   (their Gmail addresses), save, and they install through a link. No review wait for internal testing.
2. Test on real phones (orders, payments, location, 20 km rule, meal boxes).
3. If your account is Personal: run a **Closed testing** track with the required testers for the required days.
4. **Production, then Create new release.** Upload the same `.aab`, add release notes ("First release"), review the
   warnings, and **Send for review**.
5. Review usually takes a few hours to a few days, and the first one can take longer. You get an email when it is approved
   or rejected, with the reason.

## Part H. Every later update

1. Change the code, raise `versionCode` (and `versionName`) in `android\app\build.gradle`.
2. `.\gradlew bundleRelease`, upload the new `.aab` to a new release (Internal first, then Production).
3. Keep using the **same keystore and password** forever.

## Quick fixes
- "You uploaded a debug-signed bundle": Part C step 4 was skipped, so release is still using the debug key.
- "Version code already used": raise `versionCode`.
- "Target API level too low": see the note at the end of Part D.
- App opens then closes on a real phone: the address in `client.js` is wrong, or the backend is down. Open
  `https://api.godelicious.in/api/settings` in the phone's browser; it should show settings text.
- Payments say "key invalid": the backend still has test keys, or the app was not rebuilt after the backend moved.
