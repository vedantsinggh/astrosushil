import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../auth/screens/login_screen.dart';
import '../models/onboarding_page_model.dart';
import '../providers/onboarding_provider.dart';
import '../widgets/celestial_onboarding_background.dart';
import '../widgets/onboarding_navigation.dart';
import '../widgets/onboarding_page_widget.dart';

/// Official 3-page Onboarding Screen for Astro Platform.
///
/// Kept minimal and senior-friendly: large text, one big labelled action per
/// page, a visible "Step X of Y" counter, Back/Skip buttons, and a written
/// hint describing how to move forward.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  static const List<OnboardingPageModel> _pages = [
    OnboardingPageModel(
      titlePrefix: 'Know Your',
      titleHighlight: 'Chart',
      description: 'Explore your birth chart, planets and houses in one clear, beautiful view.',
      imagePath: AppAssets.onboardingChart,
      badgeText: 'chart',
    ),
    OnboardingPageModel(
      titlePrefix: 'Find Your',
      titleHighlight: 'Direction',
      description: 'Understand the patterns in your chart and explore the areas of life that matter to you.',
      imagePath: AppAssets.onboardingDirection,
      badgeText: 'direction',
    ),
    OnboardingPageModel(
      titlePrefix: 'Go Beyond',
      titleHighlight: 'the Basics',
      description: 'Unlock deeper insights and personalized reports built around your birth details.',
      imagePath: AppAssets.onboardingInsights,
      badgeText: 'insights',
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _finishOnboarding() async {
    await ref.read(onboardingCompletedProvider.notifier).completeOnboarding();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const LoginScreen(),
        transitionsBuilder: (_, animation, __, child) => FadeTransition(
          opacity: animation,
          child: child,
        ),
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  void _nextPage() {
    if (_currentIndex < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousPage() {
    if (_currentIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    }
  }

  void _showBirthDataExplanation(BuildContext context) {
    showAstroSheet<void>(
      context: context,
      title: 'Why We Ask for Birth Details',
      showDone: false,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Vedic Astrology and BNN calculations depend on exact astronomical coordinates at your moment of birth:',
            style: TextStyle(fontSize: 16, color: AppColors.lightTextSecondary, height: 1.5),
          ),
          const SizedBox(height: 16),
          AstroGroupedSection(
            children: [
              _reasonRow(
                Icons.schedule_rounded,
                AstroTint.indigo,
                'Birth Date & Time',
                'Determines planetary longitudes and the Ascendant (Lagna), which changes every 2 hours.',
              ),
              _reasonRow(
                Icons.place_rounded,
                AstroTint.sage,
                'Verified Birthplace',
                'Latitude and longitude calculate the exact local horizon tilt and divisional charts.',
              ),
              _reasonRow(
                Icons.lock_rounded,
                AstroTint.amber,
                'Privacy Assured',
                'Your details are used strictly for astrological chart generation and never shared with third parties.',
              ),
            ],
          ),
          const SizedBox(height: 20),
          AstroPrimaryButton(label: 'Understood', onPressed: () => Navigator.of(ctx).pop()),
        ],
      ),
    );
  }

  static Widget _reasonRow(IconData icon, AstroTint tint, String title, String description) {
    return AstroListRow(icon: icon, tint: tint, title: title, subtitle: description);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CelestialOnboardingBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar: Back (after first page) on the left, Skip on the right
              Padding(
                padding: const EdgeInsets.only(top: 4.0, right: 8.0, left: 8.0),
                child: SizedBox(
                  height: 52,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (_currentIndex > 0)
                        TextButton.icon(
                          onPressed: _previousPage,
                          style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                          icon: Icon(AstroIcons.back(context), size: 20, color: AppColors.textInverseSecondary),
                          label: const Text(
                            'Back',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textInverseSecondary,
                            ),
                          ),
                        )
                      else
                        const SizedBox(width: 48),
                      TextButton(
                        onPressed: _finishOnboarding,
                        style: TextButton.styleFrom(
                          minimumSize: const Size(64, 40),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          backgroundColor: Colors.white.withValues(alpha: 0.08),
                          shape: StadiumBorder(side: BorderSide(color: Colors.white.withValues(alpha: 0.18))),
                        ),
                        child: const Text(
                          'Skip',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textInverseSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // PageView Content
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _pages.length,
                  onPageChanged: (index) {
                    setState(() {
                      _currentIndex = index;
                    });
                  },
                  itemBuilder: (context, index) {
                    return OnboardingPageWidget(page: _pages[index]);
                  },
                ),
              ),

              // Plain-language link explaining why birth details are needed
              TextButton.icon(
                onPressed: () => _showBirthDataExplanation(context),
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                icon: const Icon(Icons.info_outline_rounded, size: 20, color: Color(0xFFE9C766)),
                label: const Text(
                  'Why Birth Data?',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFE9C766),
                  ),
                ),
              ),

              // Footer Navigation (Indicators & Next/Get Started Buttons)
              OnboardingNavigation(
                currentIndex: _currentIndex,
                pageCount: _pages.length,
                onNext: _nextPage,
                onGetStarted: _finishOnboarding,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
