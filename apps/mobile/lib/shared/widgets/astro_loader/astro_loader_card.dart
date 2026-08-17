import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'astro_solar_system_animation.dart';

/// Card variant adhering to the Astro Sushil design system card guidelines.
class AstroLoaderCard extends StatelessWidget {
  final String? message;
  final bool isDark;
  final bool? reducedMotion;

  const AstroLoaderCard({
    super.key,
    this.message,
    this.isDark = false,
    this.reducedMotion,
  });

  @override
  Widget build(BuildContext context) {
    final String displayMessage = message ?? 'Aligning your stars...';
    final Color bgColor = isDark ? AppColors.tertiary : AppColors.lightSurface;
    final Color borderColor = isDark ? AppColors.border : AppColors.lightBorder;
    final Color textColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    return Semantics(
      label: 'Loading, $displayMessage',
      container: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double loaderSize = (constraints.maxWidth * 0.30).clamp(70.0, 120.0);

            return Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AstroSolarSystemAnimation(
                  size: loaderSize,
                  isDark: isDark,
                  numOrbits: 3,
                  showStars: true,
                  reducedMotionOverride: reducedMotion,
                ),
                const SizedBox(height: 16),
                Text(
                  displayMessage,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
