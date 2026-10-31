import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Reusable vector-based Jyoti Avatar Widget.
///
/// Designed as an isolated placeholder component that can easily be updated with
/// official branding assets in Phase 2 without altering the chat UI structure.
class JyotiAvatar extends StatelessWidget {
  final double size;
  final bool showSparkle;

  const JyotiAvatar({
    super.key,
    this.size = 36.0,
    this.showSparkle = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary,
            AppColors.tertiary,
          ],
        ),
        border: Border.all(
          color: AppColors.premiumAccent.withValues(alpha: 0.8),
          width: size > 40 ? 2.0 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.2),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(
            Icons.auto_awesome_rounded,
            size: size * 0.55,
            color: AppColors.premiumAccent,
          ),
          if (showSparkle && size >= 32)
            Positioned(
              top: 2,
              right: 2,
              child: Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: AppColors.premiumAccent,
                  shape: BoxShape.circle,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
