import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../shared/theme/app_colors.dart';

/// Clean 2x3 Grid of Primary Astrology Destinations for Home Screen
class EssentialAstrologyShortcutsGrid extends StatelessWidget {
  final VoidCallback onBirthChartTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onDashaTap;
  final VoidCallback onMatchmakingTap;
  final VoidCallback onReportsTap;
  final VoidCallback onConsultTap;

  const EssentialAstrologyShortcutsGrid({
    super.key,
    required this.onBirthChartTap,
    required this.onPlanetsTap,
    required this.onDashaTap,
    required this.onMatchmakingTap,
    required this.onReportsTap,
    required this.onConsultTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.sectionKeyFeatures,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.lightTextPrimary,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.25,
          children: [
            _ShortcutTile(
              icon: Icons.auto_awesome_rounded,
              title: l10n.toolBirthChart,
              subtitle: l10n.toolBirthChartDesc,
              badgeColor: AppColors.primary,
              onTap: onBirthChartTap,
            ),
            _ShortcutTile(
              icon: Icons.public_rounded,
              title: l10n.toolPlanets,
              subtitle: l10n.toolPlanetsDesc,
              badgeColor: const Color(0xFF0284C7),
              onTap: onPlanetsTap,
            ),
            _ShortcutTile(
              icon: Icons.timeline_rounded,
              title: l10n.toolDasha,
              subtitle: l10n.toolDashaDesc,
              badgeColor: const Color(0xFF7C3AED),
              onTap: onDashaTap,
            ),
            _ShortcutTile(
              icon: Icons.favorite_border_rounded,
              title: l10n.toolMatchmaking,
              subtitle: l10n.toolMatchmakingDesc,
              badgeColor: const Color(0xFFE11D48),
              onTap: onMatchmakingTap,
            ),
            _ShortcutTile(
              icon: Icons.assignment_outlined,
              title: l10n.navReports,
              subtitle: l10n.reportsSubtitle,
              badgeColor: const Color(0xFF0D9488),
              onTap: onReportsTap,
            ),
            _ShortcutTile(
              icon: Icons.phone_in_talk_outlined,
              title: l10n.navConsult,
              subtitle: l10n.consultVoiceDesc,
              badgeColor: const Color(0xFFD97706),
              onTap: onConsultTap,
            ),
          ],
        ),
      ],
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color badgeColor;
  final VoidCallback onTap;

  const _ShortcutTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.badgeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.lightBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: badgeColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: badgeColor, size: 20),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.lightTextMuted,
                    size: 18,
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.lightTextPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.lightTextSecondary,
                      height: 1.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
