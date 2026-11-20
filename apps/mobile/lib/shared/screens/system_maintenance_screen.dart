import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../widgets/subtle_celestial_background.dart';
import 'simple_screen_kit.dart';

/// Screen presented when system is undergoing scheduled maintenance or database migrations
class SystemMaintenanceScreen extends StatelessWidget {
  final VoidCallback? onRefresh;

  const SystemMaintenanceScreen({
    super.key,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SimpleStateView(
            icon: Icons.construction_rounded,
            iconColor: AppColors.goldDark,
            title: isHindi ? 'सिस्टम रखरखाव जारी है' : 'Scheduled Maintenance',
            message: isHindi
                ? 'एस्ट्रो सुशील सर्वर प्रणालियों का नियमित तकनीकी उन्नयन चल रहा है। पंचांग एवं कुंडली गणना सेवाएं शीघ्र पुनः सक्रिय होंगी।'
                : 'Astro Sushil backend calculation clusters are undergoing scheduled technical upgrades. Ephemeris and chart services will resume shortly.',
            extra: SimpleNote(
              icon: Icons.cloud_done_outlined,
              text: isHindi
                  ? 'सहेजी गई जन्म कुंडलियां एवं डाउनलोड किए गए पीडीएफ ऑफलाइन उपलब्ध हैं।'
                  : 'Locally saved birth charts and downloaded dossiers remain accessible offline.',
            ),
            actionLabel: isHindi ? 'स्थिति पुनः जांचें' : 'Check Status / Refresh',
            actionIcon: Icons.refresh_rounded,
            onAction: () {
              if (onRefresh != null) {
                onRefresh!();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      isHindi ? 'सिस्टम स्थिति जांची जा रही है...' : 'Checking system status...',
                    ),
                    duration: const Duration(seconds: 2),
                  ),
                );
              }
            },
          ),
        ),
      ),
    );
  }
}
