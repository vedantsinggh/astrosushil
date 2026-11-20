# Android release guide (Astro Sushil)

| Item | Value |
|---|---|
| Application ID / namespace | `com.astrosushil.app` |
| App label | Astro Sushil |
| minSdk / targetSdk / compileSdk | 24 / 36 / 36 (Play requires targetSdk >= 35) |
| Version | from `version:` in `pubspec.yaml` (`0.1.0+1` -> versionName `0.1.0`, versionCode `1`) |
| Release shrinking | R8 minify + resource shrinking, rules in `android/app/proguard-rules.pro` |
| Toolchain | Flutter 3.47.5, AGP 8.11.1, Kotlin 2.2.20, Gradle 8.14 |

Bump `version:` in `pubspec.yaml` before every Play upload. The number after `+` is the
versionCode and must increase with every upload.

## 0. Moving from the old package ID

Older dev builds used `com.example.astro_mobile`. The new ID installs as a **separate app**,
so remove the old one from each test device:

```bash
adb uninstall com.example.astro_mobile
```

To clear data of the new app: `adb shell pm clear com.astrosushil.app`.

## 1. Create the upload keystore (once, keep it secret)

```bash
keytool -genkeypair -v \
  -keystore ~/astrosushil-upload-keystore.jks \
  -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Keep the `.jks` file **outside the repo** and back it up together with its passwords (a password
manager or similar). If it is lost, you have to ask Google Play support to reset the upload key.

Then create `apps/mobile/android/key.properties` (gitignored, never commit it):

```properties
storePassword=<keystore password>
keyPassword=<key password>
keyAlias=upload
storeFile=/home/<you>/astrosushil-upload-keystore.jks
```

`storeFile` is resolved relative to `android/app/`, so an absolute path is the simplest choice.

If `key.properties` is missing, release builds are signed with the **debug key**. Gradle
prints `WARNING: android/key.properties not found...`, but `flutter build` hides Gradle warnings
unless you pass `-v`. Those builds run locally but **Play will reject them**, so always run the
`keytool -printcert` check in section 3 before uploading.

## 2. Google sign-in on Android

The app uses `google_sign_in` 7.x with `serverClientId`. The ID token is issued for the
**Web** client, and the backend checks it against `GOOGLE_OAUTH_CLIENT_IDS`. Android only
needs an **Android OAuth client**, which registers the package name and signing certificate.
No `google-services.json` is needed, because the app does not use Firebase or FCM.

In Google Cloud Console (same project as the Web client), go to **APIs & Services -> Credentials**:

1. **OAuth consent screen**: set the app name, support email, privacy policy URL, and authorised
   domains. Publish it to "In production" before public release.
2. **Web client** (create one if it doesn't exist): *Create credentials -> OAuth client ID -> Web
   application*. Copy its client ID (`xxxx.apps.googleusercontent.com`).
3. **Android client(s)**: *Create credentials -> OAuth client ID -> Android*, package name
   `com.astrosushil.app`, plus a SHA-1. Create **one Android client per SHA-1**:
   - **Debug** (each developer machine):
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - **Upload key** (the keystore from step 1):
     ```bash
     keytool -list -v -keystore ~/astrosushil-upload-keystore.jks -alias upload
     ```
   - **Play App Signing key**: after the first upload, go to Play Console -> *Test and release ->
     App integrity -> App signing* and copy the "App signing key certificate" SHA-1. Builds
     installed from Play are re-signed with this key, so without this client Google sign-in
     fails for Play users.
4. Use the **Web** client ID, not an Android one:
   - in the app: `--dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com`
   - in the API env: `GOOGLE_OAUTH_CLIENT_IDS=<web-client-id>.apps.googleusercontent.com` (the API
     accepts a comma-separated list if you later add an iOS client ID).

Typical failure: `GoogleSignInException ... canceled` or `[16] Account reauth failed`
right after account selection usually means the SHA-1 or package of the installed build has no
matching Android client. Changes in Google Cloud can take a few minutes to apply.

## 3. Build commands

Run them from `apps/mobile/`.

```bash
# Debug run on a connected device or emulator (cleartext HTTP allowed to local dev hosts only)
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com

# Release APK (sideload / internal testing)
flutter build apk --release \
  --dart-define=API_BASE_URL=https://<api-host>/api/v1 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com

# Release App Bundle (what Play Console needs)
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://<api-host>/api/v1 \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

`API_BASE_URL` includes the `/api/v1` prefix (see `lib/core/config/app_config.dart`). Release builds
must use **https**, because cleartext HTTP is blocked outside debug builds.

Outputs:

| Build | Path |
|---|---|
| Debug APK | `build/app/outputs/flutter-apk/app-debug.apk` |
| Release APK | `build/app/outputs/flutter-apk/app-release.apk` |
| Release AAB | `build/app/outputs/bundle/release/app-release.aab` |

Verify signing and package:

```bash
keytool -printcert -jarfile build/app/outputs/bundle/release/app-release.aab   # must show the upload key, not "Android Debug"
$ANDROID_HOME/build-tools/36.0.0/aapt2 dump badging build/app/outputs/flutter-apk/app-release.apk | head -1
```

## 4. Play Console checklist

- [ ] Create the app (default language, name "Astro Sushil", app or game, free or paid).
- [ ] **App signing**: enrol in Play App Signing (the default) and upload the first AAB signed with
      the upload key. Then add the Play app-signing SHA-1 to Google Cloud (section 2.3).
- [ ] **Privacy policy URL**: a public https URL. The in-app legal screens
      (`lib/features/legal/`) are not enough on their own, so host the same text on the website.
- [ ] **App access**: give reviewers a test login (OTP or Google), because most features need sign-in.
- [ ] **Data safety form**: declare personal info (name, email, phone), birth date, time and place
      (birth profile), purchase history (Razorpay; card data is handled by Razorpay), app
      interactions, and user-generated chat content (Jyoti). State encryption in transit and
      the in-app account deletion flow, and provide a web URL for account deletion requests
      (Play requirement).
- [ ] **Content rating** questionnaire (IARC).
- [ ] **Target audience** (18+ is recommended for paid astrology services) and **Ads** declaration (none).
- [ ] **Financial features / payments**: Razorpay is for physical goods and services. Check whether
      digital content (reports, courses) falls under Google Play Billing policy before release.
- [ ] Store listing: short and full description, 512x512 icon, 1024x500 feature graphic, and phone
      screenshots.
- [ ] **Testing track**: upload to *Internal testing* first. New personal developer accounts must
      run a *Closed test* (12+ testers for 14 days) before production access.
- [ ] Release to production with staged rollout.

## 5. Known gaps

- The launcher icon is still the **default Flutter icon** (`android/app/src/main/res/mipmap-*`),
  and no `flutter_launcher_icons` config exists. Brand artwork exists
  (`assets/images/logo_short.png`), but a proper adaptive icon (foreground and background) still
  needs to be produced before submission.
- Flutter 3.47 warns that support for AGP 8.11 / Kotlin 2.2.20 / Gradle 8.14 will soon be
  dropped (it wants AGP 9.0.1+, Kotlin 2.3.20+, Gradle 9.1+). Builds work today. The AGP 9
  migration (`android.builtInKotlin` / `android.newDsl` in `gradle.properties`) is a separate task.
- Razorpay's checkout SDK merges extra permissions into the release manifest (`NFC`,
  `USE_BIOMETRIC`, `USE_FINGERPRINT`, `READ_BASIC_PHONE_STATE`, `ACCESS_NETWORK_STATE`). Keep
  this in mind for the Data safety form.
- No push notifications (no FCM, no `POST_NOTIFICATIONS` permission, no `google-services.json`).
