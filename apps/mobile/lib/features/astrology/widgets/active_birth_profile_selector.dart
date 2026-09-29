import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
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
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.tertiary : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? AppColors.secondary.withValues(alpha: 0.3) : AppColors.lightBorder,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.premiumAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person_add_rounded, color: AppColors.premiumAccent, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'No birth profile selected',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Add Profile', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.tertiary : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.secondary.withValues(alpha: 0.35) : AppColors.lightBorder,
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.secondary.withValues(alpha: 0.3)
                  : AppColors.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.person_rounded,
              color: isDark ? Colors.white : AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  activeProfile.name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : AppColors.primary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${activeProfile.dateOfBirth} • ${activeProfile.placeName}',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white.withValues(alpha: 0.75) : AppColors.lightTextSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          PopupMenuButton<dynamic>(
            color: AppColors.tertiary,
            elevation: 8,
            tooltip: 'Switch Profile',
            offset: const Offset(0, 38),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(
                color: AppColors.premiumAccent.withValues(alpha: 0.4),
                width: 1,
              ),
            ),
            onSelected: (value) {
              if (value is BirthProfileModel) {
                ref.read(selectedBirthProfileIdProvider.notifier).state = value.id;
                onProfileChanged?.call(value);
              } else if (value == 'add_new') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              }
            },
            itemBuilder: (BuildContext ctx) {
              final items = <PopupMenuEntry<dynamic>>[];

              for (final p in allProfiles) {
                final isSelected = p.id == activeProfile.id;
                items.add(
                  PopupMenuItem<BirthProfileModel>(
                    value: p,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.premiumAccent.withValues(alpha: 0.15)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSelected ? Icons.check_circle_rounded : Icons.person_outline_rounded,
                            size: 18,
                            color: isSelected ? AppColors.premiumAccent : const Color(0xFFA0A0C0),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  p.name,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    color: isSelected ? Colors.white : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                Text(
                                  '${p.dateOfBirth} • ${p.placeName}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: isSelected ? AppColors.premiumAccent : const Color(0xFF94A3B8),
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
                  ),
                );
              }

              items.add(const PopupMenuDivider());

              items.add(
                const PopupMenuItem<String>(
                  value: 'add_new',
                  child: Row(
                    children: [
                      Icon(Icons.add_circle_outline_rounded, size: 18, color: AppColors.premiumAccent),
                      SizedBox(width: 8),
                      Text(
                        'Add New Profile',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.premiumAccent,
                        ),
                      ),
                    ],
                  ),
                ),
              );

              return items;
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: isDark ? AppColors.primary.withValues(alpha: 0.6) : AppColors.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.premiumAccent : AppColors.secondary.withValues(alpha: 0.3),
                  width: 0.8,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Switch',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.premiumAccent : AppColors.secondary,
                    ),
                  ),
                  const SizedBox(width: 3),
                  Icon(
                    Icons.arrow_drop_down_rounded,
                    size: 16,
                    color: isDark ? AppColors.premiumAccent : AppColors.secondary,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
