import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_colors.dart';
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? AppColors.premiumAccent : AppColors.cardBorder,
          width: isActive ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Selection indicator / Avatar
                InkWell(
                  onTap: onSelectActive,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isActive ? AppColors.primary : AppColors.primary.withValues(alpha: 0.06),
                      border: Border.all(
                        color: isActive ? AppColors.premiumAccent : AppColors.primary.withValues(alpha: 0.2),
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        isActive ? Icons.check_circle_rounded : Icons.person_outline_rounded,
                        color: isActive ? AppColors.premiumAccent : AppColors.primary,
                        size: 22,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Name and details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              profile.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppColors.lightTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isActive) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.premiumAccent.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.premiumAccent.withValues(alpha: 0.4)),
                              ),
                              child: const Text(
                                'ACTIVE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.secondary),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              '${Formatters.formatDisplayDate(profile.dateOfBirth)} at ${profile.timeOfBirth}',
                              style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(Icons.place_outlined, size: 13, color: AppColors.lightTextMuted),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              profile.placeName,
                              style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.lightTextMuted,
                  size: 22,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

