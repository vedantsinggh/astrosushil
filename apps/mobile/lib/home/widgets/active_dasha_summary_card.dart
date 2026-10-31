import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/astrology/screens/vimshottari_dasha_screen.dart';
import '../../shared/theme/app_colors.dart';

/// Clean Active Dasha Timeline Summary Banner for Home Screen
class ActiveDashaSummaryCard extends ConsumerWidget {
  final VoidCallback? onViewDashaTree;

  const ActiveDashaSummaryCard({
    super.key,
    this.onViewDashaTree,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final dashaAsync = ref.watch(activeProfileVimshottariDashaProvider);

    return dashaAsync.when(
      data: (dashaTree) {
        if (dashaTree == null || dashaTree.mahadashas.isEmpty) {
          return const SizedBox.shrink();
        }

        // Find active Mahadasha based on isActive flag or current date
        final now = DateTime.now();
        final currentMaha = dashaTree.mahadashas.firstWhere(
          (m) => m.isActive || (now.isAfter(m.startDate) && now.isBefore(m.endDate)),
          orElse: () => dashaTree.mahadashas.first,
        );

        final planetName = currentMaha.planet;

        return Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 20),
          decoration: BoxDecoration(
            color: Colors.white,
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
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onViewDashaTree ??
                  () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const VimshottariDashaScreen()),
                    );
                  },
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.timeline_rounded,
                        color: Color(0xFF7C3AED),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.activeDashaBanner.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            l10n.currentMahaDasha(planetName),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.lightTextPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          l10n.viewDashaDetails,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 16,
                          color: AppColors.primary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
