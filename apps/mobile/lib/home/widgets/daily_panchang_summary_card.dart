import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/astrology/screens/panchanga_screen.dart';
import '../../shared/theme/app_colors.dart';

/// Real Calculated Daily Panchanga & Muhurta Summary Card for Home Screen
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

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onViewFullPanchang ??
              () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PanchangaScreen()),
                );
              },
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(
                            Icons.wb_sunny_outlined,
                            color: AppColors.premiumAccent,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              l10n.quickPanchang,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.lightTextPrimary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              l10n.viewFullPanchang,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(
                            Icons.chevron_right_rounded,
                            size: 16,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                panchangAsync.when(
                  data: (data) {
                    if (data == null) {
                      return Row(
                        children: [
                          const Icon(Icons.info_outline, size: 16, color: AppColors.lightTextMuted),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              l10n.emptyStateMessage,
                              style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                            ),
                          ),
                        ],
                      );
                    }

                    final tithiName = data.tithi.name;
                    final nakshatraName = data.nakshatra.name;
                    final rahuKaal = data.rahuKala?.formattedWindow ?? 'N/A';
                    final sunrise = data.sunriseSunset?.formattedSunrise ?? '06:00 AM';

                    return Row(
                      children: [
                        Expanded(
                          child: _PanchangMetric(
                            label: l10n.tithi,
                            value: tithiName,
                          ),
                        ),
                        Container(width: 1, height: 32, color: AppColors.lightBorder),
                        Expanded(
                          child: _PanchangMetric(
                            label: l10n.nakshatra,
                            value: nakshatraName,
                          ),
                        ),
                        Container(width: 1, height: 32, color: AppColors.lightBorder),
                        Expanded(
                          child: _PanchangMetric(
                            label: l10n.rahuKaal,
                            value: rahuKaal,
                          ),
                        ),
                        Container(width: 1, height: 32, color: AppColors.lightBorder),
                        Expanded(
                          child: _PanchangMetric(
                            label: l10n.sunrise,
                            value: sunrise,
                          ),
                        ),
                      ],
                    );
                  },
                  loading: () => const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
                  error: (_, __) => Row(
                    children: [
                      const Icon(Icons.info_outline, size: 16, color: AppColors.lightTextMuted),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          l10n.emptyStateMessage,
                          style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
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

class _PanchangMetric extends StatelessWidget {
  final String label;
  final String value;

  const _PanchangMetric({
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
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.lightTextSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
