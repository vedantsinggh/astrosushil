import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/birth_profile/screens/birth_profile_list_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../providers/home_provider.dart';
import '../widgets/free_features_section.dart';
import '../widgets/gupta_nadi_card.dart';
import '../widgets/hero_astrology_card.dart';
import '../widgets/home_bottom_navigation.dart';
import '../widgets/home_header.dart';
import '../widgets/quick_access_section.dart';
import '../widgets/rashi_bhavishya_card.dart';
import '../widgets/reports_section.dart';
import '../widgets/vastu_card.dart';
import 'profile_screen.dart';
import 'reports_screen.dart';

/// Main Shell & Home Screen container with Bottom Navigation for Astro Platform
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentTabIndex = ref.watch(homeTabControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: IndexedStack(
        index: currentTabIndex,
        children: [
          const _HomeTabContentView(),
          const ReportsScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: HomeBottomNavigation(
        currentIndex: currentTabIndex,
        onTap: (index) {
          ref.read(homeTabControllerProvider.notifier).state = index;
        },
      ),
    );
  }
}

/// Home Tab Content View displaying hierarchy of free tools, hero, reports, and flagship features
class _HomeTabContentView extends ConsumerWidget {
  const _HomeTabContentView();

  void _navigateToKundli(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const BirthProfileListScreen(),
      ),
    );
  }

  void _showGuptaNadiModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: AppColors.tertiary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(
            top: BorderSide(color: AppColors.premiumAccent, width: 1.5),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.premiumAccent.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.star_rounded,
                    color: AppColors.premiumAccent,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Gupta Nadi Analysis',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Gupta Nadi is Astro Sushil\'s flagship rule engine based on Brihaspati Nandi Nadi (BNN) principles. It delivers 100% deterministic planetary interaction mapping.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withOpacity(0.85),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                _navigateToKundli(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Select Birth Profile for Analysis',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _showFeatureNotice(BuildContext context, String title, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$title: $message'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final prediction = ref.watch(dailyRashiBhavishyaProvider);
    final reports = ref.watch(paidReportsProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. TOP HEADER
              HomeHeader(
                userName: user?.email ?? 'Cosmic Seeker',
                onProfileTap: () {
                  ref.read(homeTabControllerProvider.notifier).state = 2;
                },
              ),

              const SizedBox(height: 20),

              // 2. HERO CARD ("Your Cosmic Journey")
              HeroAstrologyCard(
                onViewChartTap: () => _navigateToKundli(context),
              ),

              const SizedBox(height: 28),

              // 3. QUICK ACCESS
              QuickAccessSection(
                onKundliTap: () => _navigateToKundli(context),
                onPlanetsTap: () => _navigateToKundli(context),
                onPredictionTap: () => _showFeatureNotice(
                  context,
                  'Rashi Bhavishya',
                  'Daily forecast detailed breakdown',
                ),
                onVastuTap: () => _showFeatureNotice(
                  context,
                  'Vastu',
                  'Vastu spatial orientation guide',
                ),
              ),

              const SizedBox(height: 28),

              // 4. FREE ASTROLOGY FEATURES ("Explore Astrology")
              FreeFeaturesSection(
                onKundliTap: () => _navigateToKundli(context),
                onPlanetsTap: () => _navigateToKundli(context),
                onRashiTap: () => _showFeatureNotice(
                  context,
                  'Rashi Bhavishya',
                  'Daily planetary forecast preview',
                ),
                onVastuTap: () => _showFeatureNotice(
                  context,
                  'Vastu Guidance',
                  'Directional energy alignment',
                ),
              ),

              const SizedBox(height: 28),

              // 5. GUPTA NADI / FLAGSHIP PREMIUM FEATURE
              GuptaNadiCard(
                onExploreTap: () => _showGuptaNadiModal(context),
              ),

              const SizedBox(height: 28),

              // 6. DAILY RASHI BHAVISHYA PREVIEW
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0),
                child: Text(
                  'Daily Forecast',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              RashiBhavishyaCard(
                preview: prediction,
                onReadTap: () => _showFeatureNotice(
                  context,
                  'Rashi Bhavishya',
                  'Full prediction report',
                ),
              ),

              const SizedBox(height: 28),

              // 7. VASTU FEATURE CARD
              VastuCard(
                onExploreTap: () => _showFeatureNotice(
                  context,
                  'Vastu Guidance',
                  'Home orientation & spatial flow entry point',
                ),
              ),

              const SizedBox(height: 28),

              // 8. PAID PERSONALIZED REPORTS
              ReportsSection(
                reports: reports,
                onReportTap: (report) {
                  ref.read(homeTabControllerProvider.notifier).state = 1;
                },
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
