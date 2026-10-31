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

  /// Title Large (16sp) — Prominent card headers, item titles
  static const TextStyle titleLarge = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 16,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.1,
    height: 1.35,
    color: AppColors.textPrimary,
  );

  /// Title Medium (15sp) — Standard card titles, list item headers
  static const TextStyle titleMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.35,
    color: AppColors.textPrimary,
  );

  /// Title Small (14sp) — Feature shortcut labels, compact item titles
  static const TextStyle titleSmall = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: AppColors.textPrimary,
  );

  // ===========================================================================
  // BODY (OUTFIT / SANS-SERIF)
  // ===========================================================================

  /// Body Large (15sp) — Primary explanatory paragraphs
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.45,
    color: AppColors.textSecondary,
  );

  /// Body Medium (13sp) — Standard descriptive text under card titles
  static const TextStyle bodyMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: AppColors.textSecondary,
  );

  /// Body Small (12sp) — Secondary metadata, timestamps, notes
  static const TextStyle bodySmall = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.35,
    color: AppColors.textMuted,
  );

  // ===========================================================================
  // LABELS & BADGES (OUTFIT / SANS-SERIF)
  // ===========================================================================

  /// Label Large (14sp) — CTA Button text
  static const TextStyle labelLarge = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: AppColors.textPrimary,
  );

  /// Label Medium (12sp) — Filter pills, interactive chips
  static const TextStyle labelMedium = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    color: AppColors.textPrimary,
  );

  /// Label Small (10sp) — Eyebrow badges, uppercase section tags ("YOUR ASTRO REPORTS")
  static const TextStyle labelSmall = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 10,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.1,
    color: AppColors.textMuted,
  );

  /// Caption (11sp) — Footnotes, micro-labels
  static const TextStyle caption = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.textMuted,
  );

  /// Price Tag (15sp Bold Gold / Saffron) — Formatted price displays ("₹299")
  static const TextStyle priceTag = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: AppColors.textInverseSecondary,
  );

  static const TextStyle inverseGoldTag = TextStyle(
    fontFamily: bodyFamily,
    fontFamilyFallback: bodyFontFamilies,
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.2,
    color: AppColors.gold,
  );
}
