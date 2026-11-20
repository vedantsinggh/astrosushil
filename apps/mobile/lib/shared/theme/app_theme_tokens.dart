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

  /// Hero gradient: midnight navy -> royal indigo. One per screen at most
  /// (hero card or the `hero` nav bar style).
  static const LinearGradient heroNavy = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF121440),
      Color(0xFF232766),
      Color(0xFF3A3388),
    ],
  );

  /// Thin gold accent line (fades out at both ends). Used under hero bars
  /// and as the short brand underline beneath large titles.
  static const LinearGradient goldLine = LinearGradient(
    colors: [
      Color(0x00D4AF37),
      Color(0xFFD4AF37),
      Color(0xFFE9C766),
      Color(0x00D4AF37),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
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

  /// iOS minimum hit target (44pt). Never go below this.
  static const double ios = 44.0;
}

/// iOS-first layout metrics shared by the design system components.
class AstroMetrics {
  AstroMetrics._();

  /// Horizontal page gutter (iOS uses 16 on phones, 20 on larger phones).
  static const double gutter = 16.0;

  /// Height of the compact nav bar row (without the status bar).
  static const double navBarHeight = 52.0;

  /// Card corner radius.
  static const double cardRadius = 20.0;

  /// Inset-grouped section corner radius (iOS Settings look).
  static const double groupRadius = 16.0;

  /// Button corner radius.
  static const double buttonRadius = 14.0;

  /// Primary button height.
  static const double buttonHeight = 54.0;

  /// Rounded icon square in list rows.
  static const double iconSquare = 34.0;

  /// Max readable content width on tablets / landscape.
  static const double maxContentWidth = 680.0;
}

/// Soft, layered shadows for the iOS-first components.
class AstroShadows {
  AstroShadows._();

  /// Very soft two-layer card shadow (a crisp contact shadow + a wide
  /// ambient one). Pair with no border, or a hairline at most.
  static const List<BoxShadow> card = [
    BoxShadow(color: Color(0x08121440), blurRadius: 2, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x0A121440), blurRadius: 14, offset: Offset(0, 3)),
  ];

  /// Lifted shadow for the gradient hero card.
  static const List<BoxShadow> hero = [
    BoxShadow(color: Color(0x14121440), blurRadius: 3, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x1A121440), blurRadius: 20, offset: Offset(0, 6)),
  ];

  /// Shadow under the gold primary button.
  static const List<BoxShadow> goldButton = [
    BoxShadow(color: Color(0x24B8922A), blurRadius: 10, offset: Offset(0, 3)),
  ];
}
