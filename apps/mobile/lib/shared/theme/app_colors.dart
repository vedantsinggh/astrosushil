import 'package:flutter/material.dart';

/// Centralized Design System Colors and Semantic Tokens for Astro Sushil.
///
/// Follows the Vedic Astrology Design Language:
/// - Deep midnight navy & royal indigo
/// - Warm ivory & parchment canvases
/// - Restrained antique gold & saffron accents
/// - Rich pastel category tints (violet, gold, sky, rose, coral, sage)
/// - Crisp, differentiated surface borders that prevent washed-out white cards
class AppColors {
  AppColors._();

  // ===========================================================================
  // 1. BRAND CORE PALETTE
  // ===========================================================================

  /// Dominant brand color — Midnight Royal Navy (primary headers, major CTAs)
  static const Color primary = Color(0xFF121440);

  /// Secondary brand color — Deep Muted Indigo / Violet
  static const Color secondary = Color(0xFF61568C);

  /// Tertiary brand color — Deep Royal Indigo Surface
  static const Color tertiary = Color(0xFF1D2059);

  /// Cosmic Midnight — Deepest cosmic navy
  static const Color midnight = Color(0xFF0D0E2B);

  /// Vedic Plum — Deep mystic violet for cosmic gradients
  static const Color deepPlum = Color(0xFF2A1B3D);

  /// Indigo Tint Dark — Supporting card surface
  static const Color indigoDark = Color(0xFF171A4A);

  // ===========================================================================
  // 2. GOLD & SAFFRON ACCENTS
  // ===========================================================================

  /// Restrained Antique Gold (Primary premium accent)
  static const Color gold = Color(0xFFD4AF37);
  static const Color premiumAccent = gold;

  /// High-contrast amber gold for readable text on light backgrounds
  static const Color goldDark = Color(0xFFB45309);

  /// Soft luminous gold tint
  static const Color goldLight = Color(0xFFFDF6B2);

  /// Subtle gold border tint
  static const Color goldBorder = Color(0x66D4AF37);

  /// Vedic Saffron — Warm spiritual saffron
  static const Color saffron = Color(0xFFE58A1F);

  /// Deep saffron for active highlights
  static const Color saffronDeep = Color(0xFFC26715);

  /// Light saffron tint for warm card highlights
  static const Color saffronLight = Color(0xFFFEF3C7);

  /// Supporting burgundy accent
  static const Color supportingAccent = Color(0xFF824661);

  // ===========================================================================
  // 3. CANVAS & SURFACE HIERARCHY (PREVENTS WHITE-CARD-ON-CREAM)
  // ===========================================================================

  /// Main canvas background (Warm Ivory / Parchment)
  static const Color canvas = Color(0xFFFAF7F2);
  static const Color lightBackground = canvas;
  static const Color background = Color(0xFF0D0E2B);

  /// Differentiated secondary canvas tone for grouped sections
  static const Color canvasSecondary = Color(0xFFF3EDE2);

  /// Pure White card surface (used with crisp [cardBorder] to ensure strong boundary)
  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color lightSurface = cardSurface;

  /// Warm Ivory card surface for subtle layered depth
  static const Color cardSurfaceWarm = Color(0xFFFBF8F3);
  static const Color parchmentSurface = cardSurfaceWarm;

  /// Parchment card surface for secondary data containers
  static const Color cardSurfaceParchment = Color(0xFFF5EFE6);

  /// Dark card surface for royal indigo feature cards
  static const Color cardSurfaceDark = Color(0xFF1D2059);
  static const Color surface = cardSurfaceDark;
  static const Color surfaceElevated = Color(0xFF2E3378);

  /// Primary card border — Crisp, refined 1dp border with high contrast against parchment
  static const Color cardBorder = Color(0xFFE2DDD5);
  static const Color lightBorder = cardBorder;
  static const Color border = Color(0xFF2E3378);

  /// Subtle card border for inner dividers
  static const Color cardBorderSubtle = Color(0xFFEDE8E0);

  /// Dark card border for indigo/navy surfaces
  static const Color cardBorderDark = Color(0xFF2E3378);

  // ===========================================================================
  // 4. HARMONIOUS CATEGORY TINTS (INSPIRED BY REFERENCE MOCKUP)
  // ===========================================================================

  // Violet / Lavender (Birth Chart / Kundli)
  static const Color tintVioletBg = Color(0xFFF5F0FF);
  static const Color tintVioletText = Color(0xFF6B46C1);
  static const Color tintVioletBorder = Color(0xFFE9D5FF);
  static const Color tintLavender = tintVioletBg;

  // Amber / Gold (Dashas / Premium Predictions)
  static const Color tintAmberBg = Color(0xFFFFFBEB);
  static const Color tintAmberText = Color(0xFFD97706);
  static const Color tintAmberBorder = Color(0xFFFDE68A);
  static const Color tintAmber = tintAmberBg;

  // Sky / Celestial Blue (Transits / Gochara)
  static const Color tintSkyBg = Color(0xFFF0F9FF);
  static const Color tintSkyText = Color(0xFF0284C7);
  static const Color tintSkyBorder = Color(0xFFBAE6FD);
  static const Color tintSky = tintSkyBg;

  // Rose / Blush Pink (Match Making / Relationships)
  static const Color tintRoseBg = Color(0xFFFFF1F2);
  static const Color tintRoseText = Color(0xFFE11D48);
  static const Color tintRoseBorder = Color(0xFFFECDD3);
  static const Color tintRose = tintRoseBg;

  // Coral / Terracotta (Panchanga / Sun & Calendar)
  static const Color tintCoralBg = Color(0xFFFFF7ED);
  static const Color tintCoralText = Color(0xFFEA580C);
  static const Color tintCoralBorder = Color(0xFFFED7AA);

  // Peach / Warm Sand (Personalized Reports / Consultations)
  static const Color tintPeachBg = Color(0xFFFFF7ED);
  static const Color tintPeachText = Color(0xFFC2410C);
  static const Color tintPeachBorder = Color(0xFFFED7AA);
  static const Color tintPeach = tintPeachBg;

  // Sage / Mint (Shop / Consecrated Remedies / Auspicious Times)
  static const Color tintSageBg = Color(0xFFF0FDF4);
  static const Color tintSageText = Color(0xFF059669);
  static const Color tintSageBorder = Color(0xFFA7F3D0);
  static const Color tintSage = tintSageBg;

  // ===========================================================================
  // 5. TEXT HIERARCHY TOKENS
  // ===========================================================================

  /// High-contrast primary text on light background (Midnight Navy #121440)
  static const Color textPrimary = Color(0xFF121440);
  static const Color lightTextPrimary = textPrimary;

  /// Secondary body text on light background (Slate 600)
  static const Color textSecondary = Color(0xFF475569);
  static const Color lightTextSecondary = textSecondary;

  /// Muted text on light background (Slate 400)
  static const Color textMuted = Color(0xFF8C95A6);
  static const Color lightTextMuted = textMuted;

  /// High-contrast primary text on dark background (White)
  static const Color textInversePrimary = Color(0xFFFFFFFF);

  /// Secondary text on dark background (Slate 200)
  static const Color textInverseSecondary = Color(0xFFE2E8F0);

  /// Muted text on dark background (Slate 400)
  static const Color textInverseMuted = Color(0xFF94A3B8);

  // ===========================================================================
  // 6. SEMANTIC SYSTEM STATES
  // ===========================================================================

  /// Semantic Success State (Emerald)
  static const Color success = Color(0xFF10B981);
  static const Color successBg = Color(0xFFECFDF5);
  static const Color successBorder = Color(0xFFA7F3D0);

  /// Semantic Warning State (Amber)
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color warningBorder = Color(0xFFFDE68A);

  /// Semantic Error / Destructive State (Crimson 500)
  static const Color error = Color(0xFFEF4444);
  static const Color destructive = error;
  static const Color errorBg = Color(0xFFFEF2F2);
  static const Color errorBorder = Color(0xFFFECACA);

  /// Inactive / Disabled State
  static const Color disabled = Color(0xFF94A3B8);
  static const Color disabledSurface = Color(0xFFF1F5F9);

  // ===========================================================================
  // 7. SEMANTIC ALIASES & COMPATIBILITY TOKENS
  // ===========================================================================

  /// Midnight Navy alias for primary headers
  static const Color midnightNavy = primary;

  /// Deep Indigo alias for mystical surfaces & secondary badges
  static const Color deepIndigo = secondary;

  /// Restrained Antique Gold alias
  static const Color accentGold = gold;

  /// Muted celestial lavender for subtext on dark surfaces
  static const Color lavenderMuted = Color(0xFFB8A9D9);

  /// High-contrast primary dark text on light backgrounds
  static const Color textDark = textPrimary;

  /// Text primary on dark backgrounds alias
  static const Color textPrimaryDark = textPrimary;

  /// Secondary text dark alias
  static const Color textSecondaryDark = textSecondary;

  /// Muted text dark alias
  static const Color textMutedDark = textMuted;

  /// Gold card border alias
  static const Color cardBorderGold = goldBorder;

  /// Muted parchment surface alias
  static const Color parchmentMuted = cardSurfaceParchment;

  /// Warm canvas / cream background alias
  static const Color backgroundCream = canvas;

  /// Midnight background alias
  static const Color backgroundMidnight = midnight;

  /// Warm ambient drop shadow for elevated parchment cards
  static const Color cardShadowWarm = Color(0x0C121440);
}
