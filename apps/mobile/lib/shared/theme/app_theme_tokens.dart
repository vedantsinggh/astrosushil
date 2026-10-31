import 'package:flutter/material.dart';

/// Centralized Design System Dimensions, Radii, Shadows, and Gradients.
class AppSpacing {
  AppSpacing._();

  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 20.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;
  static const double heroPadding = 22.0;
}

class AppRadii {
  AppRadii._();

  static const double xs = 6.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double modal = 24.0;
  static const double pill = 999.0;

  static final BorderRadius roundedSm = BorderRadius.circular(sm);
  static final BorderRadius roundedMd = BorderRadius.circular(md);
  static final BorderRadius roundedLg = BorderRadius.circular(lg);
  static final BorderRadius roundedXl = BorderRadius.circular(xl);
  static final BorderRadius roundedModal = BorderRadius.circular(modal);
  static final BorderRadius roundedPill = BorderRadius.circular(pill);
}

class AppIconSizes {
  AppIconSizes._();

  static const double xs = 14.0;
  static const double sm = 18.0;
  static const double md = 22.0;
  static const double lg = 28.0;
  static const double xl = 36.0;
}

class AppGradients {
  AppGradients._();

  /// Hero Cosmic Gradient (Midnight Plum -> Deep Royal Indigo -> Midnight Navy)
  static const LinearGradient heroCosmic = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF2A1B3D),
      Color(0xFF1D2059),
      Color(0xFF121440),
    ],
  );

  /// Warm Amber / Saffron Promotional Gradient (for Sushil Sir explainer banner)
  static const LinearGradient promotionalAmber = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF7A3516),
      Color(0xFF9E471D),
      Color(0xFFB45309),
    ],
  );

  /// Restrained Antique Gold Accent Gradient
  static const LinearGradient goldAccent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFE5A93C),
      Color(0xFFD4AF37),
      Color(0xFFC59B27),
    ],
  );

  /// Subtle Warm Parchment Gradient for card depth
  static const LinearGradient subtleParchment = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFFFFFFFF),
      Color(0xFFFBF8F3),
    ],
  );
}

class AppShadows {
  AppShadows._();

  /// Light refined card shadow (prevents harsh borders while adding depth)
  static final List<BoxShadow> cardLight = [
    BoxShadow(
      color: const Color(0xFF121440).withValues(alpha: 0.04),
      blurRadius: 10,
      offset: const Offset(0, 3),
    ),
  ];

  /// Medium card shadow for interactive or floating cards
  static final List<BoxShadow> cardMedium = [
    BoxShadow(
      color: const Color(0xFF121440).withValues(alpha: 0.08),
      blurRadius: 14,
      offset: const Offset(0, 5),
    ),
  ];

  /// Deep shadow for modal sheets and hero cards
  static final List<BoxShadow> heroGlow = [
    BoxShadow(
      color: const Color(0xFF121440).withValues(alpha: 0.18),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];
}

class AppTouchTargets {
  AppTouchTargets._();

  /// Minimum accessible touch target size (48x48 logical pixels)
  static const double minTouchTarget = 48.0;
}
