import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';
import '../../features/notifications/screens/notifications_screen.dart';

/// Top Branded Header for Home Screen inspired by the reference mockup.
/// Features the official Astro Sushil avatar emblem, serif brand identity,
/// notifications action, bilingual language switcher, and accessible profile touch targets (>= 48x48dp).
class HomeHeader extends ConsumerWidget {
  final String userName;
  final VoidCallback onProfileTap;
  final VoidCallback? onNotificationTap;

  const HomeHeader({
    super.key,
    required this.userName,
    required this.onProfileTap,
    this.onNotificationTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';

    // Extract clean display name
    final displayName = userName.isNotEmpty
        ? (userName.contains('@') ? userName.split('@').first : userName)
        : '';
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 1. LEFT: Brand Avatar + App Name + Subtitle
          Expanded(
            child: Row(
              children: [
                // Sushil Sir circular avatar with refined gold ring
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.gold,
                      width: 1.8,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      AppAssets.sushilAvatar,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.primary,
                        child: const Icon(
                          Icons.person,
                          size: 24,
                          color: AppColors.gold,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // App Branding Text
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        l10n.appName,
                        style: AppTypography.headlineMedium.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 1),
                      Text(
                        l10n.blessingSubtitle,
                        style: AppTypography.caption.copyWith(
                          color: AppColors.lightTextSecondary,
                          fontWeight: FontWeight.w400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // 2. RIGHT: Notification Bell + Language Switcher + User Profile Avatar (>= 48x48dp touch targets)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Notification Action
              Semantics(
                button: true,
                label: 'Notifications and daily alerts',
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      if (onNotificationTap != null) {
                        onNotificationTap!();
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const NotificationsScreen(),
                          ),
                        );
                      }
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      constraints: const BoxConstraints(
                        minHeight: AppTouchTargets.minTouchTarget,
                        minWidth: AppTouchTargets.minTouchTarget,
                      ),
                      alignment: Alignment.center,
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.cardSurfaceWarm,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.cardBorder,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            const Icon(
                              Icons.notifications_none_rounded,
                              size: 19,
                              color: AppColors.primary,
                            ),
                            Positioned(
                              top: 7,
                              right: 7,
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: AppColors.gold,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 2),

              // Language Switcher Pill
              Semantics(
                button: true,
                label: 'Switch language. Current: ${isHindi ? "Hindi" : "English"}',
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      ref.read(localeProvider.notifier).toggleLanguage();
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      constraints: const BoxConstraints(
                        minHeight: AppTouchTargets.minTouchTarget,
                        minWidth: AppTouchTargets.minTouchTarget,
                      ),
                      alignment: Alignment.center,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.cardSurfaceWarm,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.cardBorder,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.translate_rounded,
                              size: 13,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              isHindi ? 'हिन्दी' : 'EN',
                              style: AppTypography.labelSmall.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 2),

              // Account Avatar / Profile Tap (48dp touch target)
              Semantics(
                button: true,
                label: 'View Account and Profile',
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onProfileTap,
                    borderRadius: BorderRadius.circular(24),
                    child: Container(
                      constraints: const BoxConstraints(
                        minHeight: AppTouchTargets.minTouchTarget,
                        minWidth: AppTouchTargets.minTouchTarget,
                      ),
                      alignment: Alignment.center,
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.gold,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            initial,
                            style: AppTypography.labelMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
