import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_nav_bar.dart';
import '../../shared/widgets/astro_platform.dart';

/// Brand mark shown at the leading edge of the home nav bar: the Sushil Sir
/// avatar in a thin gold ring plus the serif "Astro Sushil" wordmark. The
/// wordmark is dropped (avatar kept) when the bar is too tight for it, so the
/// bar never truncates or overlaps.
class HomeBrandMark extends StatelessWidget {
  const HomeBrandMark({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final mq = MediaQuery.of(context);
    final scale = mq.textScaler.clamp(maxScaleFactor: 1.3).scale(1);
    // The trailing actions take ~170pt; keep the wordmark only when it fits.
    final showWordmark = mq.size.width / scale >= 340;

    return Semantics(
      header: true,
      label: l10n.appName,
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsetsDirectional.only(start: 16, end: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 34,
              height: 34,
              padding: const EdgeInsets.all(1.5),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFE9C766), AppColors.gold, Color(0xFFB8922A)],
                ),
              ),
              child: ClipOval(
                child: Image.asset(
                  AppAssets.sushilAvatar,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const ColoredBox(
                    color: AppColors.primary,
                    child: Icon(Icons.person, size: 20, color: AppColors.gold),
                  ),
                ),
              ),
            ),
            if (showWordmark) ...[
              const SizedBox(width: 9),
              Text(
                l10n.appName,
                maxLines: 1,
                softWrap: false,
                style: AppTypography.navTitle.copyWith(fontSize: 19, letterSpacing: -0.3),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Trailing actions of the home nav bar: notifications, language switch and
/// the account avatar. Every action has a text label for assistive tech and a
/// 44pt (iOS) / 48dp (Android) target.
class HomeHeaderActions {
  HomeHeaderActions._();

  static List<Widget> build(
    BuildContext context, {
    required String userName,
    required VoidCallback onProfileTap,
    VoidCallback? onNotificationTap,
  }) {
    final displayName = userName.isNotEmpty ? (userName.contains('@') ? userName.split('@').first : userName) : '';
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return [
      _HeaderTap(
        label: 'Notifications and daily alerts',
        onTap: onNotificationTap ??
            () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                ),
        child: const Icon(Icons.notifications_none_rounded, size: 25, color: AppColors.accent),
      ),
      const _LanguageAction(),
      _AccountAction(initial: initial, onTap: onProfileTap),
      const SizedBox(width: 4),
    ];
  }
}

class _LanguageAction extends ConsumerWidget {
  const _LanguageAction();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isHindi = ref.watch(localeProvider).languageCode == 'hi';
    final pill = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.separator, width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.translate_rounded, size: 16, color: AppColors.accent),
          const SizedBox(width: 4),
          Text(
            isHindi ? 'हिन्दी' : 'EN',
            style: AppTypography.labelSmall.copyWith(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.accent,
            ),
          ),
        ],
      ),
    );
    return _HeaderTap(
      label: 'Switch language. Current: ${isHindi ? "Hindi" : "English"}',
      onTap: () => ref.read(localeProvider.notifier).toggleLanguage(),
      child: pill,
    );
  }
}

class _AccountAction extends StatelessWidget {
  final String initial;
  final VoidCallback onTap;

  const _AccountAction({required this.initial, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _HeaderTap(
      label: 'View Account and Profile',
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: AppGradients.heroNavy,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.8), width: 1.2),
        ),
        child: Text(
          initial,
          style: AppTypography.labelMedium.copyWith(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.gold,
          ),
        ),
      ),
    );
  }
}

/// Platform tap target for custom header actions: press-dim on iOS, ripple
/// on Android.
class _HeaderTap extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final Widget child;

  const _HeaderTap({required this.label, required this.onTap, required this.child});

  @override
  Widget build(BuildContext context) {
    if (AstroPlatform.isCupertino(context)) {
      return Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: AstroPressable(semanticLabel: label, onPressed: onTap, child: child),
      );
    }
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: InkResponse(
          onTap: onTap,
          radius: 26,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            child: Center(widthFactor: 1, child: child),
          ),
        ),
      ),
    );
  }
}
