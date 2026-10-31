import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';

/// Surface variant for [AstroCard] establishing deliberate visual hierarchy.
enum AstroCardVariant {
  /// Pure white surface with crisp defined border (for primary readable content)
  elevated,

  /// Warm ivory surface for layered contrast on cream canvas
  warm,

  /// Parchment surface for secondary data summaries
  parchment,

  /// Deep royal indigo surface for premium / cosmic features
  dark,

  /// Soft pastel tinted surface (e.g. feature categories)
  tinted,

  /// Warm card with antique gold accent rim
  goldAccent,
}

/// Reusable premium card component for Astro Sushil.
///
/// Eliminates washed-out white cards by enforcing crisp borders, intentional
/// surface variants, warm parchment layering, and accessible touch targets.
class AstroCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderRadius;
  final bool hasShadow;
  final AstroCardVariant variant;
  final Gradient? gradient;

  const AstroCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = 16,
    this.hasShadow = true,
    this.variant = AstroCardVariant.elevated,
    this.gradient,
  });

  /// Factory constructor for warm ivory cards (differentiated surface)
  const AstroCard.warm({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.onTap,
    this.borderColor,
    this.borderRadius = 16,
    this.hasShadow = true,
  })  : variant = AstroCardVariant.warm,
        backgroundColor = null,
        gradient = null;

  /// Factory constructor for deep royal indigo cosmic cards
  const AstroCard.dark({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.onTap,
    this.borderColor,
    this.borderRadius = 16,
    this.hasShadow = true,
    this.gradient,
  })  : variant = AstroCardVariant.dark,
        backgroundColor = null;

  /// Factory constructor for gold-rimmed cards
  const AstroCard.goldAccent({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.onTap,
    this.borderRadius = 16,
    this.hasShadow = true,
  })  : variant = AstroCardVariant.goldAccent,
        backgroundColor = null,
        borderColor = null,
        gradient = null;

  Color _resolveBackgroundColor() {
    if (backgroundColor != null) return backgroundColor!;
    switch (variant) {
      case AstroCardVariant.elevated:
        return AppColors.cardSurface;
      case AstroCardVariant.warm:
        return AppColors.cardSurfaceWarm;
      case AstroCardVariant.parchment:
        return AppColors.cardSurfaceParchment;
      case AstroCardVariant.dark:
        return AppColors.cardSurfaceDark;
      case AstroCardVariant.tinted:
        return AppColors.cardSurfaceWarm;
      case AstroCardVariant.goldAccent:
        return AppColors.cardSurface;
    }
  }

  Color _resolveBorderColor() {
    if (borderColor != null) return borderColor!;
    switch (variant) {
      case AstroCardVariant.elevated:
        return AppColors.cardBorder;
      case AstroCardVariant.warm:
        return AppColors.cardBorder;
      case AstroCardVariant.parchment:
        return AppColors.cardBorderSubtle;
      case AstroCardVariant.dark:
        return AppColors.cardBorderDark;
      case AstroCardVariant.tinted:
        return AppColors.cardBorderSubtle;
      case AstroCardVariant.goldAccent:
        return AppColors.goldBorder;
    }
  }

  List<BoxShadow>? _resolveShadow() {
    if (!hasShadow) return null;
    switch (variant) {
      case AstroCardVariant.dark:
        return [
          BoxShadow(
            color: AppColors.midnight.withValues(alpha: 0.25),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ];
      case AstroCardVariant.goldAccent:
        return [
          BoxShadow(
            color: AppColors.gold.withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ];
      case AstroCardVariant.elevated:
      case AstroCardVariant.warm:
      case AstroCardVariant.parchment:
      case AstroCardVariant.tinted:
        return [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectiveBorderRadius = BorderRadius.circular(borderRadius);

    Widget cardContent = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? _resolveBackgroundColor() : null,
        gradient: gradient,
        borderRadius: effectiveBorderRadius,
        border: Border.all(
          color: _resolveBorderColor(),
          width: variant == AstroCardVariant.goldAccent ? 1.2 : 1.0,
        ),
        boxShadow: _resolveShadow(),
      ),
      child: child,
    );

    if (margin != null) {
      cardContent = Padding(padding: margin!, child: cardContent);
    }

    if (onTap != null) {
      return ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: AppTouchTargets.minTouchTarget,
          minWidth: AppTouchTargets.minTouchTarget,
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: effectiveBorderRadius,
          child: cardContent,
        ),
      );
    }

    return cardContent;
  }
}
