import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Centralized Typography System for Astro Sushil Flutter Mobile Application.
///
/// Headings: 'Philosopher' (Vedic classical serif dignity with system serif fallback)
/// Body/UI: 'Outfit' (Contemporary geometric legibility with system sans-serif fallback)
/// Fully compatible with English and Hindi Devanagari script.
class AppTypography {
  AppTypography._();

  static const List<String> headingFontFamilies = ['Philosopher', 'Georgia', 'serif'];
  static const List<String> bodyFontFamilies = ['Outfit', 'Roboto', 'sans-serif'];

  static const String headingFamily = 'Philosopher';
  static const String bodyFamily = 'Outfit';

  // ===========================================================================
  // HEADINGS (PHILOSOPHER / SERIF)
  // ===========================================================================

  /// Display Large (28sp) — Major hero titles ("Namaste 🙏", "Your Astrology Reports")
  static const TextStyle displayLarge = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
    height: 1.25,
    color: AppColors.textPrimary,
  );

  /// Display Medium (24sp) — Section banners and modal titles
  static const TextStyle displayMedium = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.3,
    color: AppColors.textPrimary,
  );

  /// Headline Large (20sp) — Card titles, primary screen headers
  static const TextStyle headlineLarge = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.2,
    height: 1.35,
    color: AppColors.textPrimary,
  );

  /// Headline Medium (18sp) — Sub-headers, prominent report titles
  static const TextStyle headlineMedium = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 18,
    fontWeight: FontWeight.w700,
    height: 1.35,
    color: AppColors.textPrimary,
  );

  // ===========================================================================
  // TITLES (OUTFIT / SANS-SERIF)
  // ===========================================================================

  /// Title Large (17sp) — Prominent card headers, item titles
  static const TextStyle titleLarge = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 17,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.1,
    height: 1.35,
    color: AppColors.textPrimary,
  );

  /// Title Medium (16sp) — Standard card titles, list item headers
  static const TextStyle titleMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.35,
    color: AppColors.textPrimary,
  );

  /// Title Small (15sp) — Feature shortcut labels, compact item titles
  static const TextStyle titleSmall = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: AppColors.textPrimary,
  );

  // ===========================================================================
  // BODY (OUTFIT / SANS-SERIF)
  // ===========================================================================

  /// Body Large (16sp) — Primary explanatory paragraphs
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: AppColors.textSecondary,
  );

  /// Body Medium (15sp) — Standard descriptive text under card titles
  static const TextStyle bodyMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: AppColors.textSecondary,
  );

  /// Body Small (14sp) — Secondary metadata, timestamps, notes
  static const TextStyle bodySmall = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.35,
    color: AppColors.textMuted,
  );

  // ===========================================================================
  // LABELS & BADGES (OUTFIT / SANS-SERIF)
  // ===========================================================================

  /// Label Large (16sp) — CTA Button text
  static const TextStyle labelLarge = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: AppColors.textPrimary,
  );

  /// Label Medium (14sp) — Filter pills, interactive chips
  static const TextStyle labelMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    color: AppColors.textPrimary,
  );

  /// Label Small (13sp) — Eyebrow badges and small tags (sentence case, no ALL-CAPS)
  static const TextStyle labelSmall = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 13,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.2,
    color: AppColors.textMuted,
  );

  /// Caption (13sp) — Footnotes, micro-labels
  static const TextStyle caption = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.textMuted,
  );

  /// Price Tag (17sp Bold Gold / Saffron) — Formatted price displays ("₹299")
  static const TextStyle priceTag = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 17,
    fontWeight: FontWeight.w700,
    color: AppColors.goldDark,
  );

  // ===========================================================================
  // INVERSE / DARK SURFACE VARIANTS
  // ===========================================================================

  static const TextStyle inverseDisplayLarge = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
    height: 1.25,
    color: AppColors.textInversePrimary,
  );

  static const TextStyle inverseHeadlineLarge = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.2,
    height: 1.35,
    color: AppColors.textInversePrimary,
  );

  static const TextStyle inverseBodyMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: AppColors.textInverseSecondary,
  );

  static const TextStyle inverseGoldTag = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 13,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.3,
    color: AppColors.gold,
  );

  // ===========================================================================
  // iOS-FIRST ROLES (shared nav bar, grouped lists, buttons)
  // ===========================================================================

  /// iOS large title (34sp serif, tight tracking). Used by the shared nav bar.
  static const TextStyle largeTitle = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 34,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.7,
    height: 1.12,
    color: AppColors.textPrimary,
  );

  /// Compact, centred nav bar title (18sp serif).
  static const TextStyle navTitle = TextStyle(
    fontFamily: headingFamily,
    fontFamilyFallback: headingFontFamilies,
    fontSize: 18,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.2,
    height: 1.2,
    color: AppColors.textPrimary,
  );

  /// Nav bar back label and text actions (17sp, iOS bar button size).
  static const TextStyle navAction = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 17,
    fontWeight: FontWeight.w500,
    height: 1.2,
    color: AppColors.accent,
  );

  /// Grouped-section header above an inset list (sentence case, 15sp).
  static const TextStyle sectionHeader = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: AppColors.textSecondary,
  );

  /// List row title (17sp, iOS body).
  static const TextStyle rowTitle = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 17,
    fontWeight: FontWeight.w500,
    height: 1.3,
    color: AppColors.textPrimary,
  );

  /// List row subtitle / secondary line (15sp).
  static const TextStyle rowSubtitle = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.35,
    color: AppColors.textSecondary,
  );

  /// Button label (17sp semibold).
  static const TextStyle button = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 17,
    fontWeight: FontWeight.w700,
    height: 1.25,
    color: AppColors.primary,
  );
}
