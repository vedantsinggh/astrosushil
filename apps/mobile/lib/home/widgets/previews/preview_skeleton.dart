import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Reusable helper for clean, data-driven preview skeleton loading states.
class PreviewSkeleton extends StatelessWidget {
  final double height;
  final double? width;
  final BorderRadius? borderRadius;

  const PreviewSkeleton({
    super.key,
    this.height = 14,
    this.width,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.07),
        borderRadius: borderRadius ?? BorderRadius.circular(4),
      ),
    );
  }
}

/// Reusable empty/no-profile visual placeholder for card previews.
class PreviewEmptyState extends StatelessWidget {
  final String title;
  final String message;
  final IconData icon;

  const PreviewEmptyState({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.info_outline_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: AppColors.secondary.withValues(alpha: 0.7)),
              const SizedBox(height: 2),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
              ),
              const SizedBox(height: 1),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 130),
                child: Text(
                  message,
                  style: const TextStyle(
                    fontSize: 8,
                    color: AppColors.lightTextSecondary,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
