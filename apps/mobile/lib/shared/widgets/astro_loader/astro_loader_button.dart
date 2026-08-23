import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'astro_solar_system_animation.dart';

/// Dedicated button loading state widget maintaining button dimensions and preventing re-submission.
class AstroLoaderButton extends StatelessWidget {
  final String label;
  final bool isDark;
  final bool isOutlined;
  final VoidCallback? onPressed;
  final bool? reducedMotion;

  const AstroLoaderButton({
    super.key,
    this.label = 'Preparing...',
    this.isDark = false,
    this.isOutlined = false,
    this.onPressed,
    this.reducedMotion,
  });

  @override
  Widget build(BuildContext context) {
    final Color textColor = isOutlined
        ? (isDark ? AppColors.premiumAccent : AppColors.primary)
        : (isDark ? AppColors.primary : Colors.white);

    final ButtonStyle style = isOutlined
        ? OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            side: BorderSide(color: isDark ? AppColors.premiumAccent : AppColors.primary),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          )
        : ElevatedButton.styleFrom(
            backgroundColor: isDark ? AppColors.premiumAccent : AppColors.primary,
            foregroundColor: textColor,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          );

    final Widget child = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AstroSolarSystemAnimation(
          size: 18.0,
          isDark: !isOutlined && !isDark,
          numOrbits: 2,
          showStars: false,
          reducedMotionOverride: reducedMotion,
        ),
        const SizedBox(width: 10),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: textColor,
          ),
        ),
      ],
    );

    return Semantics(
      label: 'Loading button, $label',
      button: true,
      enabled: false,
      child: isOutlined
          ? OutlinedButton(onPressed: null, style: style, child: child)
          : ElevatedButton(onPressed: null, style: style, child: child),
    );
  }
}
