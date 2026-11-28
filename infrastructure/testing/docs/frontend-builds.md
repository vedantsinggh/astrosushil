# Testing stack: frontend builds (website and admin)

This page covers how the website (`apps/website`, React + Vite) and the admin (`apps/admin`, Next.js) are built for the testing stack. It lists the build arguments, explains same-origin API calls, says when you must rebuild, and lists every hardcoded production URL.

Production builds do not change. If you do not set the testing build arguments, both apps build exactly as before.

## Build arguments

### Website (`apps/website`)

| Variable | Testing value | Production | Meaning |
|---|---|---|---|
| `VITE_API_URL` | `/api/v1` (from `TESTING_WEBSITE_API_URL` in `build.env`) | Dockerfile default `https://backend.astrosushil.com/api/v1` | API base baked into the bundle and into the inline banner prefetch in `index.html`. A relative path means "same origin". |
| `VITE_DEPLOY_ENV` | `testing` | unset or empty | `testing` turns on the testing guards (see below). Any other value, or no value, keeps production behaviour. |
| `VITE_NOINDEX` | `true` | unset | `true` replaces `<meta name="robots" content="index, follow" />` with `noindex, nofollow`. Any other value keeps the original tag. This does not depend on `VITE_DEPLOY_ENV`. |

What `VITE_DEPLOY_ENV=testing` does (`apps/website/vite.config.js`):

1. `vite build` fails when `VITE_API_URL` is missing or empty, with `[testing build] VITE_API_URL is required when VITE_DEPLOY_ENV=testing (use /api/v1).`
2. `vite build` fails when `VITE_API_URL` points at `astrosushil.com` or any `*.astrosushil.com` host. This matters for local builds: Vite reads `apps/website/.env.local` and `.env.production`. One of them could supply a production URL. Docker builds do not see `.env*` files, because `apps/website/.dockerignore` excludes them.
3. The bundle (`src/config/api.js`) does not fall back to `https://api.astrosushil.com/api/v1`. If the URL is missing at runtime, it logs `console.error` and uses same-origin `/api/v1`. Guard 1 makes this branch unreachable in a real build.
4. In the built `index.html`, the dead fallback `"https://api.astrosushil.com/api/v1"` in the inline banner prefetch is rewritten to `"/api/v1"`. The built HTML then holds no production API host.
5. The delayed tracker loader is disabled: Google Ads `AW-18171128274`, GTM `GTM-N37WNFG4`, Microsoft Clarity and the Meta Pixel. This keeps testing traffic out of the client's analytics and ad data. The build fails if the loader line `setTimeout(loadTrackers, delay);` is not found exactly once. So a change to `index.html` cannot silently re-enable the trackers. The `<noscript>` GTM iframe and Meta Pixel image stay. They only fire for visitors with JavaScript disabled.
6. The sitemap plugin is skipped. Without this step, the build would fetch blogs, courses, products and reports from the API to build a sitemap of production URLs.

### Admin (`apps/admin`)

| Variable | Testing value | Production | Meaning |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/` (from `TESTING_ADMIN_API_URL` in `build.env`) | absolute API URL | Resolved by `apps/admin/lib/api-base.ts`. |
| `NEXT_PUBLIC_APP_ENV` (optional) | `testing` | unset | Existing variable. Any value other than `production` shows a warning badge with that name in the admin header (`components/Header.tsx`). The admin Dockerfile does not pass it yet. |

How `apps/admin/lib/api-base.ts` resolves `NEXT_PUBLIC_API_URL`:

| Value | `API_BASE` | Requests go to |
|---|---|---|
| unset or empty | `http://localhost:3000` | local API (development default, unchanged) |
| `/` | `''` | `/api/v1/...` on the admin's own origin (same origin) |
| `https://api.example.com/` | `https://api.example.com` | that host; trailing slashes are removed |

Every admin API call uses this one helper:

- `lib/api-client.ts`: `apiFetch`, the CSRF token fetch (`/api/v1/auth/csrf`) and the refresh call (`/api/v1/auth/refresh`).
- `lib/api/catalogue.ts`: customers CSV export.
- `lib/api/sales.ts`: blob and CSV downloads, report PDF download.
- `lib/api/uploads.ts`: multipart uploads.
- `app/analytics/page.tsx`: the CSV export link opened with `window.open`. Before this change, the link used a bare relative URL and ignored `NEXT_PUBLIC_API_URL`. So it only worked when the API was on the admin origin.

No admin code calls the API from the Next.js server. Every page that calls the API is a client component (`'use client'`). The three server pages (`app/page.tsx`, `app/admin/page.tsx`, `app/admin/login/page.tsx`) only render client components. There is no `middleware.ts`, no route handler and no server action. `next.config.js` has no rewrites and no `images` config. A relative base is therefore safe. If a server-side call is ever added, it needs a server-only absolute URL, such as an `API_INTERNAL_URL` pointing at `http://testing-api:3000`.

## Same origin

The testing proxy serves each frontend and also forwards `/api/` on the same origin to `testing-api:3000`:

- website origin (port 8080 in the proxy): `/` goes to the website and `/api/` goes to the API
- admin origin (port 8081 in the proxy): `/` goes to the admin and `/api/` goes to the API

The browser therefore calls `https://<website host>/api/v1/...` and `https://<admin host>/api/v1/...`. These are first-party requests. They need no CORS preflight to another host, and the auth cookies stay on the page's own host. The API still checks the request `Origin` against `CORS_ORIGIN` before it sets cookies. So each public frontend origin must be listed in `env/api.env`.

## Built at build time and read at runtime

| Item | When it is fixed | Where |
|---|---|---|
| Website API base (`VITE_API_URL`) | build | JS bundle and `index.html` |
| Website testing guards (`VITE_DEPLOY_ENV`) and robots meta (`VITE_NOINDEX`) | build | `vite.config.js` |
| Website canonical, og and JSON-LD URLs (`https://astrosushil.com`) | build (hardcoded in source) | see the inventory below |
| Admin API base (`NEXT_PUBLIC_API_URL`) and env badge (`NEXT_PUBLIC_APP_ENV`) | build (Next inlines `process.env.NEXT_PUBLIC_*`) | client bundle |
| Public hostnames, CORS, cookie origin rules, `PUBLIC_API_URL`, `FRONTEND_URL`, `ADMIN_URL` | runtime | `env/api.env`; restart the API |
| Basic auth, CIDR allowlist, `X-Robots-Tag`, `/robots.txt` | runtime | testing proxy; restart the proxy |
| Razorpay key id | runtime | the API returns it; the website loads `checkout.razorpay.com` |

## When to rebuild

- **The hostname changes** (raw IP, then a temporary domain or tunnel, then the client's domain): no frontend rebuild with same-origin builds (`/api/v1` and `/`). Update `CORS_ORIGIN`, `PUBLIC_API_URL`, `FRONTEND_URL` and `ADMIN_URL` in `env/api.env`, then restart the API.
- **The API base mode changes** (same origin to an absolute API URL, or back): rebuild the website and admin images.
- **`VITE_DEPLOY_ENV`, `VITE_NOINDEX` or `NEXT_PUBLIC_APP_ENV` changes**: rebuild that image.
- **The frontend source changes**: rebuild that image.

## Hardcoded URL inventory (`apps/website`)

Line numbers are for the current working tree.

| File:line | URL | Effect on testing | Action |
|---|---|---|---|
| `src/config/api.js:21` | `https://api.astrosushil.com/api/v1` (fallback when `VITE_API_URL` is unset) | would send testing traffic to the production API | **fixed**: unreachable with `VITE_DEPLOY_ENV=testing`; same-origin fallback and `console.error` |
| `index.html:88` | same fallback in the inline banner prefetch | same | **fixed**: build guard, and rewritten to `/api/v1` in the testing build |
| `vite.config.js` `injectApiPreconnect` | preconnect to the API origin | relative URL: no tag is added (correct) | none |
| `vite.config.js` `fetchDynamicRoutes` / `HOSTNAME` (`https://astrosushil.com`) | sitemap: build-time API fetch and production URLs | sitemap would list production URLs | **fixed**: sitemap skipped in testing builds |
| `index.html:124,143,156,182` | Google Ads, Clarity, GTM, Meta Pixel loaders | pollutes the client's analytics and ad data | **fixed**: loader disabled in testing builds |
| `index.html:75-78` | preconnect to googletagmanager, google-analytics (facebook and clarity are commented out) | harmless connection warm-up | document only |
| `index.html:201,215` | `<noscript>` GTM iframe and Meta Pixel image | fires only without JavaScript | document only |
| `index.html:10` | `<meta name="robots" content="index, follow" />` | SEO | **fixed** with `VITE_NOINDEX=true`; the proxy also sends `X-Robots-Tag` |
| `index.html:66,70` | preconnect to `astro-sushil.s3.ap-southeast-2.amazonaws.com` | harmless | document only |
| `src/components/layout/Footer/Footer.jsx:94`, `src/pages/Home/HeroSection.jsx:118`, `src/pages/Home/Astrologicalsolutions.jsx:179`, `src/pages/auth/Login.jsx:435`, `src/pages/auth/Signup.jsx:683` | static videos in the production S3 bucket (public read) | the testing site reads these public assets (read-only) | document only |
| `src/components/Seo.jsx:6` | `SITE_URL = "https://astrosushil.com"` (canonical, og:url) | canonical points at production; correct for a noindex copy | document only (SEO) |
| `src/components/schema/OrganizationSchema.jsx:6,9,12,14,46`, `src/components/schema/WebsiteSchema.jsx:6,7,10` | schema.org JSON-LD URLs | SEO only | document only |
| `src/components/layout/Footer/Footer.jsx:32` | facebook.com social link | none | document only |
| `public/robots.txt:16` | `Sitemap: https://astrosushil.com/sitemap.xml`, `Allow: /` | the proxy serves its own Disallow-all `/robots.txt` | document only (proxy owner) |
| `public/llms.txt` | production page URLs | informational | document only |
| `src/store/usePaymentStore.js:38`, `src/pages/Consultation/Bookappointment.jsx:76`, `src/pages/Consultation/BookingModal.jsx:30`, `src/pages/Reports/BookingForm.jsx:247` | `https://checkout.razorpay.com/v1/checkout.js` | needed; the key comes from the API (use `rzp_test_` keys) | none |

There is no Google sign-in, no hardcoded Razorpay key, no download host and no auth redirect URL in the website source. Download and image URLs come from the API, which reads the testing database and the testing bucket.

After `VITE_API_URL=/api/v1 VITE_DEPLOY_ENV=testing VITE_NOINDEX=true vite build`, the built files contain no `api.astrosushil.com` or `backend.astrosushil.com`. The only `astrosushil.com` host left is the bare `https://astrosushil.com`. It appears in the SEO strings in the JS bundle (`Seo.jsx`, schema components), in `robots.txt` and in `llms.txt`.

## Production behaviour

- Website without `VITE_DEPLOY_ENV` and `VITE_NOINDEX`: the robots meta, the trackers, the sitemap plugin and the API fallback are the same as before. This was checked with a build using a dummy API URL.
- Admin with an absolute `NEXT_PUBLIC_API_URL`: the URL is used as before, except that trailing slashes are removed. Unset or empty still means `http://localhost:3000`.

## Known issues

- `vite-plugin-sitemap` writes `sitemap.xml` and `robots.txt` into `apps/website/dist/`, not into a custom `--outDir`. This is existing behaviour. A local production build with `--outDir` elsewhere therefore overwrites those two files in the git-ignored `apps/website/dist/`.
- The admin package has no unit test framework. `resolveApiBase` is a pure function and is easy to test once one is added.
