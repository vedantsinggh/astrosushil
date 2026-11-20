import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';

/// Reusable profile switcher header for astrology screens.
/// Automatically connects to [selectedBirthProfileProvider] and [birthProfilesListNotifierProvider].
class ActiveBirthProfileSelector extends ConsumerWidget {
  final bool isDark;
  final ValueChanged<BirthProfileModel>? onProfileChanged;

  const ActiveBirthProfileSelector({
    super.key,
    this.isDark = true,
    this.onProfileChanged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = ref.watch(selectedBirthProfileProvider);
    final allProfiles = profilesState.profiles;

    if (activeProfile == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.tertiary : AppColors.cardSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? AppColors.secondary.withValues(alpha: 0.3)
                : AppColors.cardBorder,
            width: 1.0,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.premiumAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_add_rounded,
                  color: AppColors.goldDark, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'No birth profile selected',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (_) => const CreateBirthProfileScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                minimumSize: const Size(48, 48),
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Add Profile',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    }

    final avatar = Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: isDark ? AppColors.secondary.withValues(alpha: 0.3) : AstroTint.amber.background,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.gold.withValues(alpha: isDark ? 0.4 : 0.55), width: 1),
      ),
      child: Icon(
        Icons.person_rounded,
        color: isDark ? Colors.white : AppColors.goldDark,
        size: 24,
      ),
    );

    final details = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          activeProfile.name,
          style: AppTypography.rowTitle.copyWith(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : AppColors.textPrimary,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 2),
        Text(
          '${activeProfile.dateOfBirth} • ${activeProfile.placeName}',
          style: AppTypography.rowSubtitle.copyWith(
            fontSize: 14,
            color: isDark ? Colors.white.withValues(alpha: 0.8) : AppColors.textSecondary,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );

    Future<void> pickProfile() async {
      final choice = await showAstroActionSheet<Object>(
        context: context,
        title: 'Switch Profile',
        actions: [
          for (final p in allProfiles)
            AstroSheetAction<Object>(
              label: p.name,
              value: p,
              icon: Icons.person_outline_rounded,
              selected: p.id == activeProfile.id,
            ),
          const AstroSheetAction<Object>(
            label: 'Add New Profile',
            value: 'add_new',
            icon: Icons.add_circle_outline_rounded,
          ),
        ],
      );
      if (!context.mounted || choice == null) return;
      if (choice is BirthProfileModel) {
        ref.read(selectedBirthProfileIdProvider.notifier).state = choice.id;
        onProfileChanged?.call(choice);
      } else if (choice == 'add_new') {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
        );
      }
    }

    final fg = isDark ? AppColors.gold : AppColors.accent;
    final switchButton = Tooltip(
      message: 'Switch Profile',
      excludeFromSemantics: true,
      child: Semantics(
        button: true,
        label: 'Switch Profile',
        excludeSemantics: true,
        child: Material(
          color: isDark ? Colors.white.withValues(alpha: 0.12) : AppColors.accentFill,
          borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
          child: InkWell(
            onTap: pickProfile,
            borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.swap_horiz_rounded, size: MediaQuery.textScalerOf(context).scale(20).clamp(20.0, 30.0), color: fg),
                    const SizedBox(width: 6),
                    Text(
                      'Switch',
                      style: AppTypography.button.copyWith(fontSize: 15, fontWeight: FontWeight.w600, color: fg),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(1.0);
        // Put the Switch button under the name when space is tight (small
        // phones or large system text) so the name stays readable.
        final stacked =
            constraints.hasBoundedWidth && constraints.maxWidth / scale < 330;
        final body = stacked
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      avatar,
                      const SizedBox(width: 12),
                      Expanded(child: details),
                    ],
                  ),
                  const SizedBox(height: 12),
                  switchButton,
                ],
              )
            : Row(
                children: [
                  avatar,
                  const SizedBox(width: 12),
                  Expanded(child: details),
                  const SizedBox(width: 8),
                  switchButton,
                ],
              );
        if (!isDark) {
          return AstroSurfaceCard(
            radius: AstroMetrics.groupRadius,
            padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
            child: body,
          );
        }
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
          decoration: BoxDecoration(
            color: AppColors.tertiary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.secondary.withValues(alpha: 0.35)),
          ),
          child: body,
        );
      },
    );
  }
}
