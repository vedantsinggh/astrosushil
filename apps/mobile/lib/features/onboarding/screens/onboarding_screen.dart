import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../../auth/screens/login_screen.dart';
import '../models/onboarding_page_model.dart';
import '../providers/onboarding_provider.dart';
import '../widgets/celestial_onboarding_background.dart';
import '../widgets/onboarding_navigation.dart';
import '../widgets/onboarding_page_widget.dart';

/// Official 3-page Onboarding Screen for Astro Platform
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

  void _showBirthDataExplanation(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardSurfaceWarm,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.lightBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 22),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Why We Ask for Birth Details',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Text(
                'Vedic Astrology and BNN calculations depend on exact astronomical coordinates at your moment of birth:',
                style: TextStyle(fontSize: 13, color: AppColors.lightTextSecondary, height: 1.4),
              ),
              const SizedBox(height: 12),
              _buildReasonBullet(
                'Birth Date & Time',
                'Determines planetary longitudes and the Ascendant (Lagna), which changes every 2 hours.',
              ),
              const SizedBox(height: 8),
              _buildReasonBullet(
                'Verified Birthplace',
                'Latitude and longitude calculate the exact local horizon tilt and divisional charts.',
              ),
              const SizedBox(height: 8),
              _buildReasonBullet(
                'Privacy Assured',
                'Your details are used strictly for astrological chart generation and never shared with third parties.',
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Understood'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildReasonBullet(String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.premiumAccent),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 12, color: AppColors.lightTextPrimary, height: 1.35),
              children: [
                TextSpan(text: '$title: ', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                TextSpan(text: description),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CelestialOnboardingBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar with 'Why Birth Details?' & Skip Action
              Padding(
                padding: const EdgeInsets.only(top: 8.0, right: 16.0, left: 16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: () => _showBirthDataExplanation(context),
                      icon: const Icon(Icons.help_outline_rounded, size: 16, color: AppColors.premiumAccent),
                      label: const Text(
                        'Why Birth Data?',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.premiumAccent,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _finishOnboarding,
                      child: Text(
                        'Skip',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.textSecondary,
                        ),
                      ),
                    ),
                  ],
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
