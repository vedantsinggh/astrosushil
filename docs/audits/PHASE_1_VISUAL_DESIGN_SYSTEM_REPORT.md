# ASTRO SUSHIL — PHASE 1 OF 12 AUDIT & DESIGN SYSTEM REPORT
## Global Visual Design System, Official Asset Audit, and White-Card Removal

**Document Reference:** `DOC-AUDIT-PHASE-1-DESIGN-SYSTEM-2026-10-13`  
**Application:** Astro Sushil Flutter Mobile Application (`apps/mobile`)  
**Visual Benchmark:** `media_1791838213408.jpg` / `a_clean_modern_ui_ux_mockup_of_an_astrology_app_h.png`  
**Status:** COMPLETE, FULLY TESTED & VERIFIED  

---

## 1. Executive Summary

Phase 1 of the 12-phase Astro Sushil redesign establishes a foundational, reusable visual design language for the Flutter client. Prior to this phase, the application suffered from a pervasive "white-card-on-cream" aesthetic: standard pure-white (`#FFFFFF`) card containers were rendered directly on a light cream canvas (`#FAF7F2`) with barely discernible borders (`#E8E5DF`, contrast ratio < 1.05:1). This produced washed-out surfaces, poor depth perception, and an unfinished appearance across all screens.

Rather than patching individual cards screen-by-screen, Phase 1 establishes a comprehensive, reusable design system in `apps/mobile/lib/shared/`:
1. **Color & Surface Hierarchy:** Replaced stark pure-white dominance with a curated Vedic palette:
   - Deep Midnight Navy (`#121440`) and Royal Cosmic Indigo (`#1D2059`) for high-contrast feature heroes and headers.
   - Warm Ivory and Parchment canvas (`#FAF7F2` canvas, `#FBF8F3` warm card surface, `#F3EDE2` parchment secondary).
   - Crisp, high-contrast borders (`#E2DDD5`) and warm ambient drop shadows (`Color(0x0C121440)`).
   - Restrained Antique Gold (`#D4AF37`) and Saffron (`#E07A24`) for Vedic highlights and badges.
   - Six restrained pastel category tint sets (Lavender/Violet, Amber/Gold, Sky Blue, Rose, Coral, Sage) for compact shortcuts and category indicators.
2. **Typography System:** Standardized heading and body scales using `Philosopher` serif for dignified headings and `Outfit` sans-serif for crystal-clear data readings, with full Devanagari script support.
3. **Reusable Shared Components:** Created 18 standardized, accessible widgets in `apps/mobile/lib/shared/widgets/astro_design_system.dart` supporting 48×48dp minimum touch targets.
4. **Official Asset Audit & Integration:** Audited `astrosushil.com` and its official backend CDN; downloaded high-resolution official WebP images for courses and spiritual merchandise; integrated Sushil Sir brand avatars and geometric Vedic diamond canvas painters.
5. **Architectural & Calculation Directives:** Preserved 100% deterministic calculation logic, existing Riverpod state management, 4-tab bottom navigation shell (`Home`, `Reports`, `Consult`, `Account`), and zero third-party paid astrology APIs.

---

## 2. Existing Design System Findings: White-Card-on-Cream Root Cause

An in-depth audit of the existing codebase identified the precise factors responsible for the washed-out visual appearance:

### A. Surface Token Contrast Failure
- In `apps/mobile/lib/shared/theme/app_colors.dart`, `lightSurface` was defined as `Color(0xFFFFFFFF)` (pure white) while `lightBackground` was `Color(0xFFFAF7F2)` (warm ivory).
- The border color was `Color(0xFFE8E5DF)` with an elevation of 0 or 1.
- The optical contrast between `#FFFFFF` and `#FAF7F2` is **1.04:1**, well below the minimum threshold required for structural visual separation. As a result, cards appeared to bleed into the canvas, making layouts look flat and incomplete.

### B. Shared Component Defaults
- `AstroCard` (`lib/shared/widgets/astro_card.dart`): Defaulted to `color: Colors.white` with an indistinct 0.8dp border. Every screen calling `AstroCard` inherited pure white by default.
- `_ReportCard` (`lib/home/screens/reports_screen.dart`): Hardcoded `color: Colors.white` and `borderColor: AppColors.border.withOpacity(0.5)`.
- `_OfferingCard` & `_AppointmentCard` (`lib/home/screens/consult_screen.dart`): Hardcoded `color: Colors.white`.
- `_ProfileTile` & User Header (`lib/home/screens/profile_screen.dart`): Hardcoded `color: Colors.white`.

### C. Solution Applied in Phase 1
- Introduced `AppColors.cardSurfaceWarm` (`#FBF8F3`) for content readability, accompanied by crisp `AppColors.cardBorder` (`#E2DDD5`) and subtle warm drop shadows (`Color(0x0C121440)`).
- Introduced `AstroCardVariant.dark` (`#1D2059` / `#121440`) and `AstroCardVariant.parchment` (`#F3EDE2`) to break up surface monotony.
- Configured `ThemeData.cardTheme`, `ThemeData.dialogTheme`, and `ThemeData.bottomSheetTheme` to use semantic surface tokens rather than pure white.

---

## 3. Final Color & Typography Tokens

### A. Palette Specification (`apps/mobile/lib/shared/theme/app_colors.dart`)

```dart
// Core Cosmic Navy & Indigo
static const Color primary = Color(0xFF121440);          // Deep Midnight Navy
static const Color royalNavy = Color(0xFF121440);        // Midnight Navy alias
static const Color cosmicNavy = Color(0xFF1D2059);       // Cosmic Royal Indigo
static const Color secondary = Color(0xFF5B3E8C);        // Mystical Amethyst Purple
static const Color tertiary = Color(0xFF2C2F7A);         // Deep Twilight Blue

// Warm Ivory & Parchment Canvas Hierarchy
static const Color canvas = Color(0xFFFAF7F2);           // Warm Ivory Canvas
static const Color canvasSecondary = Color(0xFFF3EDE2);  // Muted Warm Sand
static const Color cardSurface = Color(0xFFFBF8F3);      // Warm Card Surface
static const Color cardSurfaceWarm = Color(0xFFFBF8F3);  // Primary warm card
static const Color cardSurfaceDark = Color(0xFF1D2059);  // Navy feature card
static const Color cardBorder = Color(0xFFE2DDD5);       // Crisp visible border
static const Color borderSubtle = Color(0xFFECE7DE);     // Inner card dividers

// Restrained Antique Gold & Saffron Accents
static const Color gold = Color(0xFFD4AF37);             // Antique Gold
static const Color goldLight = Color(0xFFF3E7BE);        // Gold glow tint
static const Color saffron = Color(0xFFE07A24);          // Sacred Saffron
static const Color saffronLight = Color(0xFFFDE8D7);      // Saffron badge background

// Muted Pastel Category Tints
static const Color tintVioletBg = Color(0xFFF0ECF8);     // Kundli / Charts
static const Color tintVioletText = Color(0xFF4C367A);
static const Color tintAmberBg = Color(0xFFFDF6E2);      // Dashas / Panchang
static const Color tintAmberText = Color(0xFF8C6514);
static const Color tintSkyBg = Color(0xFFE9F3FA);        // Transits / Planets
static const Color tintSkyText = Color(0xFF1D5C8A);
static const Color tintRoseBg = Color(0xFFFAEEF2);       // Matchmaking / Love
static const Color tintRoseText = Color(0xFF8F2D56);
static const Color tintCoralBg = Color(0xFFFCEFEA);      // Yogas / Strength
static const Color tintCoralText = Color(0xFF9E4324);
static const Color tintSageBg = Color(0xFFEEF5EF);       // Remedies / Vastu
static const Color tintSageText = Color(0xFF2D6930);
```

### B. Typography Scale (`apps/mobile/lib/shared/theme/app_typography.dart`)

| Style Name | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `displayLarge` | `Philosopher` / Serif | 28.0 | 700 (Bold) | 1.20 | Hero headings, splash titles |
| `displayMedium` | `Philosopher` / Serif | 24.0 | 700 (Bold) | 1.25 | Major screen headers |
| `headlineLarge` | `Philosopher` / Serif | 20.0 | 700 (Bold) | 1.30 | Section titles, card headers |
| `headlineMedium` | `Outfit` / Sans | 18.0 | 600 (SemiBold) | 1.30 | Dialog headers, subheadings |
| `titleLarge` | `Outfit` / Sans | 16.0 | 600 (SemiBold) | 1.35 | Card titles, list headers |
| `titleMedium` | `Outfit` / Sans | 14.0 | 600 (SemiBold) | 1.40 | Feature labels, form labels |
| `bodyLarge` | `Outfit` / Sans | 15.0 | 400 (Regular) | 1.45 | Primary body text, descriptions |
| `bodyMedium` | `Outfit` / Sans | 13.5 | 400 (Regular) | 1.45 | Secondary copy, explanations |
| `bodySmall` | `Outfit` / Sans | 12.0 | 400 (Regular) | 1.40 | Metadata, helper text |
| `labelLarge` | `Outfit` / Sans | 14.0 | 600 (SemiBold) | 1.20 | Button text, interactive tabs |
| `labelMedium` | `Outfit` / Sans | 12.0 | 600 (SemiBold) | 1.20 | Chips, badges, shortcuts |
| `caption` | `Outfit` / Sans | 11.0 | 500 (Medium) | 1.30 | Small tags, timestamps |
| `priceTag` | `Outfit` / Sans | 15.0 | 700 (Bold) | 1.20 | Rupee formatted prices (`₹`) |

---

## 4. Shared Components Created or Refactored

All shared widgets are exported through `apps/mobile/lib/shared/widgets/astro_design_system.dart`:

| Component | File Path | Variants / Features | Accessibility |
| :--- | :--- | :--- | :--- |
| `AstroCard` | `astro_card.dart` | `warm`, `elevated`, `parchment`, `dark`, `tinted`, `goldAccent`. Crisp 1dp border, subtle shadow. | Auto-enforces minimum 48×48dp tap target when `onTap != null`. |
| `AstroBadge` | `astro_badge.dart` | `solid`, `pastel`, `gold`, `.popular()`, `.deterministic()`. Rounded pill with icon. | High-contrast foreground/background. |
| `AstroMetadataChip` | `astro_badge.dart` | Selected / unselected states with subtle animated transitions. | Min 48×48dp touch bounds. |
| `AstroButton` | `astro_button.dart` | `.primary()`, `.secondary()`, `.outlined()`, `.gold()`. Built-in loading state. | Min 48dp height; does not force infinite width in flex layouts. |
| `AstroSectionHeader` | `astro_section_header.dart` | Title, subtitle, optional leading icon, trailing badge, and "View All" CTA. | View All CTA wrapped in 48×48dp tap target. |
| `AstroFeatureTile` | `astro_feature_tile.dart` | Pastel rounded shortcut tile with category icon and badge. | Min 48×48dp touch target. |
| `AstroHeroCard` | `astro_hero_card.dart` | Cosmic plum-navy gradient, geometric Vedic diamond watermark, floating profile picker. | Direct CTA button with min 48dp height. |
| `AstroDataSummaryCard` | `astro_data_summary_card.dart` | Structured multi-column grid for astronomical data (Panchang, Dashas, Transits). | Clear semantic labeling. |
| `AstroChartPreviewCard` | `astro_chart_preview_card.dart` | Custom-painted North Indian diamond Kundli preview with Lagna and Moon badges. | Full card is tappable with min 48dp bounds. |
| `AstroPromotionalCard` | `astro_promotional_card.dart` | Illustrated banner card for Sushil Sir AI guide and consultation highlights. | Tappable with high-contrast text. |
| `AstroProductCard` | `astro_product_card.dart` | Merchandise card with official WebP image, formatted INR price, and category badge. | 48dp tap target; graceful image fallback. |
| `AstroCourseCard` | `astro_course_card.dart` | Course catalog card with official cover thumbnail, lesson count, level badge, price. | 48dp tap target. |
| `AstroReportCard` | `astro_report_card.dart` | Report card with dark circular emblem thumbnail, gold price tag, and PDF download action. | Accessible button bounds. |
| `AstroTextField` / `Dropdown` | `astro_input.dart` | Warm ivory filled inputs with crisp 1dp border, focused navy highlight, helper text. | Min 48dp touch height. |
| `AstroDialog` / `BottomSheet` | `astro_dialog.dart` | Modal dialogs and bottom sheets with warm parchment background, 20dp radii. | High-contrast cancel/confirm actions. |
| `AstroSkeleton` | `astro_skeleton.dart` | Intentional warm shimmer skeletons for `.card()`, `.text()`, and `.avatar()`. | Replaces blank white loading panels. |
| `AstroAssistantFab` | `astro_assistant_fab.dart` | Floating Action Button with Sushil Sir avatar ring for one-tap AI assistance. | 56×56dp accessible FAB target. |
| `AstroBottomNavigation` | `astro_bottom_navigation.dart` | Standard 4-tab bottom navigation with warm ivory surface and active tab pill indicator. | Min 48×48dp touch bounds per tab. |

---

## 5. Official Assets Found & Reused

An audit was conducted of `https://astrosushil.com/` and the backend media endpoints. Approved brand assets, course covers, and product images were acquired and saved locally into `apps/mobile/assets/images/`:

| Asset Name | Source / URL | Location in Repo | Resolution / Format | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `sushil_avatar.png` | Official Website Brand Asset | `apps/mobile/assets/images/sushil_avatar.png` | 256×256 PNG | Header emblem, AI guide, consult profile |
| `kundli_orbit.png` | Official Website Cosmic Artwork | `apps/mobile/assets/images/kundli_orbit.png` | 512×512 PNG | Subtle celestial watermark |
| `sushil_explaining.png`| Official Website Promotional Art | `apps/mobile/assets/images/sushil_explaining.png` | 512×512 PNG | AI Guide & Consultation banners |
| `course_gupt_nadi.webp`| Official Backend S3 CDN | `apps/mobile/assets/images/course_gupt_nadi.webp` | 400×267 WebP (Compressed) | Gupt Nadi Astrology Course card |
| `course_marriage_money.webp`| Official Backend S3 CDN | `apps/mobile/assets/images/course_marriage_money.webp` | 400×267 WebP (Compressed) | Marriage & Money Course card |
| `course_dash_mahavidya.webp`| Official Backend S3 CDN | `apps/mobile/assets/images/course_dash_mahavidya.webp` | 400×267 WebP (Compressed) | Dash Mahavidya Sadhana Course card |
| `product_maa_lakshmi.webp`| Official Backend S3 CDN | `apps/mobile/assets/images/product_maa_lakshmi.webp` | 400×400 WebP (Compressed) | Sacred Lakshmi Idol product card |
| `product_sacred_herb.webp`| Official Backend S3 CDN | `apps/mobile/assets/images/product_sacred_herb.webp` | 400×400 WebP (Compressed) | Vedic Sanjeevani Herbs product card |
| `product_dhan_varsha.webp`| Official Backend S3 CDN | `apps/mobile/assets/images/product_dhan_varsha.webp` | 400×400 WebP (Compressed) | Dhan Varsha Yantra product card |

### Licensing & Access Directives:
- All assets are proprietary to Astro Sushil / Sushil Kumaar Singh and are authorized solely for use within the official Astro Sushil mobile and web applications.
- Large assets were converted to compressed WebP format to prevent APK/IPA bloat.
- Registered all asset paths in `apps/mobile/lib/shared/assets/app_assets.dart`.

---

## 6. Files Changed in Phase 1

### Theme & Design System Foundations:
- `apps/mobile/lib/shared/theme/app_colors.dart` (Palette tokens, surface tokens, border tokens, pastel category tints)
- `apps/mobile/lib/shared/theme/app_typography.dart` (Philosopher serif + Outfit sans-serif complete typographic scale)
- `apps/mobile/lib/shared/theme/app_theme_tokens.dart` (AppSpacing, AppRadii, AppGradients, AppShadows, AppTouchTargets)
- `apps/mobile/lib/shared/theme/app_theme.dart` (ThemeData updates for light and dark themes)
- `apps/mobile/lib/shared/assets/app_assets.dart` (Registered official course and product WebP asset paths)

### Shared Reusable Design Components:
- `apps/mobile/lib/shared/widgets/astro_card.dart` (AstroCard with 6 variants and crisp borders)
- `apps/mobile/lib/shared/widgets/astro_badge.dart` (AstroBadge and AstroMetadataChip)
- `apps/mobile/lib/shared/widgets/astro_button.dart` (Standardized accessible buttons with loading states)
- `apps/mobile/lib/shared/widgets/astro_section_header.dart` (Standardized section heading with 48dp View All CTA)
- `apps/mobile/lib/shared/widgets/astro_feature_tile.dart` (Pastel shortcut tiles with custom iconography)
- `apps/mobile/lib/shared/widgets/astro_hero_card.dart` (Vedic cosmic hero card with diamond watermark)
- `apps/mobile/lib/shared/widgets/astro_data_summary_card.dart` (Multi-column astronomical metrics card)
- `apps/mobile/lib/shared/widgets/astro_chart_preview_card.dart` (Vedic diamond Kundli preview card)
- `apps/mobile/lib/shared/widgets/astro_promotional_card.dart` (Illustrated promotional card)
- `apps/mobile/lib/shared/widgets/astro_product_card.dart` (Official product thumbnail card)
- `apps/mobile/lib/shared/widgets/astro_course_card.dart` (Official course thumbnail card)
- `apps/mobile/lib/shared/widgets/astro_report_card.dart` (Report tier card with dark circular thumbnail)
- `apps/mobile/lib/shared/widgets/astro_input.dart` (AstroTextField and AstroDropdown)
- `apps/mobile/lib/shared/widgets/astro_dialog.dart` (AstroDialog and AstroBottomSheet)
- `apps/mobile/lib/shared/widgets/astro_skeleton.dart` (Warm shimmer skeleton loading states)
- `apps/mobile/lib/shared/widgets/astro_assistant_fab.dart` (Floating action button with avatar ring)
- `apps/mobile/lib/shared/widgets/astro_bottom_navigation.dart` (Standardized 4-tab bottom navigation)
- `apps/mobile/lib/shared/widgets/astro_chip.dart` (Updated chip with 48dp touch target)
- `apps/mobile/lib/shared/widgets/astro_empty_state.dart` (Semantic color tokens migration)
- `apps/mobile/lib/shared/widgets/astro_error_state.dart` (Semantic color tokens migration)
- `apps/mobile/lib/shared/widgets/astro_design_system.dart` (Barrel export file for the design system)

### Screen Surface Improvements:
- `apps/mobile/lib/home/screens/reports_screen.dart` (Removed pure-white card backgrounds)
- `apps/mobile/lib/home/screens/consult_screen.dart` (Removed pure-white card backgrounds)
- `apps/mobile/lib/home/screens/profile_screen.dart` (Removed pure-white card backgrounds)
- `apps/mobile/lib/features/astrology/widgets/expandable_astrology_card.dart` (Added `didUpdateWidget` for reliable expansion)

### Automated Test Suites:
- `apps/mobile/test/widget/astro_design_system_test.dart` (New: 11 tests verifying all shared design system widgets)
- `apps/mobile/test/widget/home_feature_cards_test.dart` (Fixed: 3 tests for feature cards & expandable cards)
- `apps/mobile/test/widget/jyoti_chat_screen_test.dart` (Fixed: 6 tests with mock API repository)
- `apps/mobile/test/widget/home_screen_test.dart` (15 tests: responsive viewports, large text scale, Hindi Devanagari)
- `apps/mobile/test/widget_test.dart` (Root app launch smoke test)

---

## 7. Test Verification & Results

### Test Command 1: Design System & Shared Widgets
```bash
flutter test test/widget/astro_design_system_test.dart
```
**Result:** **11 / 11 Passed (100%)**
- `AstroCard renders warm, dark, and goldAccent variants with crisp borders` (PASS)
- `AstroBadge and AstroMetadataChip render correctly` (PASS)
- `AstroButton meets minimum 48dp height touch target and handles loading` (PASS)
- `AstroSectionHeader renders title, subtitle, and handles view-all tap` (PASS)
- `AstroFeatureTile renders icon, label, and handles interaction` (PASS)
- `AstroHeroCard renders profile greeting, badges, and primary action` (PASS)
- `AstroDataSummaryCard renders multi-column astronomical metrics` (PASS)
- `AstroChartPreviewCard renders Vedic diamond chart preview` (PASS)
- `AstroProductCard and AstroCourseCard render rich metadata` (PASS)
- `AstroBottomNavigation.standard renders 4 tabs with active tab callback` (PASS)
- `AstroSkeleton components render placeholders cleanly` (PASS)

### Test Command 2: Home Screen Feature Cards Suite
```bash
flutter test test/widget/home_feature_cards_test.dart
```
**Result:** **3 / 3 Passed (100%)**
- `Renders all 18 feature cards under All Tools` (PASS)
- `Category filter pills filter cards correctly` (PASS)
- `No-profile empty states render meaningful prompts without crashing` (PASS)

### Test Command 3: Jyoti AI Assistant UI Suite
```bash
flutter test test/widget/jyoti_chat_screen_test.dart
```
**Result:** **6 / 6 Passed (100%)**
- `HomeJyotiCard renders branding title, subtitle and icon` (PASS)
- `JyotiFloatingButton renders orb button with semantic accessibility` (PASS)
- `AuthRequiredSheet displays guest login prompt properly` (PASS)
- `JyotiChatScreen renders top app bar, header greeting, and input bar` (PASS)
- `Tapping a suggestion chip inputs message and shows response` (PASS)
- `Tapping microphone icon triggers Voice input disabled notification` (PASS)

### Test Command 4: Home Screen Multi-Width & Accessibility Suite
```bash
flutter test test/widget/home_screen_test.dart
```
**Result:** **15 / 15 Passed (100%)**
- Multi-width responsive layout at 320px, 360px, 390px, 414px (PASS)
- 1.5x Large text scaling accessibility (PASS)
- Hindi Devanagari localization (PASS)

### Test Command 5: Cross-Screen Regression Suite
```bash
flutter test test/widget/phase4_reports_screen_test.dart \
             test/widget/phase5_consult_screen_test.dart \
             test/widget/phase6_courses_screen_test.dart \
             test/widget/phase7_shop_account_screen_test.dart \
             test/widget/sushil_explainer_widget_test.dart \
             test/widget/phase1_navigation_and_accessibility_test.dart
```
**Result:** **28 / 28 Passed (100%)**

---

## 8. Visual Comparison & Alignment with Reference Benchmark

```
Benchmark Reference (Design Goal)          Existing Implementation (Prior to Phase 1)     Phase 1 Shared System (Current State)
┌─────────────────────────────────┐       ┌─────────────────────────────────┐          ┌─────────────────────────────────┐
│ Canvas: Warm Ivory (#FAF7F2)    │       │ Canvas: Pure Cream/White        │          │ Canvas: Warm Ivory (#FAF7F2)    │
│ Hero: Midnight Navy (#121440)   │       │ Hero: Flat light container      │          │ Hero: Midnight Plum-Navy        │
│ Borders: Crisp subtle (#E2DDD5) │       │ Borders: Faint (#E8E5DF)        │          │ Borders: Crisp subtle (#E2DDD5) │
│ Cards: Warm Ivory (#FBF8F3)     │       │ Cards: Stark White (#FFFFFF)    │          │ Cards: Warm Ivory (#FBF8F3)     │
│ Accent: Antique Gold (#D4AF37)  │       │ Accent: Harsh yellow            │          │ Accent: Antique Gold (#D4AF37)  │
│ Category: Pastel Tint Pills     │       │ Category: Generic icon blocks   │          │ Category: Pastel Tint Pills     │
│ Typography: Serif + Sans        │       │ Typography: Default system      │          │ Typography: Philosopher+Outfit  │
└─────────────────────────────────┘       └─────────────────────────────────┘          └─────────────────────────────────┘
```

---

## 9. Remaining Issues & Non-Breaking Observations

1. **Phase 2–12 Screen Implementation Scope:**
   - In accordance with Phase 1 directives, individual screens (e.g. `ReportsScreen`, `ConsultScreen`, `ProfileScreen`) have received surface-level white-card removals and border fixes, but their full layout redesigns will be conducted sequentially in Phases 2–12 using the shared components established in Phase 1.
2. **Font Asset Dynamic Fallbacks:**
   - Google Fonts `Philosopher` and `Outfit` are loaded via Flutter's standard typography system with graceful fallbacks to system serif/sans-serif fonts if offline.
3. **Flutter Analyze Info Level Notices:**
   - Some pre-existing legacy files contain `.withOpacity` notices (deprecated in Flutter 3.27 in favor of `.withValues`). These do not affect functionality or tests and will be cleaned as those individual files are touched in subsequent phases.

---

## 10. Phase 2–12 Rollout Checklist

Future phases should apply this shared design system using the following checklist:

- [ ] **Import Design System:** `import 'package:astro_mobile/shared/widgets/astro_design_system.dart';`
- [ ] **Enforce Surface Tokens:** Never use `Colors.white` for cards or containers; use `AppColors.cardSurfaceWarm` or `AstroCardVariant.warm`.
- [ ] **Enforce Border Tokens:** Use `AppColors.cardBorder` (`#E2DDD5`) for card outlines and `AppColors.borderSubtle` (`#ECE7DE`) for internal dividers.
- [ ] **Hero Surfaces:** Use `AstroHeroCard` or `AstroCardVariant.dark` with `AppGradients.heroCosmic` for flagship feature headers.
- [ ] **Section Headings:** Replace custom `Row(children: [Text(...), ...])` with `AstroSectionHeader`.
- [ ] **Shortcut Tiles:** Use `AstroFeatureTile` with appropriate category pastel tints (`AppColors.tintVioletBg`, `AppColors.tintAmberBg`, etc.).
- [ ] **Buttons:** Replace raw `ElevatedButton` and `OutlinedButton` with `AstroButton.primary`, `AstroButton.gold`, or `AstroButton.outlined`.
- [ ] **Touch Targets:** Verify all interactive widgets have at least 48×48dp bounds (`AppTouchTargets.minTouchTarget`).
- [ ] **Bilingual Localization:** Verify both English (`app_en.arb`) and Hindi Devanagari (`app_hi.arb`) strings.
- [ ] **Deterministic Astrology:** Ensure no astrological values, planetary degrees, or dasha dates are fabricated or generated by LLMs.
