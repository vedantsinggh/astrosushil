import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'astro_solar_system_animation.dart';

/// Compact inline variant for lists, badges, and inline rows.
class AstroLoaderInline extends StatelessWidget {
  final String? message;
  final bool isDark;
  final double size;
  final bool? reducedMotion;

  const AstroLoaderInline({
    super.key,
    this.message,
    this.isDark = false,
    this.size = 24.0,
    this.reducedMotion,
  });

  @override
  Widget build(BuildContext context) {
    final Color textColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    Widget loaderWidget = AstroSolarSystemAnimation(
      size: size,
      isDark: isDark,
      numOrbits: 2,
      showStars: false,
      reducedMotionOverride: reducedMotion,
    );

    if (message != null && message!.isNotEmpty) {
      loaderWidget = Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          loaderWidget,
          const SizedBox(width: 8),
          Text(
            message!,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
        ],
      );
    }

    return Semantics(
      label: message != null ? 'Loading, $message' : 'Loading',
      child: loaderWidget,
    );
  }
}
