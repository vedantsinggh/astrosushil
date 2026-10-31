import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_required_gate.dart';
import '../../core/auth/feature_access_service.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/astrology/screens/birth_chart_screen.dart';
import '../../features/astrology/screens/astrology_hub_screen.dart';
import '../../features/astrology/screens/vimshottari_dasha_screen.dart';
import '../../features/astrology/screens/matchmaking_screen.dart';
import '../../features/astrology/screens/panchanga_screen.dart';
import '../../features/astrology/screens/planets_screen.dart';
import '../../features/astrology/screens/rashi_bhavishya_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/courses/screens/course_detail_screen.dart';
import '../../features/courses/screens/courses_hub_screen.dart';
import '../../features/jyoti/screens/jyoti_chat_screen.dart';
import '../../features/jyoti/widgets/home_jyoti_card.dart';
import '../../features/jyoti/widgets/jyoti_floating_button.dart';
import '../../features/shop/screens/shop_catalog_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../providers/home_provider.dart';
import '../widgets/business_shortcuts_grid.dart';
import '../widgets/celestial_background_painter.dart';
import '../widgets/daily_panchang_summary_card.dart';
import '../widgets/essential_astrology_shortcuts.dart';
import '../widgets/explore_astrology_card.dart';
import '../widgets/gupta_nadi_card.dart';
import '../widgets/hero_astrology_card.dart';
import '../widgets/home_bottom_navigation.dart';
import '../widgets/home_header.dart';
import '../widgets/quick_insights_row.dart';
import '../widgets/rashi_bhavishya_card.dart';
import '../widgets/sushil_sir_explainer_banner.dart';
import 'consult_screen.dart';
import 'profile_screen.dart';
import 'reports_screen.dart';

/// Main Shell & Home Screen container with Bottom Navigation for Astro Platform
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentTabIndex = ref.watch(homeTabControllerProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SubtleCelestialBackground(
        child: IndexedStack(
          index: currentTabIndex,
          children: const [
            _HomeTabContentView(),
            ReportsScreen(),
            ConsultScreen(),
            ProfileScreen(),
          ],
        ),
      ),
      bottomNavigationBar: HomeBottomNavigation(
        currentIndex: currentTabIndex,
        onTap: (index) {
          ref.read(homeTabControllerProvider.notifier).state = index;
        },
      ),
      floatingActionButton: currentTabIndex == 0
          ? JyotiFloatingButton(
              onTap: () {
                AuthRequiredGate.checkAndProceed(
                  context: context,
                  ref: ref,
                  feature: AppFeature.jyoti,
                  featureTitle: 'Jyoti AI Assistant',
                  onAllowed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const JyotiChatScreen()),
                    );
                  },
                );
              },
            )
          : null,
    );
  }
}

/// Home Tab Content View displaying clear Phase 2 UX visual hierarchy:
/// 1. Compact Branded Header
/// 2. Premium Hero (Dark cosmic navy/indigo, Sushil Sir AI avatar, active birth-profile summary, View Chart CTA)
/// 3. Essential Astrology Shortcuts (Birth Chart, Planets, Dasha, Match Making)
/// 4. Contextual AI Explainer Banner (Sushil Sir AI Guide)
/// 5. Today's Panchanga (Deterministic real data)
/// 6. Personalized Insights (Moon in Sign, Auspicious Time, Avoid Rahu Kaal, Rashi Bhavishya)
/// 7. Explore Astro Sushil (Reports, Consultations, Courses, Shop)
/// 8. Explore Astrology Tools (Grouped progressive disclosure hub)
/// 9. Gupta Nadi Flagship Promotion (Real catalog course data & route)
/// 10. Persistent Jyoti Assistant Entry
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

  void _navigateToAstrologyHub(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AstrologyHubScreen()),
    );
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

  void _navigateToDasha(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const VimshottariDashaScreen()),
    );
  }

  void _navigateToMatchmaking(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MatchmakingScreen()),
    );
  }

  void _navigateToPanchanga(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const PanchangaScreen()),
    );
  }

  void _navigateToRashiBhavishya(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const RashiBhavishyaScreen()),
    );
  }

  void _navigateToCourses(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CoursesHubScreen()),
    );
  }

  void _navigateToGuptaNadiCourse(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const CourseDetailScreen(idOrSlug: 'course-gupt-nadi'),
      ),
    );
  }

  void _navigateToShop(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
    );
  }

  void _navigateToJyoti(BuildContext context, WidgetRef ref) {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.jyoti,
      featureTitle: 'Jyoti AI Assistant',
      onAllowed: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const JyotiChatScreen()),
        );
      },
    );
  }

  void _showProfileSwitchBottomSheet(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final profilesState = ref.read(birthProfilesListNotifierProvider);
    final activeProfile = ref.read(selectedBirthProfileProvider);

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardSurfaceWarm,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.switchProfile,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                      );
                    },
                    icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                    label: Text(l10n.addBirthProfile),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: profilesState.profiles.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final p = profilesState.profiles[index];
                    final isSelected = p.id == activeProfile?.id;

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                      leading: CircleAvatar(
                        backgroundColor: isSelected ? AppColors.primary : AppColors.canvasSecondary,
                        foregroundColor: isSelected ? AppColors.gold : AppColors.primary,
                        child: Text(
                          p.name.isNotEmpty ? p.name[0].toUpperCase() : 'U',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      title: Text(
                        p.name,
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: AppColors.primary,
                        ),
                      ),
                      subtitle: Text(
                        '${p.dateOfBirth} • ${p.placeName.isNotEmpty ? p.placeName : "Vedic Chart"}',
                        style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                      ),
                      trailing: isSelected
                          ? const Icon(Icons.check_circle_rounded, color: AppColors.success)
                          : null,
                      onTap: () {
                        ref.read(selectedBirthProfileIdProvider.notifier).state = p.id;
                        Navigator.of(ctx).pop();
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = ref.watch(selectedBirthProfileProvider);
    final hasProfile = profilesState.profiles.isNotEmpty;
    final chartAsync = ref.watch(activeProfileAstroChartProvider);
    final chart = chartAsync.valueOrNull;
    final dashaAsync = ref.watch(activeProfileVimshottariDashaProvider);
    final dashaTree = dashaAsync.valueOrNull;
    final prediction = ref.watch(dailyRashiBhavishyaProvider);

    String? activeMahadashaName;
    if (dashaTree != null && dashaTree.mahadashas.isNotEmpty) {
      final now = DateTime.now();
      final currentMaha = dashaTree.mahadashas.firstWhere(
        (m) => m.isActive || (now.isAfter(m.startDate) && now.isBefore(m.endDate)),
        orElse: () => dashaTree.mahadashas.first,
      );
      activeMahadashaName = currentMaha.planet;
    }

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. COMPACT BRANDED HEADER (Avatar + Branding + Notification + Language + Account)
            HomeHeader(
              userName: user?.email ?? 'User',
              onProfileTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 3;
              },
            ),

            const SizedBox(height: 12),

            // 2. PREMIUM HERO (Cosmic Navy Gradient + Greeting + Floating Profile Selector + Verified Highlights)
            HeroAstrologyCard(
              hasBirthProfile: hasProfile,
              activeProfile: activeProfile,
              userName: user?.email,
              chart: chart,
              activeMahadasha: activeMahadashaName,
              isLoadingData: chartAsync.isLoading || dashaAsync.isLoading,
              onViewChartTap: () => _navigateToBirthChart(context, hasProfile),
              onChangeProfileTap: () => _showProfileSwitchBottomSheet(context, ref),
            ),

            const SizedBox(height: 20),

            // 3. ESSENTIAL ASTROLOGY SHORTCUTS (Birth Chart, Planets, Dasha, Kundli Matching)
            EssentialAstrologyShortcutsGrid(
              onBirthChartTap: () => _navigateToBirthChart(context, hasProfile),
              onPlanetsTap: () => _navigateToPlanets(context, hasProfile),
              onDashaTap: () => _navigateToDasha(context),
              onMatchmakingTap: () => _navigateToMatchmaking(context),
            ),

            const SizedBox(height: 20),

            // 4. CONTEXTUAL AI EXPLAINER BANNER (Sushil Sir AI Guide)
            SushilSirExplainerBanner(
              activeProfile: activeProfile,
              chart: chart,
            ),

            const SizedBox(height: 20),

            // 5. TODAY'S PANCHANGA REAL-DATA CARD
            DailyPanchangSummaryCard(
              onViewFullPanchang: () => _navigateToPanchanga(context),
            ),

            const SizedBox(height: 20),

            // 6. PERSONALIZED INSIGHTS: QUICK INSIGHTS CAROUSEL
            QuickInsightsRow(
              onSeeAllTap: () => _navigateToAstrologyHub(context),
              chart: chart,
            ),

            const SizedBox(height: 18),

            // 6b. PERSONALIZED INSIGHTS: TODAY'S RASHI BHAVISHYA PREVIEW
            RashiBhavishyaSection(
              preview: prediction,
              onReadTap: () => _navigateToRashiBhavishya(context),
            ),

            const SizedBox(height: 22),

            // 7. EXPLORE ASTRO SUSHIL (2x2: Reports, Consultations, Courses, Shop)
            BusinessShortcutsGrid(
              onReportsTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 1;
              },
              onConsultTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 2;
              },
              onCoursesTap: () => _navigateToCourses(context),
              onShopTap: () => _navigateToShop(context),
            ),

            const SizedBox(height: 22),

            // 8. EXPLORE ALL ASTROLOGY TOOLS (Grouped Progressive Disclosure Directory)
            ExploreAstrologyCard(
              onExploreTap: () => _navigateToAstrologyHub(context),
            ),

            const SizedBox(height: 20),

            // 9. GUPTA NADI FLAGSHIP MASTERCLASS PROMOTION (Real Catalog Course & Route)
            GuptaNadiCard(
              onExploreTap: () {
                AuthRequiredGate.checkAndProceed(
                  context: context,
                  ref: ref,
                  feature: AppFeature.courses,
                  featureTitle: 'Gupta Nadi Masterclass',
                  onAllowed: () => _navigateToGuptaNadiCourse(context),
                );
              },
            ),

            const SizedBox(height: 20),

            // 10. PERSISTENT ASK JYOTI ASSISTANT ENTRY CARD
            HomeJyotiCard(
              onTap: () => _navigateToJyoti(context, ref),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
