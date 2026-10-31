import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/astro_app_bar.dart';
import '../widgets/astro_button.dart';
import '../widgets/astro_state_illustration.dart';
import '../widgets/subtle_celestial_background.dart';
import '../../home/screens/home_screen.dart';

/// Screen displayed when an unknown route, broken deep link, or unavailable path is opened
class NotFoundScreen extends StatelessWidget {
  final String? routePath;

  const NotFoundScreen({
    super.key,
    this.routePath,
  });

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: isHindi ? 'मार्ग उपलब्ध नहीं' : 'Route Not Found',
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
                    type: AstroStateType.emptyData,
                    size: 140,
                  ),
                  const SizedBox(height: 28),
                  Text(
                    isHindi ? 'अंतरिक्ष में खोया हुआ मार्ग' : 'Lost in the Cosmos',
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
                          ? 'आप जिस स्क्रीन अथवा लिंक को खोजने का प्रयास कर रहे हैं (${routePath ?? "अज्ञात"}), वह उपलब्ध नहीं है अथवा स्थानांतरित हो चुका है।'
                          : 'The celestial coordinates or screen you requested (${routePath ?? "unknown"}) does not exist or has moved.',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.lightTextSecondary,
                        height: 1.45,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Text(
                      isHindi
                          ? 'आपकी जन्म कुंडलियां एवं सहेजे गए दस्तावेज पूरी तरह सुरक्षित हैं।'
                          : 'Your saved birth charts and library dossiers remain safe.',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.lightTextMuted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 32),
                  AstroButton(
                    label: isHindi ? 'मुख्य पृष्ठ पर लौटें' : 'Return to Home',
                    variant: AstroButtonVariant.primary,
                    onPressed: () {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const HomeScreen()),
                        (route) => false,
                      );
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
