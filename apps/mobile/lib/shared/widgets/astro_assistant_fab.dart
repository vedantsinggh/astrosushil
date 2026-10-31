import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../assets/app_assets.dart';

/// Floating assistant action button for Sushil Sir / Jyoti AI Vedic Guide.
///
/// Features:
/// - Midnight navy with antique gold rim
/// - Official Sushil Sir avatar emblem or sparkle icon
/// - Guaranteed >=48dp accessible touch target
/// - Semantic screen reader label
class AstroAssistantFab extends StatelessWidget {
  final VoidCallback onTap;
  final String tooltip;
  final bool showBadge;

  const AstroAssistantFab({
    super.key,
    required this.onTap,
    this.tooltip = 'Ask Sushil Sir AI Guide',
    this.showBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: SizedBox(
          width: 56,
          height: 56,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Material(
                elevation: 6,
                color: Colors.transparent,
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: onTap,
                  customBorder: const CircleBorder(),
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.gold, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: ClipOval(
                        child: Image.asset(
                          AppAssets.sushilAvatar,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.auto_awesome,
                            color: AppColors.gold,
                            size: 26,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (showBadge)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: AppColors.gold,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
