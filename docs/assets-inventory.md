# Asset Inventory — Astro Sushil Mobile Application

**Last Updated:** August 18, 2026  
**Directory:** `apps/mobile/assets/images/`  
**pubspec.yaml registration:** `flutter: assets: - assets/images/` (covers entire directory)

---

## System State & Reliability Assets

| Asset | File Exists | Valid PNG | Registered | AppAssets Constant | Rendered By | Status |
|---|---|---|---|---|---|---|
| `state_offline.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateOffline` | `_AstroStateVectorPainter` (no Image.asset attempt) | **Stub — PNG pending regen** |
| `state_slow_connection.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateSlowConnection` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |
| `state_server_error.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateServerError` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |
| `state_empty_data.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateEmptyData` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |
| `state_maintenance.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateMaintenance` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |
| `state_session_expired.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateSessionExpired` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |
| `state_no_birth_profile.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.stateNoBirthProfile` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |
| `state_pdf_error.png` | Yes | ❌ 77-byte text stub | Yes | `AppAssets.statePdfError` | `_AstroStateVectorPainter` | **Stub — PNG pending regen** |

> **Note:** `AstroStateIllustration` renders exclusively via `_AstroStateVectorPainter` — it does NOT attempt `Image.asset`. The stubs are placeholders. When real PNGs are generated and placed at these paths, update `AstroStateIllustration.build()` to load `AstroImage` first with the painter as fallback.

---

## Core Celestial & Brand Assets

| Asset | File Exists | Valid | Registered | AppAssets Constant | Used Via | Status |
|---|---|---|---|---|---|---|
| `logo_short.png` | Yes | ✅ 122 KB | Yes | `AppAssets.logoAs` | `AstroImage` (splash) | **VALID** |
| `splash_background.png` | Yes | ✅ 736 KB | Yes | `AppAssets.splashBackground` | `AstroImage` (splash) | **VALID** |
| `subtle_celestial_background.png` | Yes | ✅ 587 KB | Yes | `AppAssets.subtleCelestialBackground` | `AstroImage` (planet detail) | **VALID** |
| `kundli_background.png` | Yes | ✅ 766 KB | Yes | `AppAssets.kundliBackground` | Not currently rendered | **VALID** |
| `kundli_decorative_orbit.png` | Yes | ✅ 720 KB | Yes | `AppAssets.kundliDecorativeOrbit` | Not currently rendered | **VALID** |
| `home_hero.png` | Yes | ✅ 725 KB | Yes | `AppAssets.homeHero` | `AstroImage` (hero card) | **VALID** |
| `zodiac_wheel_overlay.png` | Yes | ✅ 708 KB | Yes | `AppAssets.zodiacWheelOverlay` | `AstroImage` (splash) | **VALID** |
| `constellations_overlay.png` | Yes | ✅ 725 KB | Yes | `AppAssets.constellationsOverlay` | `AstroImage` (splash) | **VALID** |
| `nakshatra_background.png` | Yes | ✅ 903 KB | Yes | `AppAssets.nakshatraBackground` | Not currently rendered | **VALID** |
| `houses_background.png` | Yes | ✅ 949 KB | Yes | `AppAssets.housesBackground` | Not currently rendered | **VALID** |

---

## Onboarding Assets

| Asset | File Exists | Valid | Registered | AppAssets Constant | Used Via | Status |
|---|---|---|---|---|---|---|
| `onboarding_chart.png` | Yes | ✅ 841 KB | Yes | `AppAssets.onboardingChart` | `AstroImage` (onboarding) | **VALID** |
| `onboarding_direction.png` | Yes | ✅ 937 KB | Yes | `AppAssets.onboardingDirection` | `AstroImage` (onboarding) | **VALID** |
| `onboarding_insights.png` | Yes | ✅ 1.08 MB | Yes | `AppAssets.onboardingInsights` | `AstroImage` (onboarding) | **VALID** |

---

## Vastu Assets

| Asset | File Exists | Valid | Registered | AppAssets Constant | Used Via | Status |
|---|---|---|---|---|---|---|
| `vastu_hero.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuHero` | `AstroImage` → celestial fallback | **MISSING — handled by AstroImage** |
| `vastu_entrance.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuEntrance` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `vastu_bedroom.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuBedroom` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `vastu_living_room.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuLivingRoom` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `vastu_kitchen.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuKitchen` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `vastu_study.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuStudy` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `vastu_puja.png` | ❌ Missing | — | Yes (declared) | `AppAssets.vastuPuja` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |

---

## Planet Emblems (9 Planets)

| Asset | File Exists | Valid | Registered | AppAssets Constant | Used Via | Status |
|---|---|---|---|---|---|---|
| `planet_sun.png` | Yes | ✅ 881 KB | Yes | `AppAssets.planetSun` | `AstroImage` (planets/detail screens) | **VALID** |
| `planet_moon.png` | Yes | ✅ 707 KB | Yes | `AppAssets.planetMoon` | `AstroImage` | **VALID** |
| `planet_mars.png` | Yes | ✅ 813 KB | Yes | `AppAssets.planetMars` | `AstroImage` | **VALID** |
| `planet_mercury.png` | Yes | ✅ 737 KB | Yes | `AppAssets.planetMercury` | `AstroImage` | **VALID** |
| `planet_jupiter.png` | Yes | ✅ 752 KB | Yes | `AppAssets.planetJupiter` | `AstroImage` | **VALID** |
| `planet_venus.png` | Yes | ✅ 763 KB | Yes | `AppAssets.planetVenus` | `AstroImage` | **VALID** |
| `planet_saturn.png` | ❌ Missing | — | Yes (declared) | `AppAssets.planetSaturn` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `planet_rahu.png` | ❌ Missing | — | Yes (declared) | `AppAssets.planetRahu` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |
| `planet_ketu.png` | ❌ Missing | — | Yes (declared) | `AppAssets.planetKetu` | `AstroImage` → icon fallback | **MISSING — handled by AstroImage** |

---

## Rashi Assets (12 Signs)

| Status |
|---|
| All 12 rashi PNGs missing. All are routed through `AstroImage` with icon fallback (zodiac symbol text shown). |

---

## Action Items

| Priority | Item |
|---|
| 🔴 High | Regenerate 8 `state_*.png` real PNG images when image quota resets |
| 🟡 Medium | Generate 3 missing planet emblems: `planet_saturn.png`, `planet_rahu.png`, `planet_ketu.png` |
| 🟡 Medium | Generate 12 rashi PNGs and 7 vastu PNGs |
| 🟡 Medium | Upgrade `AstroStateIllustration` to use `AstroImage` once real state PNGs exist |
| 🟢 Done | `AstroImage` widget created with celestial/minimal/icon fallback variants |
| 🟢 Done | All 7 screens updated to use `AstroImage` instead of bare `Image.asset` |
| 🟢 Done | Dev-mode logging: `[AstroImage] ⚠️  Missing or invalid asset: <path>` |
| 🟢 Done | Semantic labels on all image usages |
| 🟢 Done | Widget tests in `test/widget/astro_image_test.dart` |
| 🟢 Done | All `MainAlignment` typos fixed across state widgets |
