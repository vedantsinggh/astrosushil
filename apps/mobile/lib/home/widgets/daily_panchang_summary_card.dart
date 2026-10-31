import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/astrology/screens/panchanga_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_skeleton.dart';

/// Real Calculated Daily Panchanga Summary Card for Home Screen
/// Directly styled according to the visual reference mockup using warm design system tokens.
class DailyPanchangSummaryCard extends ConsumerWidget {
  final VoidCallback? onViewFullPanchang;

  const DailyPanchangSummaryCard({
    super.key,
    this.onViewFullPanchang,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final panchangAsync = ref.watch(activeProfilePanchangProvider);
    final now = DateTime.now();
    final formattedDate = DateFormat('MMM d, yyyy').format(now);
    final formattedDay = DateFormat('EEEE').format(now);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cardBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onViewFullPanchang ??
              () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PanchangaScreen()),
                );
              },
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(18.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Header: "Today's Panchanga" + "[ View Full -> ]"
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: AppColors.tintCoralBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.tintCoralBorder,
                                width: 0.8,
                              ),
                            ),
                            child: const Icon(
                              Icons.wb_sunny_rounded,
                              color: AppColors.tintCoralText,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              l10n.quickPanchang,
                              style: AppTypography.titleLarge.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ConstrainedBox(
                      constraints: const BoxConstraints(
                        minHeight: AppTouchTargets.minTouchTarget,
                        minWidth: 48,
                      ),
                      child: InkWell(
                        onTap: onViewFullPanchang ??
                            () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const PanchangaScreen()),
                              );
                            },
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                l10n.viewFull,
                                style: AppTypography.labelMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 3),
                              const Icon(
                                Icons.arrow_forward_rounded,
                                size: 14,
                                color: AppColors.primary,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // 2. Date & Day Banner
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.canvasSecondary,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.cardBorderSubtle, width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.calendar_today_rounded,
                        size: 13,
                        color: AppColors.secondary,
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          '$formattedDate • $formattedDay',
                          style: AppTypography.caption.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 3. Deterministic Data Columns
                panchangAsync.when(
                  data: (data) {
                    if (data == null) {
                      return Row(
                        children: [
                          const Icon(Icons.info_outline, size: 16, color: AppColors.textMuted),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              l10n.emptyStateMessage,
                              style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary),
                            ),
                          ),
                        ],
                      );
                    }

                    final tithiName = '${data.tithi.paksha == "SUKLA" ? "Shukla" : "Krishna"} ${data.tithi.name}';
                    final nakshatraName = data.nakshatra.name;
                    final yogaName = data.yoga.name;
                    final rahuKaal = data.rahuKala?.formattedWindow ?? 'N/A';

                    return LayoutBuilder(
                      builder: (context, constraints) {
                        return Row(
                          children: [
                            Expanded(
                              child: _PanchangColumn(
                                label: l10n.tithi,
                                value: tithiName,
                              ),
                            ),
                            Container(width: 1, height: 36, color: AppColors.cardBorderSubtle),
                            Expanded(
                              child: _PanchangColumn(
                                label: l10n.nakshatra,
                                value: nakshatraName,
                              ),
                            ),
                            Container(width: 1, height: 36, color: AppColors.cardBorderSubtle),
                            Expanded(
                              child: _PanchangColumn(
                                label: 'Yoga',
                                value: yogaName,
                              ),
                            ),
                            Container(width: 1, height: 36, color: AppColors.cardBorderSubtle),
                            Expanded(
                              child: _PanchangColumn(
                                label: l10n.rahuKaal,
                                value: rahuKaal,
                              ),
                            ),
                          ],
                        );
                      },
                    );
                  },
                  loading: () => const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 12.0),
                      child: AstroSkeleton(
                        width: double.infinity,
                        height: 40,
                        borderRadius: 8,
                      ),
                    ),
                  ),
                  error: (_, __) => Row(
                    children: [
                      const Icon(Icons.info_outline, size: 16, color: AppColors.textMuted),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          l10n.emptyStateMessage,
                          style: AppTypography.bodySmall.copyWith(color: AppColors.lightTextSecondary),
                        ),
                      ),
                    ],
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

class _PanchangColumn extends StatelessWidget {
  final String label;
  final String value;

  const _PanchangColumn({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            style: AppTypography.caption.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.lightTextSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTypography.labelMedium.copyWith(
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

