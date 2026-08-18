import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'astro_solar_system_animation.dart';

/// Full-screen responsive variant of the Astro System Loader.
///
/// Used for major user-facing operations such as Kundli chart generation,
/// planetary calculations, and full-screen loading transitions.
class AstroLoaderFullScreen extends StatelessWidget {
  final String? message;
  final bool isDark;
  final bool? reducedMotion;

  const AstroLoaderFullScreen({
    super.key,
    this.message,
    this.isDark = false,
    this.reducedMotion,
  });

  @override
  Widget build(BuildContext context) {
    final String displayMessage = message ?? 'Aligning your stars...';
    final Color bgColor = isDark ? AppColors.primary : AppColors.lightBackground;
    final Color textColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final Color subTextColor = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return Semantics(
      label: 'Loading, $displayMessage',
      container: true,
      liveRegion: true,
      child: Container(
        color: bgColor,
        child: Center(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final double maxDim = constraints.maxWidth > 0 ? constraints.maxWidth : 360.0;
              final double loaderSize = (maxDim * 0.42).clamp(120.0, 220.0);

              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AstroSolarSystemAnimation(
                      size: loaderSize,
                      isDark: isDark,
                      numOrbits: 3,
                      showStars: true,
                      reducedMotionOverride: reducedMotion,
                    ),
                    const SizedBox(height: 28),
                    Text(
                      displayMessage,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: textColor,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Astro Sushil Cosmic Calculations',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: subTextColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
