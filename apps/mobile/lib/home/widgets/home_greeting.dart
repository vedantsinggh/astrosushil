import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';

/// The active birth profile under the home large title, with one clear
/// "Change" action. The greeting itself is the nav bar's large title.
/// Renders nothing when there is no profile yet (the highlight card then
/// asks the user to add their details).
class HomeGreeting extends StatelessWidget {
  final String displayName;
  final BirthProfileModel? activeProfile;
  final VoidCallback onChangeProfileTap;

  const HomeGreeting({
    super.key,
    required this.displayName,
    required this.activeProfile,
    required this.onChangeProfileTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final profile = activeProfile;
    if (profile == null) return const SizedBox.shrink();

    final initial = profile.name.trim().isNotEmpty ? profile.name.trim()[0].toUpperCase() : '•';
    final place = profile.placeName.trim();
    final radius = BorderRadius.circular(16);

    return Semantics(
      button: true,
      label: l10n.homeProfileSemantics(profile.name),
      onTap: onChangeProfileTap,
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          borderRadius: radius,
          boxShadow: AstroShadows.card,
        ),
        child: Material(
          type: MaterialType.transparency,
          borderRadius: radius,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onChangeProfileTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 60),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AstroTint.amber.background,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
                      ),
                      child: Text(
                        initial,
                        style: AppTypography.navTitle.copyWith(fontSize: 17, color: AstroTint.amber.foreground),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            profile.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w600),
                          ),
                          if (place.isNotEmpty)
                            Text(
                              place,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.rowSubtitle.copyWith(fontSize: 14),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Shrinks (never clips) when the name and a large font compete for space.
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 110),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              l10n.homeChangeProfile,
                              maxLines: 1,
                              style: AppTypography.rowTitle.copyWith(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.accent,
                              ),
                            ),
                            const Icon(Icons.unfold_more_rounded, size: 20, color: AppColors.accent),
                          ],
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
    );
  }
}
