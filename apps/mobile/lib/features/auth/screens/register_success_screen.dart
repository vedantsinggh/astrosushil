import 'package:flutter/material.dart';
import '../../../home/screens/home_screen.dart';
import '../../../shared/widgets/astro_design_system.dart';
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
          // Scrolls when the content is taller than the screen (large text,
          // landscape); otherwise the Spacers centre it as before.
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
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
                      gradient: AppGradients.heroNavy,
                      border: Border.all(color: AppColors.gold, width: 1.5),
                      boxShadow: AstroShadows.hero,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 54,
                      color: AppColors.gold,
                    ),
                  ),
                ),

                const SizedBox(height: 36),

                // Welcome Heading
                Text(
                  isHindi ? 'एस्ट्रो सुशील में आपका स्वागत है!' : 'Welcome to Astro Sushil!',
                  style: AppTypography.largeTitle.copyWith(fontSize: 28, height: 1.2),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 12),

                // Reassuring Subtitle
                Text(
                  isHindi
                      ? 'आपका खाता सफलतापूर्वक निर्मित हो चुका है।\nआइए, वैदिक ज्ञान के साथ जीवन को आलोकित करें।'
                      : 'Your account has been created successfully.\nExplore authentic Vedic astrology, reports, and consultations.',
                  style: AppTypography.bodyLarge.copyWith(
                    fontSize: 16,
                    color: AppColors.lightTextSecondary,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 24),

                // Feature reassurance card
                AstroSurfaceCard(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const AstroIconSquare(icon: Icons.auto_awesome, tint: AstroTint.amber),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          isHindi
                              ? '100% प्रामाणिक वैदिक पंचांग एवं गुप्त नाड़ी पद्धति सक्रिय'
                              : '100% Deterministic Vedic Ephemeris & Gupta Nadi lineage active',
                          style: AppTypography.rowSubtitle.copyWith(
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
                AstroPrimaryButton(
                  label: isHindi ? 'शुरू करें' : 'Get Started',
                  icon: Icons.arrow_forward_rounded,
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
            ),
          ),
        ),
      ),
    );
  }
}
