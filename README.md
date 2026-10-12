# Goddel Motors — Dealership Website

A mobile-first website for a single car dealership, plus a protected admin dashboard for staff.

- **Public site:** home, inventory with search/filters, vehicle details with photo gallery, WhatsApp / call / enquiry actions, About, Contact, branded 404. Light theme by default with a dark cinematic hero; theme toggle on every page.
- **Admin:** dashboard, inventory editor with photo uploads, enquiry management, team (invite / roles / disable), site settings, audit log — with three roles enforced on the server.

| Part | Stack |
| --- | --- |
| `frontend/` | React 19, Vite, TypeScript (strict), React Router, Tailwind CSS v4, React Hook Form + Zod, Lucide icons, Firebase Auth (web SDK) |
| `Backend/` | Node.js, Express 5, TypeScript, Mongoose (MongoDB Atlas), Firebase Admin SDK, Cloudflare R2 (S3 API), sharp, Zod |

---

## 1. Project structure

```
CAR WEBSITE/
├── frontend/
│   ├── public/                 static assets (hero, logo mockup, demo photos, favicon, robots.txt)
│   ├── src/
│   │   ├── admin/AdminApp.tsx  lazily-loaded admin routes (separate JS chunk incl. Firebase)
│   │   ├── components/         brand (logo), layout (header/footer/nav), sections, ui kit
│   │   ├── features/
│   │   │   ├── inventory/      API, filters, cards, gallery, price display
│   │   │   ├── enquiries/      enquiry form + schema
│   │   │   └── admin/          admin API client, AuthProvider, Firebase, PhotoManager
│   │   ├── hooks/ lib/ providers/ types/ styles/
│   │   ├── layouts/            PublicLayout, AdminLayout (+ RequirePermission)
│   │   ├── mocks/mockApi.ts    DEV-ONLY in-browser API for UI preview
│   │   └── pages/              public pages + pages/admin/*
│   ├── vercel.json             SPA routing, sitemap proxy, share previews, security headers
│   └── .env.example
├── Backend/
│   ├── src/
│   │   ├── config/             env validation, logger
│   │   ├── controllers/        public, admin, admin vehicles, SEO (sitemap/share)
│   │   ├── middleware/         auth (token + staff + RBAC), rate limits, uploads, errors
│   │   ├── models/             Vehicle, Enquiry, Staff, AuditLog, SiteSettings, PendingDeletion
│   │   ├── routes/             publicRoutes, adminRoutes
│   │   ├── schemas/            Zod request validation
│   │   ├── services/           business logic, storage (R2), image processing, serializers
│   │   ├── scripts/            create-owner, seed:settings, seed:demo, cleanup:orphans
│   │   ├── app.ts / server.ts
│   └── tests/                  authorization matrix, public API, unit tests
└── README.md
```

## 2. Requirements

- Node.js **22.9+** (uses `--env-file-if-exists`)
- A MongoDB Atlas cluster, a Firebase project, and a Cloudflare R2 bucket for full functionality

## 3. Install & run locally

```bash
# Backend
cd Backend
npm install
cp .env.example .env        # then fill in values (see section 4)
npm run dev                 # http://localhost:4000  (health: /health)

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env.local  # then fill in values
npm run dev                 # http://localhost:5173
```

**UI preview without any services:** set `VITE_USE_MOCK_API=true` in `frontend/.env.local` and run `npm run dev`. A yellow banner shows that sample data is in use, and the admin login offers “Preview as Owner / Inventory Manager / Sales Assistant”. This mode exists only in the dev server — production builds strip it out entirely. It is not a security boundary; the backend enforces all access.

### Other commands

| Where | Command | Purpose |
| --- | --- | --- |
| both | `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` | quality checks & production build |
| Backend | `npm start` | run the compiled server (`dist/`) |
| Backend | `npm run create-owner -- --email you@example.com --name "Your Name"` | create the first Owner and print a password-setup link |
| Backend | `npm run seed:settings` | create the default site-settings document |
| Backend | `npm run seed:demo -- --frontend-url https://your-site` | OPTIONAL labelled demo listings (`--remove` deletes them) |
| Backend | `npm run cleanup:orphans` | retry deleting image files whose deletion failed earlier (safe to schedule daily) |

## 4. Environment variables

### Backend (`Backend/.env`) — secrets live **only** here

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | – | `development` / `production` |
| `PORT` | – | default `4000` |
| `MONGODB_URI` | prod | Atlas connection string |
| `CORS_ORIGINS` | yes | comma-separated exact frontend origins, e.g. `https://goddelmotors.com,https://www.goddelmotors.com` |
| `PUBLIC_SITE_URL` | yes | public site URL (sitemap, share pages, staff setup links) |
| `TRUST_PROXY` | – | number of proxies in front of the API (usually `1` on a PaaS) so rate limits see real IPs |
| `ENQUIRY_IP_SALT` | prod | 32+ random chars; IPs are stored only as salted hashes |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | for admin | service-account credentials (private key on one line with `\n`) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | for photos | R2 API token + public bucket URL |
| `STORAGE_DRIVER`, `PUBLIC_API_URL` | – | `STORAGE_DRIVER=mongodb` stores photos in MongoDB until R2 is ready (see *Temporary photo storage in MongoDB*); `PUBLIC_API_URL` is this API's public URL |
| `MAX_UPLOAD_MB`, `MAX_IMAGES_PER_VEHICLE` | – | defaults 12 and 24 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | for invite email | SMTP server for branded staff invitations (see *Staff invitation email*) |
| `FIREBASE_WEB_API_KEY` | – | fallback: Firebase sends its own password-reset email when SMTP isn't set (same value as `VITE_FIREBASE_API_KEY`) |

Without Firebase the admin API answers `503`; without R2 photo uploads answer `503` with a clear message. Nothing pretends to work.

### Frontend (`frontend/.env.local`) — everything here is public

`VITE_API_BASE_URL`, `VITE_SITE_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, optional fallback contacts `VITE_PUBLIC_PHONE/WHATSAPP/EMAIL`, and dev-only `VITE_USE_MOCK_API`. Firebase web config values are public identifiers, not secrets. **Never** put database URLs, service-account keys or R2 secrets in `VITE_` variables.

## 5. Service setup

### MongoDB Atlas
1. Create a cluster and a database user with read/write on one database (e.g. `goddel-motors`).
2. Network access: allow your API host's outbound IPs (or `0.0.0.0/0` if your host has dynamic IPs — the strong password is then the protection).
3. Put the connection string in `MONGODB_URI`. Indexes are synced on startup.

### Firebase Authentication
1. Create a Firebase project → **Authentication → Sign-in method → Email/Password: enable**. Do not enable public sign-up flows in the UI — there is no registration page; staff are invited.
2. **Authentication → Settings → Authorized domains:** add your production domain.
3. **Project settings → Your apps → Web app:** copy the config into the `VITE_FIREBASE_*` variables.
4. **Project settings → Service accounts → Generate new private key:** copy `project_id`, `client_email`, `private_key` into the backend env. Never commit the JSON file.
5. Run `npm run create-owner -- --email ... --name "..."` in `Backend/`, open the printed link, set a password, then sign in at `/admin/login`.

### Cloudflare R2
1. Create a bucket (e.g. `goddel-motors-images`).
2. Enable public access via a **custom domain** (recommended) or the `r2.dev` URL; put that URL in `R2_PUBLIC_BASE_URL`.
3. **Manage R2 API tokens:** create a token with *Object Read & Write* scoped to that bucket; use its access key ID/secret and your account ID.
4. Uploads go through the API (validated, re-encoded, metadata stripped), so no bucket CORS rule is needed.

### Temporary photo storage in MongoDB
Until R2 is set up, `STORAGE_DRIVER=mongodb` stores photos in the database (GridFS bucket `vehicleImages`) and serves them from `GET /api/v1/media/<key>` with year-long browser caching. Set `PUBLIC_API_URL` to the API's public URL so photo links resolve.
- Every photo is about 1–2 MB once all sizes are saved, so the free Atlas tier (512 MB, shared with all other data) holds roughly 40 vehicles with 8 photos each. Every photo view is also served by the API instead of a CDN.
- To switch: fill in the `R2_*` variables and remove `STORAGE_DRIVER`. New uploads go to R2; existing photos keep working from MongoDB because each photo records where it is stored, and deleting or replacing one removes it from the right place.

### Staff invitation email
When the Owner invites someone (or presses **Resend invite**), the API emails the password-setup link directly, trying in order:
1. **SMTP** (preferred) — a branded invitation from `MAIL_FROM`. Any provider works (Resend, Postmark, Brevo, Mailgun, Amazon SES, Google Workspace…). Use port 587 with `SMTP_SECURE=false` (STARTTLS is required) or 465 with `SMTP_SECURE=true`, and send from a domain you've verified with the provider (SPF/DKIM) so invites don't land in spam.
2. **Firebase's built-in email** — if SMTP isn't set but `FIREBASE_WEB_API_KEY` is. The staff member receives Firebase's “Reset your password” email; you can edit its wording under **Authentication → Templates**. Your site domain must be in *Authorized domains*.
3. **Manual** — with neither configured, or if sending fails, the Owner sees the link once (with the reason) to send by hand.

When an email is sent the link is never shown in the dashboard. The audit log records how each invite was delivered.

Uploaded photos are checked by content (JPEG/PNG/WebP, or iPhone HEIC/HEIF which is converted on the server; at least 400×300), auto-rotated, stripped of EXIF/GPS data, and stored as a JPEG original plus WebP sizes 480/960/1600 for responsive `srcset`.

## 6. Roles & security

| Capability | Owner | Inventory Manager | Sales Assistant |
| --- | :-: | :-: | :-: |
| Dashboard | ✓ | ✓ | ✓ |
| View inventory (incl. drafts) | ✓ | ✓ | ✓ (read-only) |
| Create/edit vehicles, prices, availability, photos | ✓ | ✓ | – |
| Archive / restore / delete vehicles | ✓ | – | – |
| View & update enquiries, add notes | ✓ | – | ✓ |
| Assign enquiries | ✓ | – | – |
| Team, Settings, Audit log | ✓ | – | – |

- Every admin request verifies the Firebase ID token (with revocation check) and loads the staff record; disabled or unknown staff are rejected on every request. Disabling a staff member also disables their Firebase user and revokes refresh tokens.
- Permissions come from one table (`Backend/src/lib/permissions.ts`) and are checked per endpoint; the UI hides what a role can't use but is not relied on. `Backend/tests/authorization.test.ts` covers every role against every protected endpoint.
- Enquiries are never exposed through public endpoints. Spam protection: honeypot field, minimum fill time, per-IP rate limit (5 / 10 min), per-phone daily limit.
- Helmet security headers, strict CORS allowlist, JSON body limit, rate limits on public/admin/upload routes, Zod validation on all input, HTML-escaped share pages.
- Security-sensitive actions (staff invites, setup links, role/status changes, settings, enquiry status/assignment, vehicle create/update/archive/restore/delete, photo upload/replace/delete) go to the audit log without passwords or tokens. Sign-in attempts are handled and logged by Firebase, not this audit log.
- Optimistic concurrency: if two people edit the same vehicle, the second save is rejected with a “reload latest” prompt instead of silently overwriting.

### Currency
Each vehicle keeps the price and currency staff entered (default GHS); conversions never change it. Visitors pick a currency — GHS plus USD, EUR, GBP, CAD, NGN, CNY and AED (whichever the Owner enables) — from the header, the Browse Cars filters, or next to the home-page price search. Changing currency converts any price range already set. Settings (with live rates) still load while the database is unreachable, so currency switching keeps working. To add a currency, extend `CURRENCIES` in both `Backend/src/types/domain.ts` and `frontend/src/types/index.ts`. Prices then lead with the converted figure, marked “≈” and “Estimate”, with the actual listed price underneath and the rate date on the vehicle page. The choice is remembered on that device.

- **Rates:** by default the API uses **live market rates** from [ExchangeRate-API](https://www.exchangerate-api.com)'s free open endpoint (no key; updated daily; cached for 6 hours). Their terms require attribution, so the footer shows “Rates by ExchangeRate-API” while live rates are in use. The Owner can switch to **their own rates** in Settings; own rates also act as a backup if the live feed is unreachable. Live data older than 4 days is not used. With no usable rate, only listed prices are shown and the currency picker is hidden.
- **Filters:** visitors type price ranges in their chosen currency. Every listing is compared by its estimated value using the same rates; listings in a currency with no rate are left out of price-range results and sorted last.

## 7. Deployment

**Backend** (Render, Railway, Fly.io, a VPS, etc.)
- Build `npm ci && npm run build`, start `npm start`, Node 22.9+.
- Set all backend env vars with `NODE_ENV=production`, `TRUST_PROXY=1` (or your proxy count), `CORS_ORIGINS` = your site origin(s), `PUBLIC_SITE_URL` = your site URL.
- Health check path: `/health`. Optionally schedule `npm run cleanup:orphans` daily.

**Frontend** (Vercel, or any static host)
- Root directory `frontend`, build `npm run build`, output `dist`.
- Set the `VITE_*` variables (`VITE_API_BASE_URL` = your API URL, `VITE_USE_MOCK_API` unset).
- In `frontend/vercel.json` replace `https://api.example.com` with your API URL. It provides SPA routing, `/sitemap.xml` proxied from the API, server-rendered Open Graph previews for vehicle links shared on WhatsApp/Facebook/X, and security headers.
- In `frontend/public/robots.txt` replace the example sitemap URL with your domain.
- On other hosts, configure an SPA fallback to `index.html` and a proxy for `/sitemap.xml`.

**Before launch checklist:** create the owner, fill in Settings (phone, WhatsApp, email, address, hours, About text, privacy notice), remove demo data (`npm run seed:demo -- --remove`), replace the logo with the official vector file, and review the privacy notice text with someone qualified.

## 8. Verification results (at time of writing)

| Check | Backend | Frontend |
| --- | --- | --- |
| TypeScript (strict) | pass | pass |
| ESLint | pass, 0 warnings | pass, 0 warnings |
| Tests | **145 passed** (authorization matrix for all roles/endpoints incl. disabled & expired tokens, public API, validation, spam rules, image processing incl. a real HEIC photo, cross-currency price filters and live/own exchange rates against a real in-memory MongoDB, invite delivery through a local SMTP server and Firebase fallback) | **40 passed** (currency switcher and estimates, price-filter note and currency, contact links, URL filters, enquiry form validation/submission/429, vehicle card, role-gated admin UI, button visibility, HEIC file acceptance, invite delivery notice) |
| Production build | pass | pass — admin + Firebase in separate lazy chunks; mock API absent from bundle |

Responsive checks (dev mock data, Microsoft Edge headless): public pages at 320, 360, 390, 430, 768, 1024 and 1440 px; public and admin pages at 390 and 1440 px in light and dark themes; logins as each role. No horizontal overflow and no runtime errors were detected.

## 9. Known limitations

- **Live integrations not exercised here.** MongoDB, Firebase and R2 code paths are covered by automated tests using in-memory fakes, and the UI was checked against the dev mock API — but no real Atlas cluster, Firebase project or R2 bucket was connected during development. Test each after configuring them (sign in, upload a photo, submit an enquiry).
- **Logo:** only a photo of the logo was supplied, so the emblem was recreated as SVG (`src/components/brand/Logo.tsx`). Replace with the official vector artwork when available.
- **Hero image** is AI-generated at 1024 px and upscaled; replace it with a high-resolution photo of real stock or the showroom for the sharpest result.
- **Demo listings** (make “Sample”, badged “Demo”) use AI-generated, unbranded photos and must be removed before launch.
- **Invite email** was tested against a local SMTP server and a mocked Firebase endpoint, not a real provider — send yourself a test invite after configuring SMTP.
- The privacy notice and About content are placeholders for the owner to complete; no testimonials, awards, years in business or guarantees were invented.