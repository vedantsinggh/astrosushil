import 'package:flutter/material.dart';

/// Centralized Design System Colors and Semantic Tokens for Astro Platform.
///
/// DO NOT invent extra brand colors or use ad-hoc hex values inside widgets.
class AppColors {
  AppColors._();

  // ===========================================================================
  // OFFICIAL BRAND PALETTE (STRICT SOURCE OF TRUTH)
  // ===========================================================================

  /// Main brand color (Dominant) — Primary navigation, main branding, major headers
  static const Color primary = Color(0xFF121440);

  /// Secondary brand color — Supporting UI elements, secondary actions, cards
  static const Color secondary = Color(0xFF61568C);

  /// Tertiary / Dark Surface — Secondary dark surface, dark cards, section surfaces
  static const Color tertiary = Color(0xFF1D2059);

  /// Premium Accent / Gold — High-value accent, paid features, premium CTAs, key highlights
  static const Color premiumAccent = Color(0xFFD9B13B);

  /// Supporting Accent / Burgundy — Secondary highlights, retrograde tags, categories
  static const Color supportingAccent = Color(0xFF824661);

  // ===========================================================================
  // SEMANTIC DERIVED TOKENS (NEUTRALS & UTILITIES)
  // ===========================================================================

  /// Deep background derived systematically from primary #121440
  static const Color background = Color(0xFF0D0E2B);

  /// Surface color for cards, dialogs, and elevated sections (Tertiary #1D2059)
  static const Color surface = Color(0xFF1D2059);

  /// Elevated surface color for floating modals and hover states
  static const Color surfaceElevated = Color(0xFF2E3378);

  /// Primary body & heading text (High contrast Slate 50)
  static const Color textPrimary = Color(0xFFF8FAFC);

  /// Secondary body text & captions (Muted Slate 400)
  static const Color textSecondary = Color(0xFF94A3B8);

  /// Subtle text & placeholder tint (Slate 500)
  static const Color textMuted = Color(0xFF64748B);

  /// Default structural border & divider tint
  static const Color border = Color(0xFF2E3378);

  /// Semantic Success State (Emerald)
  static const Color success = Color(0xFF10B981);

  /// Semantic Warning State (Amber)
  static const Color warning = Color(0xFFF59E0B);

  /// Semantic Error State (Red 500)
  static const Color error = Color(0xFFEF4444);

  /// Inactive / Disabled State
  static const Color disabled = Color(0xFF475569);

  // ===========================================================================
  // LIGHT THEME TOKENS (HOME SCREEN & LIGHT MODE)
  // ===========================================================================

  /// Warm/neutral light background for Home Screen
  static const Color lightBackground = Color(0xFFFAFAFC);

  /// Pure white surface for light cards
  static const Color lightSurface = Color(0xFFFFFFFF);

  /// High contrast primary text on light background (#121440)
  static const Color lightTextPrimary = Color(0xFF121440);

  /// Secondary text on light background (Slate 600)
  static const Color lightTextSecondary = Color(0xFF475569);

  /// Muted text on light background (Slate 400)
  static const Color lightTextMuted = Color(0xFF94A3B8);

  /// Light border tint
  static const Color lightBorder = Color(0xFFE2E8F0);
}

