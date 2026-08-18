# Godelicious — Deployment Guide (Railway / Render)

This deploys all three web-facing parts of the project as live, public services:

- `backend` → a public API URL (e.g. `https://godelicious-backend.up.railway.app`)
- `admin-dashboard` → a public admin URL
- `customer-web` → a public storefront URL

Both Railway and Render work the same way for this project — pick whichever you prefer,
or mix (e.g. backend on Railway, dashboards on Render). Steps below cover both.

**You'll deploy the same GitHub repo three times** — once per app — because each is a separate
service pointed at a different subfolder of the same repo.

---

## 0. Prerequisites

### Push the project to GitHub

Both platforms deploy from a Git repo, not a zip upload.

```bash
cd godelicious
git init
git add .
git commit -m "Initial commit"
```
Create an empty repo on GitHub, then:
```bash
git remote add origin https://github.com/<your-username>/godelicious.git
git branch -M main
git push -u origin main
```

### Switch Prisma to PostgreSQL (if you haven't already)

You already connected to Supabase Postgres earlier in this project — make sure
`backend/prisma/schema.prisma` has:
```prisma
datasource db {
  provider = "postgresql"   // not "sqlite" — sqlite won't survive on these platforms anyway,
  url      = env("DATABASE_URL")   // their filesystems are ephemeral
}
```
Commit and push this change if it's only saved locally.

### Decide on your database

You already have a working Supabase Postgres database from earlier — **you can just keep using
it** in production; no need to spin up a new one. Have its connection string ready:
```
postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```
(Alternative: both Railway and Render also offer their own managed Postgres add-ons if you'd
rather keep the database on the same platform as the backend — either works fine.)

---

## 1. Deploy the backend

### Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select
   your `godelicious` repo.
2. Railway will ask which folder to deploy — set **Root Directory** to `backend`.
3. Go to the service's **Variables** tab and add:
   ```
   DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
   JWT_SECRET=<generate a long random string>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=*
   RAZORPAY_KEY_ID=<your Razorpay key id>
   RAZORPAY_KEY_SECRET=<your Razorpay key secret>
   NODE_ENV=production
   ```
   (Leave `CORS_ORIGIN=*` for now — you'll tighten it in step 4 once you know your dashboard/web
   URLs. `PORT` doesn't need to be set — Railway injects it automatically and our server already
   reads `process.env.PORT`.)
4. Go to **Settings → Deploy** and set the **Start Command** to:
   ```
   npx prisma migrate deploy && node src/index.js
   ```
   This applies any pending database migrations automatically on every deploy, then starts the
   server — `migrate deploy` (unlike `migrate dev`) is non-interactive and safe to run repeatedly.
5. Trigger a deploy (Railway does this automatically on push, or click **Deploy**).
6. Once live, go to **Settings → Networking** and click **Generate Domain** to get a public URL
   like `https://godelicious-backend-production.up.railway.app`.
7. Seed the production database once:
   ```bash
   npx @railway/cli login
   npx @railway/cli link          # select your project/service
   npx @railway/cli run npm run seed
   ```
8. Verify: visit `https://<your-backend-url>/health` — should return `{"status":"ok",...}`.

### Render (alternative)

1. [render.com](https://render.com) → **New +** → **Web Service** → connect your GitHub repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npx prisma migrate deploy && node src/index.js`
5. **Environment**: add the same variables as the Railway list above (`DATABASE_URL`,
   `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`).
6. Create the service — Render assigns a public URL like
   `https://godelicious-backend.onrender.com`.
7. Seed once, using Render's **Shell** tab (under the service) to run:
   ```bash
   npm run seed
   ```
8. Verify: visit `https://<your-backend-url>/health`.

> **Render free tier note:** free web services spin down after 15 minutes of inactivity and take
> ~30–60 seconds to wake on the next request. Fine for testing, not for a real production
> customer experience — upgrade to a paid instance before going live for real users.

---

## 2. Deploy the admin dashboard

Same platform, new service, pointed at a different subfolder — **do this as a second service**,
not by editing the backend one.

### Railway
1. In the same Railway project: **New** → **GitHub Repo** → same repo again.
2. **Root Directory**: `admin-dashboard`
3. **Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://<your-backend-url-from-step-1>
   ```
4. Railway auto-detects Next.js and runs `npm install` / `npm run build` / `npm start` — no
   start-command override needed here (unlike the backend, there's no migration step).
5. **Generate Domain** once deployed, e.g. `https://godelicious-admin.up.railway.app`.

### Render (alternative)
1. **New +** → **Web Service** → same repo.
2. **Root Directory**: `admin-dashboard`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Environment**: `NEXT_PUBLIC_API_URL=https://<your-backend-url>`

---

## 3. Deploy the customer web app

Identical process, third service, pointed at `customer-web`.

### Railway
1. **New** → **GitHub Repo** → same repo.
2. **Root Directory**: `customer-web`
3. **Variables**: `NEXT_PUBLIC_API_URL=https://<your-backend-url>`
4. **Generate Domain**, e.g. `https://godelicious-web.up.railway.app`.

### Render (alternative)
Same as the admin dashboard steps above, with **Root Directory**: `customer-web`.

---

## 4. Lock down CORS

Now that you have real URLs for the dashboard and storefront, go back to the **backend**
service's environment variables and tighten `CORS_ORIGIN` from `*` to the actual origins:

```
CORS_ORIGIN=https://godelicious-admin.up.railway.app,https://godelicious-web.up.railway.app
```

Redeploy the backend for this to take effect (both platforms redeploy automatically when you
save new environment variables, or trigger it manually).

The mobile app isn't affected by this — the backend's CORS check already allows requests with no
`Origin` header (see `src/index.js`), which is how React Native's `fetch` behaves. CORS is a
browser-only mechanism.

---

## 5. Point the mobile app at production

Open `customer-app/src/api/client.js` and change:
```js
export const API_URL = "https://<your-backend-url>";
```
replacing the `10.0.2.2`/local placeholder. Rebuild the APK per `APK_BUILD_GUIDE.md` — an APK
built against `localhost` or your LAN IP stops working the moment it leaves your dev machine, so
this step is required before distributing a real build to anyone else.

---

## 6. Post-deploy smoke test

Walk through the full loop against production:

1. Visit the customer web URL → register a new account → browse menu → add to cart → checkout
2. Visit the admin dashboard URL → sign in with the seeded admin login → confirm the order from
   step 1 appears under **Orders**
3. Advance the order status in the dashboard → refresh the customer web order page → confirm the
   status updated
4. Submit a venue enquiry from the web or app → approve it from the dashboard → confirm the
   customer side reflects "APPROVED"

If all four work, the full stack is live and in sync.

---

## 7. Custom domains (optional)

Both platforms support attaching your own domain instead of the generated `*.up.railway.app` /
`*.onrender.com` subdomains — under **Settings → Domains** on either platform, add a domain and
follow the DNS (CNAME) instructions they give you. Do this per-service (backend, admin, web can
each have their own subdomain, e.g. `api.godelicious.com`, `admin.godelicious.com`,
`godelicious.com`).

---

## 8. Image uploads and ephemeral storage — read before going live

The admin dashboard's menu form now supports uploading dish photos (**Menu → New item → Image**).
The backend saves these to a local `backend/uploads/` folder and serves them at
`/uploads/<filename>`.

**This works fine locally, but breaks in production on Railway/Render**: both platforms use an
**ephemeral filesystem** — anything written to disk (including uploaded images) is wiped on every
redeploy or restart. Photos will vanish the next time you push a code change.

For a real production deployment, swap local disk storage for a cloud storage provider before
launch:

- **Cloudinary** — simplest for images specifically, generous free tier, built-in resizing/CDN
- **AWS S3** — most standard, more setup
- **Supabase Storage** — convenient since you're already using Supabase for the database

Only `backend/src/config/upload.js` and `backend/src/routes/uploads.routes.js` need to change —
swap the `multer.diskStorage` for the provider's SDK/multer-storage adapter, and the rest of the
app (admin dashboard, customer web, mobile app) keeps working unchanged, since they only ever
consume whatever URL the upload endpoint returns.

If you're just testing/demoing right now, local storage is fine — just know images will
disappear on the next deploy until this is swapped out.

## 9. Ongoing deploys

Both platforms redeploy automatically on every `git push` to your connected branch. Going
forward, your workflow is just:
```bash
git add .
git commit -m "description of change"
git push
```
and each of the three services rebuilds and redeploys itself. New Prisma migrations you create
locally (`npx prisma migrate dev --name <something>`) get applied automatically on the backend's
next deploy, because the start command runs `prisma migrate deploy` every time.
