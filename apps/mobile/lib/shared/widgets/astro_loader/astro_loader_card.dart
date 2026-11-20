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
    final Color textColor = isDark ? AppColors.textInversePrimary : AppColors.lightTextPrimary;

    return Semantics(
      label: 'Loading, $displayMessage',
      container: true,
      child: LayoutBuilder(
        builder: (context, outer) {
          // In short or fixed-height parents (and at 2x text) shrink the
          // animation and padding, then scroll rather than overflow.
          final scale = MediaQuery.textScalerOf(context).scale(1);
          final bounded = outer.hasBoundedHeight;
          final tight = bounded && outer.maxHeight < 260;
          final vPad = tight ? 10.0 : 24.0;
          double loaderSize = ((outer.hasBoundedWidth ? outer.maxWidth : 320) * 0.30).clamp(70.0, 120.0);
          if (bounded) {
            final textRoom = 24 + 16 * 1.4 * scale * 2;
            loaderSize = loaderSize.clamp(28.0, (outer.maxHeight - vPad * 2 - textRoom).clamp(28.0, 120.0));
          }
          return Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: vPad),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: borderColor.withValues(alpha: isDark ? 1 : 0.6)),
            ),
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              child: Column(
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
                  SizedBox(height: tight ? 8 : 16),
                  Text(
                    displayMessage,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      color: textColor,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
