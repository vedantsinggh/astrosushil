import 'package:flutter/material.dart';
import 'astro_loader_button.dart';
import 'astro_loader_card.dart';
import 'astro_loader_full_screen.dart';
import 'astro_loader_inline.dart';

export 'astro_loader_button.dart';
export 'astro_loader_card.dart';
export 'astro_loader_full_screen.dart';
export 'astro_loader_inline.dart';
export 'solar_system_loader_painter.dart';

/// Pre-defined contextual loader messages across the Astro Sushil app.
abstract class AstroLoaderMessages {
  static const String kundli = 'Aligning your stars...';
  static const String planetaryData = 'Mapping planetary positions...';
  static const String rashiBhavishya = 'Reading cosmic patterns...';
  static const String vastu = 'Preparing your guidance...';
  static const String kundliPdf = 'Preparing your Kundli...';
  static const String generic = 'Preparing your cosmic journey...';
}

enum AstroLoaderVariant {
  fullScreen,
  inline,
  card,
  button,
}

/// Global Astro System Loader component family.
class AstroLoader extends StatelessWidget {
  final String? message;
  final AstroLoaderVariant variant;
  final bool isDark;
  final double? size;
  final bool? reducedMotion;

  const AstroLoader({
    super.key,
    this.message,
    this.variant = AstroLoaderVariant.fullScreen,
    this.isDark = false,
    this.size,
    this.reducedMotion,
  });

  /// Const constructor for full-screen loader layout.
  const AstroLoader.fullScreen({
    super.key,
    this.message,
    this.isDark = false,
    this.reducedMotion,
  })  : variant = AstroLoaderVariant.fullScreen,
        size = null;

  /// Const constructor for inline loader widget.
  const AstroLoader.inline({
    super.key,
    this.message,
    this.size = 24.0,
    this.isDark = false,
    this.reducedMotion,
  }) : variant = AstroLoaderVariant.inline;

  /// Const constructor for card-contained loader layout.
  const AstroLoader.card({
    super.key,
    this.message,
    this.isDark = false,
    this.reducedMotion,
  })  : variant = AstroLoaderVariant.card,
        size = null;

  /// Const constructor for button loading state widget.
  const AstroLoader.button({
    super.key,
    String label = 'Preparing...',
    this.isDark = false,
    this.reducedMotion,
  })  : message = label,
        variant = AstroLoaderVariant.button,
        size = null;

  @override
  Widget build(BuildContext context) {
    switch (variant) {
      case AstroLoaderVariant.fullScreen:
        return AstroLoaderFullScreen(
          message: message,
          isDark: isDark,
          reducedMotion: reducedMotion,
        );
      case AstroLoaderVariant.inline:
        return AstroLoaderInline(
          message: message,
          isDark: isDark,
          size: size ?? 24.0,
          reducedMotion: reducedMotion,
        );
      case AstroLoaderVariant.card:
        return AstroLoaderCard(
          message: message,
          isDark: isDark,
          reducedMotion: reducedMotion,
        );
      case AstroLoaderVariant.button:
        return AstroLoaderButton(
          label: message ?? 'Preparing...',
          isDark: isDark,
          reducedMotion: reducedMotion,
        );
    }
  }
}
