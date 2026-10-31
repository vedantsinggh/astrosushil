import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/app_theme_tokens.dart';

enum AstroButtonVariant {
  primary,
  secondary,
  outlined,
  goldAccent,
}

/// Standardized, accessible button component for Astro Sushil.
///
/// Guarantees a minimum 48dp touch target, elegant rounded corners,
/// micro-loading states, and consistent typography.
class AstroButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AstroButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool fullWidth;
  final double height;
  final Color? customBackgroundColor;
  final Color? customForegroundColor;

  const AstroButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AstroButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = AppTouchTargets.minTouchTarget,
    this.customBackgroundColor,
    this.customForegroundColor,
  });

  /// Factory constructor for Primary Midnight Navy Button
  const AstroButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = AppTouchTargets.minTouchTarget,
  })  : variant = AstroButtonVariant.primary,
        customBackgroundColor = null,
        customForegroundColor = null;

  /// Factory constructor for Gold Accent CTA Button
  const AstroButton.gold({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = AppTouchTargets.minTouchTarget,
  })  : variant = AstroButtonVariant.goldAccent,
        customBackgroundColor = null,
        customForegroundColor = null;

  /// Factory constructor for Outlined Button
  const AstroButton.outlined({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = AppTouchTargets.minTouchTarget,
  })  : variant = AstroButtonVariant.outlined,
        customBackgroundColor = null,
        customForegroundColor = null;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    BorderSide side = BorderSide.none;

    switch (variant) {
      case AstroButtonVariant.primary:
        bg = customBackgroundColor ?? AppColors.primary;
        fg = customForegroundColor ?? Colors.white;
        break;
      case AstroButtonVariant.secondary:
        bg = customBackgroundColor ?? AppColors.cardSurfaceWarm;
        fg = customForegroundColor ?? AppColors.primary;
        side = const BorderSide(color: AppColors.cardBorder, width: 1);
        break;
      case AstroButtonVariant.outlined:
        bg = Colors.transparent;
        fg = customForegroundColor ?? AppColors.primary;
        side = BorderSide(
          color: customBackgroundColor ?? AppColors.primary,
          width: 1.2,
        );
        break;
      case AstroButtonVariant.goldAccent:
        bg = customBackgroundColor ?? AppColors.gold;
        fg = customForegroundColor ?? AppColors.primary;
        break;
    }

    final buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: fg,
      disabledBackgroundColor: AppColors.disabledSurface,
      disabledForegroundColor: AppColors.disabled,
      elevation: variant == AstroButtonVariant.outlined ? 0 : 1,
      minimumSize: Size(fullWidth ? double.infinity : 48, height),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: side,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
    );

    Widget content;
    if (isLoading) {
      content = SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2.2,
          valueColor: AlwaysStoppedAnimation<Color>(fg),
        ),
      );
    } else if (icon != null) {
      content = Row(
        mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: fg),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTypography.labelLarge.copyWith(color: fg),
          ),
        ],
      );
    } else {
      content = Text(
        label,
        style: AppTypography.labelLarge.copyWith(color: fg),
      );
    }

    final button = ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: buttonStyle,
      child: content,
    );

    if (fullWidth) {
      return SizedBox(
        width: double.infinity,
        height: height,
        child: button,
      );
    }

    return SizedBox(
      height: height,
      child: button,
    );
  }
}
