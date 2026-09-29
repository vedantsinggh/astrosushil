import 'package:flutter/material.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';

/// Reusable contextual loading state component for astrology calculations and charts.
class AstrologyLoadingState extends StatelessWidget {
  final String message;
  final bool isDark;
  final double height;
  final bool isCompact;

  const AstrologyLoadingState({
    super.key,
    this.message = 'Aligning your stars and calculating placements...',
    this.isDark = false,
    this.height = 240,
    this.isCompact = false,
  });

  const AstrologyLoadingState.compact({
    super.key,
    this.message = 'Calculating...',
    this.isDark = false,
    this.height = 60,
  }) : isCompact = true;

  @override
  Widget build(BuildContext context) {
    if (isCompact) {
      return SizedBox(
        height: height,
        child: Center(
          child: AstroLoader.inline(
            message: message,
            isDark: isDark,
          ),
        ),
      );
    }

    return SizedBox(
      height: height,
      child: Center(
        child: AstroLoader.card(
          message: message,
          isDark: isDark,
        ),
      ),
    );
  }
}
