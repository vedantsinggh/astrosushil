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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CelestialOnboardingBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar with Skip Action
              Padding(
                padding: const EdgeInsets.only(top: 8.0, right: 16.0, left: 16.0),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
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
