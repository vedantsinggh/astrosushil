import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';

/// Top Header component for Home Screen showing user greeting, language toggle, and profile avatar
class HomeHeader extends ConsumerWidget {
  final String userName;
  final VoidCallback onProfileTap;

  const HomeHeader({
    super.key,
    required this.userName,
    required this.onProfileTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';

    // Extract a clean display name from email or user string
    final displayName = userName.isNotEmpty
        ? (userName.contains('@') ? userName.split('@').first : userName)
        : '';

    final greeting = displayName.isNotEmpty
        ? l10n.welcomeUser(displayName)
        : l10n.welcomeGuest;

    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  l10n.blessingSubtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.lightTextSecondary,
                    fontWeight: FontWeight.w400,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Row(
            children: [
              // Language Toggle Pill with 48dp minimum interactive area
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
                      constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      alignment: Alignment.center,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.2),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.translate_rounded,
                              size: 14,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              isHindi ? 'हिन्दी' : 'EN',
                              style: const TextStyle(
                                fontSize: 12,
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

              const SizedBox(width: 4),

              // User Profile Avatar with Gold Border (48dp touch target)
              Semantics(
                button: true,
                label: 'View Account and Profile',
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onProfileTap,
                    borderRadius: BorderRadius.circular(24),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
                      alignment: Alignment.center,
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.premiumAccent,
                            width: 1.8,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.18),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            initial,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: AppColors.premiumAccent,
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
