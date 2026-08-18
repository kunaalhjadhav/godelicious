# Godelicious — Branding & Customization Guide

Everything you need to rebrand this project — logo, app name, colors, fonts — with a clear map
of exactly which files to touch in each of the four apps. Nothing here requires touching business
logic; it's all presentation-layer.

A placeholder logo (a simple "G" monogram) is already wired into every app so you can see where
it shows up — swap the files below with your real logo using the **same filenames** and
everything updates automatically, no code changes needed.

---

## 1. Logo

| App | File to replace | Format | Used for |
|---|---|---|---|
| Admin dashboard | `admin-dashboard/public/logo.svg` | SVG | Sidebar, login page |
| Admin dashboard | `admin-dashboard/app/icon.png` | PNG, 512×512 | Browser tab favicon (Next.js auto-detects this filename) |
| Customer web | `customer-web/public/logo.svg` | SVG | Nav bar |
| Customer web | `customer-web/app/icon.png` | PNG, 512×512 | Browser tab favicon |
| Customer app (mobile) | `customer-app/src/assets/logo.png` | PNG, 512×512 | Login screen |
| Customer app (mobile) | *(native, see below)* | PNG, multiple sizes | Home-screen app icon |

**Web/admin (SVG):** any SVG works — just keep the filename `logo.svg`. Square-ish artwork looks
best since it's displayed in a rounded container.

**Mobile home-screen icon** is different from the in-app logo above — Android requires the icon
baked into the native project at multiple resolutions
(`android/app/src/main/res/mipmap-*/ic_launcher.png`), which only exists after you scaffold the
native project (see `customer-app/APK_BUILD_GUIDE.md`). Easiest path: use a free tool like
[icon.kitchen](https://icon.kitchen) or [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
— upload one 1024×1024 image, download the generated `mipmap-*` folders, and drop them into
`android/app/src/main/res/` in your scaffolded project, overwriting the placeholder ones.

A master 1024×1024 version of the placeholder logo (both `.png` and `.svg`) is included at
`brand-assets/` in this project root — useful as a starting size to design your real logo against,
or as an input to the icon-generator tools above.

---

## 2. App name & tagline

Three of the four apps read their display name from **one JS file** each — edit these and every
screen that shows the name updates automatically:

| App | File |
|---|---|
| Admin dashboard | `admin-dashboard/lib/brand.js` |
| Customer web | `customer-web/lib/brand.js` |
| Customer app (mobile, in-app text) | `customer-app/src/brand.js` |

Each exports just two lines:
```js
export const APP_NAME = "Godelicious";
export const APP_TAGLINE = "Catering, delivered.";
```
Change the strings, save, done.

### What those files DON'T cover

- **The mobile app's name on the phone's home screen** (under the icon) is set separately in
  `customer-app/app.json` — edit `"displayName"` there. This is a native-level setting, not
  something a JS import can reach.
- **Backend log messages and default seed data** (e.g. `backend/prisma/seed.js` creates a user
  named "Godelicious Admin", `backend/src/index.js` logs "Godelicious backend running...") are
  plain hardcoded strings — there's no shared config module on the backend since these are
  internal/dev-facing text, not UI a customer sees. If you want them changed too, it's a quick
  find-and-replace across `backend/` for the word "Godelicious" — nothing there affects
  functionality either way.
- **`package.json` `"name"` fields** across all four apps (e.g. `"godelicious-backend"`) are
  internal npm package identifiers, invisible to end users — safe to leave as-is, or rename if
  you're picky about it.

---

## 3. Colors

The whole visual identity (charcoal + saffron + basil + chili, per the design notes in earlier
build steps) is defined as **design tokens**, not scattered inline styles — change them in one
place per app and every component picks it up:

| App | File | Format |
|---|---|---|
| Admin dashboard | `admin-dashboard/tailwind.config.js` | Tailwind `theme.extend.colors` |
| Customer web | `customer-web/tailwind.config.js` | Tailwind `theme.extend.colors` |
| Customer app (mobile) | `customer-app/src/theme.js` | Plain JS object (`colors`, `spacing`) |

Example — to change the accent color from saffron to, say, a forest green, edit the `saffron` /
`saffron2` entries in each of those three files (keep the key names the same; only the hex
values need to change, since every component references the token name like `colors.saffron`,
not a literal hex code).

**Admin and web also share a signature CSS effect** — the ticket-pill / scallop-divider styling —
defined in each app's `app/globals.css`. These reference the same color tokens, so they update
automatically when you change the Tailwind config; no separate edit needed there.

---

## 4. Fonts

Admin and customer web both use **Fraunces** (headings) + **Inter** (body) + **IBM Plex Mono**
(order IDs, tags), loaded via `next/font/google` in each app's `app/layout.js`. To change fonts:

1. Pick replacements from [Google Fonts](https://fonts.google.com)
2. In `app/layout.js`, change the import and the three `const` declarations (e.g. swap `Fraunces`
   for `Playfair_Display`)
3. The rest of the app references `font-display` / `font-body` / `font-mono` Tailwind classes —
   no other files need editing.

The mobile app currently uses the OS's default system font (no custom font loading configured) —
adding one would require `react-native-vector-icons`-style native font linking, which is
meaningfully more setup than the web apps. Ask if you want that built out.

---

## 5. Quick rebrand checklist

Doing all of this in order, start to finish:

1. Design or commission a real logo (square, works at both large and small sizes)
2. Export it as: one SVG (or high-res PNG converted to SVG), one 512×512 PNG, one 1024×1024 PNG
3. Replace the 5 files listed in section 1 above
4. Edit the 3 `brand.js` files (section 2) with your real name/tagline
5. Edit `customer-app/app.json`'s `displayName` (section 2)
6. Run your logo through an icon generator for the mobile home-screen icon (section 1)
7. Adjust the color tokens in the 3 files from section 3 to match your real brand palette
8. (Optional) swap fonts per section 4
9. (Optional) find-and-replace "Godelicious" in `backend/` for internal log/seed text

None of this touches `SETUP_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, or `APK_BUILD_GUIDE.md` — those
describe infrastructure and are accurate regardless of branding.
