# Astro Sushil Mobile: UI Audit Report

Date: 2026-11-18. Scope: `apps/mobile` (Flutter). This was a read-only audit. No app code was changed.
All paths below are relative to `apps/mobile/` unless they are absolute.

- **Harness:** `apps/mobile/test/ui_audit/` (`audit_harness.dart`, `audit_fixtures.dart`, `a_core_screens_audit_test.dart`, `b_astrology_screens_audit_test.dart`, `c_commerce_screens_audit_test.dart`).
- **Outputs:** `/tmp/claude-1000/-home-pilot-Projects-astrosushil/d6ba5a31-03f4-4048-99fe-7b4ab097b4c9/scratchpad/ui-audit/`
  - `shots/`: 837 PNG screenshots
  - `json/`: text boxes and colours for each screenshot
  - `logs/results.jsonl`: 1,643 runs
  - `logs/analysis2.txt`: aggregated overflows, tap targets and contrast
  - `split/`: full-length pages
  - `sheets/`: contact sheets
- **Re-run:** `cd apps/mobile && flutter test test/ui_audit/ -j 3` (about 2.5 min). Then run `python3 -I <scratchpad>/ui-audit/analyze.py`.

Severity scale:
- **P1:** visible on a normal phone (≥360 dp, text scale 1.0), or text that cannot be read.
- **P2:** appears on a small phone (320 dp), at 1.3× text, in Hindi, with long data, or in landscape. Also covers clear contrast or tap-target failures.
- **P3:** appears only at 2.0× text, cosmetic issues, latent problems, or code-only suspicions.

Contrast ratios are WCAG values computed from the hex colours in the theme.

## Summary
- **Counts:** P1 = 8, P2 = 17, P3 = 12 (37 findings).
- **Overflows:** 316 RenderFlex overflow events at 55 distinct code locations. Every location is listed in `logs/analysis2.txt` and summarised in the table in section 2.

## 1. Findings

| ID | Sev | Screen | Where it occurs | Description | Evidence | file:line | Suggested fix |
|---|---|---|---|---|---|---|---|
| F01 | P1 | Every screen with the "Let Sushil Sir explain" banner (Dasha, Planets, Yogas, KP, Jaimini, Shadbala, Vastu, Rashi, Matchmaking, Product detail, Consult, …) | All devices, light | The banner text is nearly invisible. The title is `textPrimary` #121440 and the subtitle is `textSecondary` at α 0.9, both drawn on an indigo gradient (#2E3378→#1D2059). Measured contrast is 1.0–1.8:1. | `shots/vimshottari_dasha__p390_x1.0_light_en.png`, `shots/product_detail__p390_x1.0_light_en.png` | `lib/features/sushil_explainer/widgets/sushil_explainer_button.dart:198` (title), `:230` (subtitle) | Use `AppColors.textInversePrimary` for the title and `textInverseSecondary` or `lavenderMuted` for the subtitle. |
| F02 | P1 | Compact explainer chips ("Explain teaching methodology", "Explain syllabus", "Explain lesson", Dasha compact) | All devices | Same problem in the compact variant: navy text on a navy gradient, about 1.0–1.15:1. | `split/courses_hub__tall390_x1.0_light_en.png` | `sushil_explainer_button.dart:100` (gradient `:55`) | Use `Colors.white` for the text. |
| F03 | P1 | Shop catalog | All devices | Unselected category chips render solid white with white label text (#E6FFFFFF on #FFFFFF, 1.0:1). "Kits & Bundles", "Sacred Art" and "Wallpapers" cannot be seen. The selected chip shows an oversized white checkmark. | `sheets/shop_chips.png`, `shots/shop_catalog__p390_x1.0_light_en.png` | `lib/features/shop/screens/shop_catalog_screen.dart:152-170` | In Material 3, `backgroundColor` does not take effect here. Set `color: WidgetStateProperty.resolveWith(...)` (white α0.12 / gold) and `showCheckmark: false`, or set `checkmarkColor: AppColors.primary`. |
| F04 | P1 | Astrology hub, "Planetary & House Strength" and "Advanced" summary pills | 390 dp: 11 px over; 360: 26 px; 320: 46 px; 412: 0.2 px | RenderFlex overflow with visible yellow/black stripes. The text in "Shadbala • 6 Strengths" and "Ashtakavarga • SAV/BAV" has no Flexible wrapper. | `split/astrology_hub__tall390_x1.0_light_en.png` | `lib/features/astrology/screens/astrology_hub_screen.dart:390`, `:407`, `:471`, `:488` | Wrap each `Text` in `Expanded` and add `overflow: TextOverflow.ellipsis` with `maxLines: 1`. |
| F05 | P1 | Report generation (analyzing state) | 320×568 (164 px), landscape 640×360, every phone at 1.3× | A non-scrolling `Column` overflows the bottom. The status card is cut off by stripes. | `sheets/s2.png` (4th), `shots/report_gen_analyzing__xs320_x1.0_light_en.png` | `lib/features/reports/screens/report_generation_screen.dart:128` | Wrap the body in `SingleChildScrollView` or `LayoutBuilder` + `ConstrainedBox(minHeight)`. |
| F06 | P1 | Reports catalog, Kundli card | All devices | The tagline "YOUR COSMIC BLUEPRINT…" and the "₹299" price badge use `premiumAccent` gold #D4AF37 on white or gold-tint. Contrast is 2.1:1 and 1.8:1 for 10–11 px text. | `split/reports_catalog__tall390_x1.0_light_en.png` | `lib/home/screens/reports_screen.dart:1102` | For text on light backgrounds, use `AppColors.goldDark` (#B45309, 5.0:1). |
| F07 | P1 | Rashi Bhavishya | All devices | The date pill is a hard-coded string: "18 August 2026, Monday" (today is 18 Nov 2026). The fallback is also hard-coded. Stale content is visible to every user. | `split/rashi_bhavishya__tall390_x1.0_light_en.png` | `lib/features/astrology/screens/rashi_bhavishya_screen.dart:217`, `:397` | Format the date from the API `date` field (`intl` DateFormat). |
| F08 | P1 | Cart | 320 dp (10 px; 45 px with long data), Hindi 360 | The quantity row pushes the delete button off the card. The red delete icon is clipped and stripes appear. | `shots/cart_items__xs320_x1.0_light_en.png` | `lib/features/shop/screens/cart_screen.dart:381` | Put the price in `Flexible`/`FittedBox`, or move the delete button to the title row. |
| F09 | P2 | Cart | All devices | The quantity −/+ buttons are 32×32 dp, below the 48 dp minimum. | results.jsonl smallTargets | `cart_screen.dart:443-444` | Use a 48×48 hit area (padding or `SizedBox` around a 32 px visual). |
| F10 | P2 | Every astrology screen with the profile selector | All devices | The "Switch" profile button has a 76×28 dp tap target. Its label is hard-coded in English (it is not localised in Hindi). | results.jsonl | `lib/features/astrology/widgets/active_birth_profile_selector.dart:249-263` | Use `ConstrainedBox(minHeight: 48)`; use `l10n.switchProfile`. |
| F11 | P2 | Vimshottari Dasha, Jaimini, KP, Varshaphala | All devices | Inconsistent padding: the profile selector card runs edge to edge (x = 0). On Shadbala, Yogas and other screens it is inset by 16 dp. | `sheets/selectors.png` | `vimshottari_dasha_screen.dart:90`, `jaimini_screen.dart:90`, `kp_astrology_screen.dart:89`, `varshaphala_screen.dart:101` | Wrap the selector in the same `Padding(EdgeInsets.fromLTRB(16, …))` used in `shadbala_screen.dart:68`. |
| F12 | P2 | Home hero, "My Birth Profile" card | All devices | The "Birth Chart" CTA button is not right-aligned. A `Flexible` (loose) next to an `Expanded` gets half the free space, which leaves about 45 dp of empty space to the right of the button. The left padding is 8 dp, so the card looks off-centre. | `split/home__tall390_x1.0_light_en.png` | `lib/home/widgets/hero_astrology_card.dart:331` | Remove `Flexible`, or use `Flexible(fit: FlexFit.loose)` with the name `Expanded(flex: 2)`. |
| F13 | P2 | Planet detail | 320 at 1.0, 360 at 1.3, 390 at 2.0 (up to 178 px) | The segmented tabs (Overview / Placement / Meaning) overflow. Info rows at `:233`, `:267` and `:318` overflow at larger text scales. | `sheets/s2.png` (1st) | `lib/features/astrology/screens/planet_detail_screen.dart:131` | Use a horizontal `SingleChildScrollView` or `Wrap` for the chips, and `Expanded` for row labels. |
| F14 | P2 | Vastu detail | 320 at 1.0, 360 at 1.3 (99–173 px) | "Avoid / Forbidden" direction tiles and the header rows overflow. | `sheets/s2.png` (2nd) | `lib/features/astrology/screens/vastu_detail_screen.dart:256` (also `:58`, `:167`, `:193`, `:221`) | Use `Flexible` with ellipsis on the label `Text`. |
| F15 | P2 | Order detail | 360 at 1.3, 320 at 1.3 | The "Tracking ID" row overflows (copy icon clipped). The header and item rows overflow at 2.0×. | `sheets/s2.png` (3rd) | `lib/features/shop/screens/order_detail_screen.dart:162` (also `:115`, `:151`, `:389`) | Wrap the tracking text in `Expanded`. |
| F16 | P2 | Order confirmation | 320 at 1.3, every phone at 2.0 (up to 140 px) | The order-ID row overflows because the long ID is not wrapped. | `shots/order_confirmation__s360_x2.0_light_en.png` | `lib/features/shop/screens/order_confirmation_screen.dart:242` | Add `Expanded` + `SelectableText`, or ellipsis. |
| F17 | P2 | Rashi Bhavishya | 320 at 1.0 (13 px); long colour at 390 (55 px); Hindi 360 (85 px) | The Lucky Number / Lucky Color row overflows. Category and header rows overflow at 2.0×. | `shots/rashi_bhavishya__xs320_x1.0_light_en.png` | `rashi_bhavishya_screen.dart:299` (also `:126`, `:211`, `:261`, `:359`) | Use `Expanded` children with ellipsis, or a `Wrap`. |
| F18 | P2 | Courses hub | All devices | The trust pills ("Rule-Based …", "Detailed Lec…", "Lifetime Acc…") are truncated even at 390 dp, so users cannot read them. | `split/courses_hub__tall390_x1.0_light_en.png` | `lib/features/courses/screens/courses_hub_screen.dart:494-516` (`_FeaturePill` `:538`) | Use a `Wrap`, or allow `maxLines: 2` with a shorter copy. |
| F19 | P2 | Jyoti chat input | All devices | Double border: the `TextField` inside the rounded pill still shows the theme's filled outlined box. `border: InputBorder.none` does not override `enabledBorder`/`focusedBorder` or `filled`. | `sheets/s1.png` (2nd) | `lib/features/jyoti/widgets/jyoti_input.dart:97-105` | Add `enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false`. The same pattern exists at `shop_catalog_screen.dart:133` (suspected). |
| F20 | P2 | Consult | All devices | The "Inquire via WhatsApp" button has white text on #25D366, which is 1.98:1. | `split/consult__tall390_x1.0_light_en.png` | `lib/home/screens/consult_screen.dart:531` | Use #128C7E or #075E54 as the background, or dark text. |
| F21 | P2 | Courses hub ("Continue Learning"), Product detail ("Stock remaining"), Settings ("Device Permission: Granted") | All devices | `AppColors.success` #10B981 is used as text or as a background behind white text: 2.4–2.5:1. | split courses_hub, product_detail, app_settings | `courses_hub_screen.dart:850`, `product_detail_screen.dart:383`, `app_settings_screen.dart` (permission row) | Add a `successDark` token (#047857, 5.5:1) for text and for buttons with white text. |
| F22 | P2 | Global theme tokens | All devices | Low-contrast tokens are used as text across the app: `textMuted` #8C95A6 on canvas is 2.8:1 (60 uses, e.g. section labels such as "AVAILABLE REPORTS" at `reports_screen.dart:1090`, the "Delete Account" link, Jyoti hint); `gold` text on light is 2.0:1 (166 uses); `warning` #F59E0B is 2.1:1; `tintAmberText` on its own background is 3.1:1. | `logs/analysis2.txt` contrast section | `lib/shared/theme/app_colors.dart:41`, `:160`, `:182` | Darken `textMuted` to about #6B7280 (4.8:1). Use `goldDark` for gold text on light surfaces. |
| F23 | P2 | Career report PDF | Any device | Opening the screen throws "Tried to modify a provider while the widget tree was building" (debug red screen, assertion in Riverpod). `_loadPdf()` mutates `CareerReportNotifier` state synchronously from `initState`. | run1.log, `logs/analysis2.txt` exceptions | `lib/features/reports/screens/career_report_pdf_screen.dart:33` → `career_report_provider.dart:276` | Call `WidgetsBinding.instance.addPostFrameCallback((_) => _loadPdf())` or `Future.microtask`. |
| F24 | P2 | Several screens in landscape phone (640×360) | Landscape | Fixed `Column`s overflow the bottom. Affected: the loader card (`astro_loader_card.dart:40`, 34–111 px, on Ashtakavarga, Divisional, Jaimini, KP, Varshaphala), the error state (`astro_error_state.dart:27`, 60 px), Yogas (`yogas_screen.dart:144`), Jaimini (`jaimini_screen.dart:88`), Register success (`register_success_screen.dart:21`). | results.jsonl, `shots/*land640*` | as listed | Make the state widgets scrollable, or scale illustrations with `LayoutBuilder`. |
| F25 | P2 | Verification and Reset password | 320 dp (4 px) | The OTP box / requirement row overflows by 4 px on the smallest phone. | results.jsonl | `lib/features/auth/screens/verification_screen.dart:364`, `reset_password_screen.dart:170` | Reduce the fixed box width or gap, or use `Expanded` boxes. |
| F26 | P3 | Home, 2.0× text | 360 at 2.0 | The header title truncates to "Ast…"/"Vedic g…". Bottom-nav labels truncate ("Rep…", "Con…", "Acc…"). The Ask Jyoti FAB covers the profile card. The hero `_HighlightBadge` overflows by 3.6 px at 320 @2.0. | `shots/home__s360_x2.0_light_en.png` (`sheets/s3.png`) | `lib/home/widgets/home_bottom_navigation.dart:132`, `hero_astrology_card.dart:436` | Cap label scale (`MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3)`) on the nav. Add `Flexible` to the badge value. |
| F27 | P3 | Home, small screens | 360×640 | The extended "Ask Jyoti" FAB covers the Essential Astrology tile labels, and the home list has no bottom padding for it. | `shots/home__s360_x1.0_light_hi.png` | `lib/home/screens/home_screen.dart:68` | Add about 80 dp bottom padding to the home scroll content, or collapse the FAB on scroll. |
| F28 | P3 | All filter/segment chips (Consult, Divisional varga chips, Reports history filters, Order history, Shop) | All devices | Chip tap targets are 34–35 dp tall. Course player "1.0x" is 40×25. Settings "Check" is 47×25. The create-profile "View verified coordinates" link is 26 dp tall. | results.jsonl smallTargets (221 targets < 48 dp at 390 dp) | e.g. `course_player_screen.dart:581`, `app_settings_screen.dart:296`, `create_birth_profile_screen.dart` (coordinates toggle) | Use a min height of 48 (`materialTapTargetSize: padded` or a `ConstrainedBox`). |
| F29 | P3 | Product detail | All devices | The hero image uses `BoxFit.contain` in a fixed 320 dp box, which leaves an empty cream band of about 50 dp under the image. | `shots/product_detail__p390_x1.0_light_en.png` | `lib/features/shop/screens/product_detail_screen.dart:95`, `:106` | Use `AspectRatio` matching the image, or `BoxFit.cover`. |
| F30 | P3 | Notifications | All devices | The row chevrons use `lightBorder` #E2DDD5 on #FBF8F3 (1.28:1), so they are effectively invisible. | `sheets/s1.png` (1st) | `lib/features/notifications/widgets/notification_card.dart:199` | Use `textMuted` or a darker colour. |
| F31 | P3 | Birth profiles (long name) | All devices | A 58-character name truncates to "Shrimati An…" because the ACTIVE badge shares one line. | `shots/birth_profiles_long__xs320_x1.0_light_en.png` | `lib/features/birth_profile/widgets/birth_profile_card.dart` (title row, suspected) | Allow `maxLines: 2`, or move the badge below the name. |
| F32 | P3 | Settings switches | All devices | `activeColor: AppColors.primary` makes the ON state a navy thumb on a dim navy track. It reads as disabled and is weakly differentiated from OFF. | `split/app_settings__tall390_x1.0_light_en.png` | `lib/features/settings/screens/app_settings_screen.dart:319`, `:333`, `:347`, `:361` | Use `activeTrackColor: primary`, `activeThumbColor: Colors.white` (or gold). |
| F33 | P3 | Consult, prices | All devices | Prices show without grouping ("₹100000", "₹35000"), while Report detail shows "₹2,99,999". | consult split | `lib/home/screens/consult_screen.dart` (price text) | Use the shared Indian `NumberFormat`. |
| F34 | P3 | Dark theme (latent; the app forces `ThemeMode.light` at `lib/app/app.dart:22`) | p390 dark | `darkTheme` uses `primary` #121440 on scaffold #0D0E2B (1.08:1). TextButtons, progress bars and default ElevatedButtons are invisible. Screens hard-code light colours, so the dark theme is only partly applied (e.g. the unselected Hindi radio is invisible). | `shots/*__p390_x1.0_dark_en.png`, `sheets/s3.png` | `lib/shared/theme/app_theme.dart:28-35` | Do not enable dark mode until it has a dedicated palette (primary → gold or indigo-light). |
| F35 | P3 | Fonts (production) | All devices | Typography declares 'Philosopher' and 'Outfit', but `pubspec.yaml` has no `fonts:` section and no `google_fonts` package. Devices fall back to Roboto / system serif, so the designed typefaces never render. | static | `lib/shared/theme/app_typography.dart:12-16`, `pubspec.yaml` | Bundle the fonts (both are OFL) or remove them from the token. |
| F36 | P3 | Many screens at 2.0× text | 320/360 at 2.0 | 30+ further overflow locations appear only at 2.0×, including Birth chart `:932`, Report detail `:902`, Jyoti message `:55`, Login `:593`, Checkout `:390`/`:482`, Downloads `:327`, Addresses `:278`, KP `:87`, Special points `:171`, Matchmaking `:640`, Panchanga `:455`, Course detail `:646`, Career gen `:100`/`:188`, Reports empty `:1436`. | `logs/analysis2.txt` | see list | Use `Flexible`/`Expanded` + ellipsis in `Row`s, and scrollable `Column`s. |
| F37 | P3 | Horizontal chip rows (Astrology hub, Notifications, Legal, Courses, Yogas, Jaimini, KP, Special points) | All devices | Chips are cut at the screen edge ("Timing & I…"). They scroll, so this is acceptable, but there is no fade or affordance and the end padding is missing. | `shots/astrology_hub__p390_x1.0_light_en.png` | various | Add a trailing `SizedBox(width: 16)` and an edge fade. |

## 2. RenderFlex overflow locations at text scale 1.0 on standard phones

| Location | 390 dp | 360 / 375 | 320 | Landscape |
|---|---|---|---|---|
| `astrology_hub_screen.dart:390`, `:407` | yes (0.2 / 11 px) | yes | yes | – |
| `cart_screen.dart:381` | – | Hindi, long data | yes | – |
| `rashi_bhavishya_screen.dart:299` | long data | Hindi | yes | – |
| `report_generation_screen.dart:128` | – | – | yes | yes |
| `astro_loader_card.dart:40`, `astro_error_state.dart:27`, `yogas_screen.dart:144`, `jaimini_screen.dart:88`, `register_success_screen.dart:21` | – | – | – | yes |
| `planet_detail_screen.dart:131`, `vastu_detail_screen.dart:256`, `verification_screen.dart:364`, `reset_password_screen.dart:170` | – | – | yes | – |

The full list with every config is in `logs/analysis2.txt` (section OVERFLOWS).

## 3. Coverage

**Screens pumped: 93 cases.** These cover 62 distinct screens plus state variants (long data, empty, no profile, guest, error/loading).

- **Core and account:** Home (normal, long, no profile, guest), Account tab, Settings, Notifications, Help, Legal, Maintenance, Not-found, Network-error, Jyoti chat, Onboarding, Login, Register, Register success, Verification (phone and long email), Forgot and Reset password, Birth profiles (list, long, empty), Create/Edit profile, Profile detail.
- **Astrology:** Hub, Birth chart (3 tabs, long, no profile), Planets, Houses, Nakshatras, Divisional, Dasha, Ashtakavarga, Shadbala, Bhava Bala, Yogas, Jaimini, KP, Special points, Gochara, Varshaphala, Prashna, Matchmaking, Panchanga, Rashi Bhavishya, Vastu, Vastu detail, Planet detail, plus no-profile variants.
- **Commerce, reports and courses:** Reports catalog/history (normal, long, empty, no profile), Report detail, Report generation (analyzing, failed), PDF viewer, Report view, Career overview/generation/PDF, Consult, Courses hub/My learning, Course detail, Course player, Shop catalog, Product detail (normal, long), Cart (empty, items, long), Checkout, Order history, Order detail, Order confirmation, Downloads, Shipping addresses.

**Device and setting matrix.** Primary screens ran the full matrix of 23 configs; variants ran a 7-config lite matrix.
- **Sizes:** 320×568, 360×640, 375×667, 390×844, 412×915, 430×932, landscape 640×360, 600×960, 800×1280, 1024×1366, 1366×1024.
- **DPR:** 2 / 2.625 / 3.
- **Text scale:** 1.0, 1.3 and 2.0 (on 320, 360 and 390).
- **Theme:** light on everything; dark at 390.
- **Locale:** Hindi at 360 (×1.0 and ×1.3) and at 320 ×2.0.
- **Full-length pages:** 390×2600 and 320×2600 @1.3.
- **Totals:** 1,643 runs and 837 screenshots.

**Checks run on every config:**
- overflow exceptions, with file:line from widget-creation tracking
- uncaught exceptions
- tap targets < 48 dp
- ellipsised text
- text outside the viewport
- screenshot-sampled WCAG contrast for each text run, comparing the declared colour with the sampled background ring

**Not tested, or limited:**
- **Real device rendering and fonts:** Roboto / Noto Serif / Noto Devanagari were loaded to mimic Android fallback. Emoji and the Material default font in Hindi render as tofu in tests (artifacts; not reported). Material elevation shadows render as hard dark rings in the test renderer (ignored).
- **Images:** some `Image.asset` loads do not finish in fake-async time, so blank image placeholders were not reported.
- **Safe-area / notch insets:** view padding was 0 in tests. Splash and Login have no `SafeArea` in their own files (suspected; not verified).
- **Bottom sheets and dialogs:** Booking flow sheet, Razorpay sheet, auth-required sheet, explainer sheet, and the location autocomplete dropdown were not opened.
- **PDF screens:** `ReportPdfViewer` and `CareerReportPdf` need the `printing` platform channel (MissingPluginException in tests), so only the chrome is covered.
- **Splash:** not covered (navigation timers). Tablet-specific layouts were only checked for overflow (no tablet layout exists; content stretches full width on 1024–1366, see the `t1366l` shots).
- **Dark mode:** not reachable in production (`themeMode: ThemeMode.light`), so its issues are rated latent P3.
