import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/astrology/screens/birth_chart_screen.dart';
import '../../features/astrology/screens/planets_screen.dart';
import '../../features/astrology/screens/rashi_bhavishya_screen.dart';
import '../../features/astrology/screens/vastu_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../providers/home_provider.dart';
import '../widgets/celestial_background_painter.dart';
import '../widgets/gupta_nadi_card.dart';
import '../widgets/hero_astrology_card.dart';
import '../widgets/home_bottom_navigation.dart';
import '../widgets/home_header.dart';
import '../widgets/quick_access_section.dart';
import '../widgets/rashi_bhavishya_card.dart';
import '../widgets/reports_section.dart';
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
      body: SubtleCelestialBackground(
        child: IndexedStack(
          index: currentTabIndex,
          children: [
            const _HomeTabContentView(),
            const ReportsScreen(),
            const ProfileScreen(),
          ],
        ),
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

/// Home Tab Content View displaying clear UX hierarchy: Header -> Hero -> Quick Access -> Rashi Bhavishya -> Reports -> Gupta Nadi
class _HomeTabContentView extends ConsumerWidget {
  const _HomeTabContentView();

  void _navigateToBirthChart(BuildContext context, bool hasProfile) {
    if (hasProfile) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const BirthChartScreen()),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
      );
    }
  }

  void _navigateToPlanets(BuildContext context, bool hasProfile) {
    if (hasProfile) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const PlanetsScreen()),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
      );
    }
  }

  void _navigateToRashiBhavishya(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const RashiBhavishyaScreen()),
    );
  }

  void _navigateToVastu(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const VastuScreen()),
    );
  }

  void _showGuptaNadiModal(BuildContext context, bool hasProfile) {
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
                _navigateToBirthChart(context, hasProfile);
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final hasProfile = profilesState.profiles.isNotEmpty;

    final prediction = ref.watch(dailyRashiBhavishyaProvider);
    final reports = ref.watch(paidReportsProvider);

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 10.0),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. TOP HEADER ("Hello, [User Name]")
            HomeHeader(
              userName: user?.email ?? 'User',
              onProfileTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 2;
              },
            ),

            const SizedBox(height: 18),

            // 2. HERO CARD ("Your Cosmic Journey" / "Create Your Birth Profile")
            HeroAstrologyCard(
              hasBirthProfile: hasProfile,
              onViewChartTap: () => _navigateToBirthChart(context, hasProfile),
            ),

            const SizedBox(height: 26),

            // 3. QUICK ACCESS (Birth Chart, Planets, Rashi Bhavishya, Vastu)
            QuickAccessSection(
              onKundliTap: () => _navigateToBirthChart(context, hasProfile),
              onPlanetsTap: () => _navigateToPlanets(context, hasProfile),
              onPredictionTap: () => _navigateToRashiBhavishya(context),
              onVastuTap: () => _navigateToVastu(context),
            ),

            const SizedBox(height: 26),

            // 4. TODAY'S RASHI BHAVISHYA PREVIEW
            RashiBhavishyaSection(
              preview: prediction,
              onReadTap: () => _navigateToRashiBhavishya(context),
            ),

            const SizedBox(height: 26),

            // 5. PERSONALIZED REPORTS
            ReportsSection(
              reports: reports,
              onReportTap: (report) {
                ref.read(homeTabControllerProvider.notifier).state = 1;
              },
            ),

            const SizedBox(height: 26),

            // 6. GUPTA NADI FLAGSHIP FEATURE
            GuptaNadiCard(
              onExploreTap: () => _showGuptaNadiModal(context, hasProfile),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
