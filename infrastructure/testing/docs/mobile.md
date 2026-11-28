# Flutter mobile app against the testing API

## How the app picks its API

`apps/mobile/lib/core/config/app_config.dart` resolves the base URL in this order:

1. `AppConfig.setBaseUrl(...)` (tests only)
2. `--dart-define=API_BASE_URL=...` (or `TEST_API_URL`)
3. `USE_ADB_REVERSE`, `USE_EMULATOR`, `API_HOST` (local development)
4. **release build → `https://backend.astrosushil.com/api/v1` (production)**
5. local development defaults

Step 4 means a release build made without `API_BASE_URL` silently talks to
production. Testing builds therefore also pass `--dart-define=DEPLOYMENT_ENV=testing`.
With that define the app throws at start-up when `API_BASE_URL` is missing,
unparsable or a production host (`backend.astrosushil.com`, `api.astrosushil.com`,
`astrosushil.com`, `www.astrosushil.com`). Builds without `DEPLOYMENT_ENV` behave
exactly as before (unit test `test/unit/network/app_config_test.dart`, case 6).

## Which URL to use

| Access mode | API_BASE_URL | Works? |
|---|---|---|
| Client domain (Mode B) | `https://api-test.CLIENT_DOMAIN/api/v1` | Yes |
| Temporary domain you control | `https://api-test.NAME.duckdns.org/api/v1` | Yes |
| Cloudflare quick tunnel | none | No. The tunnels expose only the website and admin origins, and both are behind basic auth. |
| Raw IP (Mode A) | `http://VPS_IP:18082/api/v1` | No. Port 18082 is bound to `127.0.0.1` on the VPS, and release Android builds refuse cleartext HTTP. |

Use the **API-only origin** (`api-test.*`, testing proxy port 8082). The website and
admin origins are protected by HTTP basic auth, which the app cannot send.

The app authenticates with Bearer tokens (not cookies), so `CORS_ORIGIN` does not
apply to it. Report PDFs are fetched with `GET /api/v1/reports/:id/download-file`
through the same API origin.

## Build

Run on your local machine (Flutter installed), from the repository root:

```bash
infrastructure/testing/scripts/build-mobile-testing.sh \
  --api-url https://api-test.CLIENT_DOMAIN/api/v1
# Optional Google sign-in for the testing API:
#   --define GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

The script refuses production hosts and non-https URLs. The APK, with a
`.sha256` file next to it, is written to `dist/testing-mobile/`.

The equivalent manual command:

```bash
cd apps/mobile
flutter build apk --release \
  --dart-define=DEPLOYMENT_ENV=testing \
  --dart-define=API_BASE_URL=https://api-test.CLIENT_DOMAIN/api/v1
```

## Caveats

- **Same application id.** The testing APK uses `com.astrosushil.app`, the same id as
  production. Installing it on a phone that has the production app replaces that app
  (if it is signed with the same key) or fails to install (if the key differs). Use
  dedicated test devices. A separate id would need an Android flavor/`applicationIdSuffix`,
  which is not added here.
- **Firebase.** Push works only when `apps/mobile/android/app/google-services.json`
  exists. With the production Firebase file, a testing build registers tokens in the
  production Firebase project. Use a separate testing Firebase project
  (`google-services.json` + the API's `FIREBASE_*` testing credentials), or leave push
  disabled. Push sending in testing is also gated by the recipient allowlist
  (see `integrations.md`).
- **Login.** Phone OTP needs SMS/WhatsApp delivery to the tester's own number, and
  that number must be on the API's messaging allowlist. The dev master OTP is
  disabled because testing runs `NODE_ENV=production`.
- **Google sign-in.** It needs the build's `GOOGLE_SERVER_CLIENT_ID` to be listed in the
  testing API's `GOOGLE_OAUTH_CLIENT_IDS`.

## Verify on a device

1. Install the APK and open the app. If the app crashes immediately with a
   `DEPLOYMENT_ENV=testing requires ...` error, the build is missing its URL.
2. On the VPS, follow the API log while you use the app:
   `testing_compose logs -f testing-api` (see `operations.md`). Requests must appear there.
3. Log in with an allowlisted test number, open an existing report, and download its PDF.
4. Generating a new report calls Gemini, which is paid. Do it only when you intend to.
