import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../models/birth_profile_model.dart';

/// Card widget displaying summarized birth profile information
class BirthProfileCard extends StatelessWidget {
  final BirthProfileModel profile;
  final VoidCallback onTap;
  final bool isActive;
  final VoidCallback? onSelectActive;

  const BirthProfileCard({
    super.key,
    required this.profile,
    required this.onTap,
    this.isActive = false,
    this.onSelectActive,
  });

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(18);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: radius,
        boxShadow: AstroShadows.card,
        border: Border.all(
          color: isActive ? AppColors.gold.withValues(alpha: 0.75) : const Color(0x0F121440),
          width: isActive ? 1.5 : 0.5,
        ),
      ),
      child: Material(
        type: MaterialType.transparency,
        borderRadius: radius,
        child: InkWell(
          borderRadius: radius,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 12, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Avatar
                    Container(
                      width: 48,
                      height: 48,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: isActive ? AppGradients.heroNavy : null,
                        color: isActive ? null : AstroTint.navy.background,
                        border: isActive ? Border.all(color: AppColors.gold.withValues(alpha: 0.8)) : null,
                      ),
                      child: profile.name.trim().isEmpty
                          ? Icon(Icons.person_outline_rounded,
                              color: isActive ? AppColors.gold : AppColors.primary, size: 26)
                          : Text(
                              profile.name.trim()[0].toUpperCase(),
                              style: AppTypography.navTitle.copyWith(
                                fontSize: 20,
                                color: isActive ? AppColors.gold : AppColors.primary,
                              ),
                            ),
                    ),
                    const SizedBox(width: 14),

                    // Name and details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profile.name,
                            style: AppTypography.headlineMedium.copyWith(
                              fontSize: 19,
                              height: 1.25,
                              color: AppColors.lightTextPrimary,
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          _DetailLine(
                            icon: Icons.calendar_today_rounded,
                            text: '${Formatters.formatDisplayDate(profile.dateOfBirth)} at ${profile.timeOfBirth}',
                          ),
                          const SizedBox(height: 4),
                          _DetailLine(
                            icon: Icons.place_outlined,
                            text: profile.placeName,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Padding(
                      padding: EdgeInsets.only(top: 10),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        color: AppColors.lightTextMuted,
                        size: 28,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (isActive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AstroTint.amber.background,
                      border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle_rounded, size: 20, color: Color(0xFFB45309)),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Active',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                else if (onSelectActive != null)
                  OutlinedButton.icon(
                    onPressed: onSelectActive,
                    icon: const Icon(Icons.radio_button_unchecked_rounded, size: 20),
                    label: const Text(
                      'Set as Active',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.accent,
                      minimumSize: const Size(48, 48),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      side: const BorderSide(color: AppColors.separator, width: 1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailLine extends StatelessWidget {
  final IconData icon;
  final String text;

  const _DetailLine({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: AppColors.secondary),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 15, height: 1.35, color: AppColors.lightTextSecondary),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
