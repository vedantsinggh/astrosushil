import 'package:flutter/material.dart';
import '../../../home/screens/home_screen.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_button.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';

class RegisterSuccessScreen extends StatelessWidget {
  const RegisterSuccessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),

                // Celestial Success Emblem with Gold Ring
                Center(
                  child: Container(
                    width: 104,
                    height: 104,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.success.withValues(alpha: 0.12),
                      border: Border.all(color: AppColors.gold, width: 2.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.gold.withValues(alpha: 0.25),
                          blurRadius: 28,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 54,
                      color: AppColors.success,
                    ),
                  ),
                ),

                const SizedBox(height: 36),

                // Welcome Heading
                Text(
                  isHindi ? 'एस्ट्रो सुशील में आपका स्वागत है!' : 'Welcome to Astro Sushil!',
                  style: AppTypography.headlineMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: -0.5,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 12),

                // Reassuring Subtitle
                Text(
                  isHindi
                      ? 'आपका खाता सफलतापूर्वक निर्मित हो चुका है।\nआइए, वैदिक ज्ञान के साथ जीवन को आलोकित करें।'
                      : 'Your account has been created successfully.\nExplore authentic Vedic astrology, reports, and consultations.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.lightTextSecondary,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 24),

                // Feature reassurance card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurfaceWarm,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.auto_awesome,
                        color: AppColors.premiumAccent,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          isHindi
                              ? '100% प्रामाणिक वैदिक पंचांग एवं गुप्त नाड़ी पद्धति सक्रिय'
                              : '100% Deterministic Vedic Ephemeris & Gupta Nadi lineage active',
                          style: AppTypography.caption.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Get Started Button
                AstroButton(
                  label: isHindi ? 'शुरू करें' : 'Get Started',
                  variant: AstroButtonVariant.primary,
                  fullWidth: true,
                  onPressed: () {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(
                        builder: (_) => const HomeScreen(),
                      ),
                      (route) => false,
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
