import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/astro_app_bar.dart';
import '../widgets/astro_button.dart';
import '../widgets/astro_state_illustration.dart';
import '../widgets/subtle_celestial_background.dart';

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
      appBar: AstroAppBar(
        title: isHindi ? 'सिस्टम रखरखाव' : 'System Maintenance',
        showBackButton: false,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const AstroStateIllustration(
                    type: AstroStateType.maintenance,
                    size: 140,
                  ),
                  const SizedBox(height: 28),
                  Text(
                    isHindi ? 'सिस्टम रखरखाव जारी है' : 'Scheduled Maintenance',
                    style: AppTypography.headlineMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 320),
                    child: Text(
                      isHindi
                          ? 'एस्ट्रो सुशील सर्वर प्रणालियों का नियमित तकनीकी उन्नयन चल रहा है। पंचांग एवं कुंडली गणना सेवाएं शीघ्र पुनः सक्रिय होंगी।'
                          : 'Astro Sushil backend calculation clusters are undergoing scheduled technical upgrades. Ephemeris and chart services will resume shortly.',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.lightTextSecondary,
                        height: 1.45,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.cloud_done_outlined,
                          size: 20,
                          color: AppColors.secondary,
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            isHindi
                                ? 'सहेजी गई जन्म कुंडलियां एवं डाउनलोड किए गए पीडीएफ ऑफलाइन उपलब्ध हैं।'
                                : 'Locally saved birth charts and downloaded dossiers remain accessible offline.',
                            style: AppTypography.caption.copyWith(
                              color: AppColors.lightTextPrimary,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  AstroButton(
                    label: isHindi ? 'स्थिति पुनः जांचें' : 'Check Status / Refresh',
                    variant: AstroButtonVariant.primary,
                    onPressed: () {
                      if (onRefresh != null) {
                        onRefresh!();
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              isHindi
                                  ? 'सिस्टम स्थिति जांची जा रही है...'
                                  : 'Checking system status...',
                            ),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
