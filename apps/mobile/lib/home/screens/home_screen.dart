import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_required_gate.dart';
import '../../core/auth/feature_access_service.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/screens/birth_chart_screen.dart';
import '../../features/astrology/screens/astrology_hub_screen.dart';
import '../../features/astrology/screens/divisional_charts_screen.dart';
import '../../features/astrology/screens/vimshottari_dasha_screen.dart';
import '../../features/astrology/screens/matchmaking_screen.dart';
import '../../features/astrology/screens/panchanga_screen.dart';
import '../../features/astrology/screens/gochara_screen.dart';
import '../../features/astrology/screens/yogas_screen.dart';
import '../../features/astrology/screens/jaimini_screen.dart';
import '../../features/astrology/screens/kp_astrology_screen.dart';
import '../../features/astrology/screens/varshaphala_screen.dart';
import '../../features/astrology/screens/prashna_screen.dart';
import '../../features/astrology/screens/planets_screen.dart';
import '../../features/astrology/screens/rashi_bhavishya_screen.dart';
import '../../features/astrology/screens/vastu_screen.dart';
import '../../features/astrology/screens/ashtakavarga_screen.dart';
import '../../features/astrology/screens/bhava_bala_screen.dart';
import '../../features/astrology/screens/shadbala_screen.dart';
import '../../features/astrology/screens/special_points_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/courses/screens/courses_hub_screen.dart';
import '../../features/jyoti/screens/jyoti_chat_screen.dart';
import '../../features/jyoti/widgets/home_jyoti_card.dart';
import '../../features/jyoti/widgets/jyoti_floating_button.dart';
import '../../shared/theme/app_colors.dart';
import '../providers/home_provider.dart';
import '../widgets/celestial_background_painter.dart';
import '../widgets/active_birth_profile_header_card.dart';
import '../widgets/active_dasha_summary_card.dart';
import '../widgets/daily_panchang_summary_card.dart';
import '../widgets/essential_astrology_shortcuts.dart';
import '../widgets/explore_astrology_card.dart';
import '../widgets/gupta_nadi_card.dart';
import '../widgets/hero_astrology_card.dart';
import '../widgets/home_bottom_navigation.dart';
import '../widgets/home_header.dart';
import '../widgets/rashi_bhavishya_card.dart';
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
      backgroundColor: AppColors.lightBackground,
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

  void _navigateToDivisionalCharts(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const DivisionalChartsScreen()),
    );
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

  void _navigateToGochara(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const GocharaScreen()),
    );
  }

  void _navigateToYogas(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const YogasScreen()),
    );
  }

  void _navigateToJaimini(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const JaiminiScreen()),
    );
  }

  void _navigateToKP(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const KPAstrologyScreen()),
    );
  }

  void _navigateToVarshaphala(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const VarshaphalaScreen()),
    );
  }

  void _navigateToPrashna(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const PrashnaScreen()),
    );
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

  void _navigateToShadbala(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ShadbalaScreen()),
    );
  }

  void _navigateToBhavaBala(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const BhavaBalaScreen()),
    );
  }

  void _navigateToAshtakavarga(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AshtakavargaScreen()),
    );
  }

  void _navigateToSpecialPoints(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SpecialPointsScreen()),
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
                  color: Colors.white.withValues(alpha: 0.3),
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
                    color: AppColors.premiumAccent.withValues(alpha: 0.2),
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
                color: Colors.white.withValues(alpha: 0.85),
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

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 10.0),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. TOP HEADER ("Hello, [User Name]") + Language Quick Switcher
            HomeHeader(
              userName: user?.email ?? 'User',
              onProfileTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 3;
              },
            ),

            const SizedBox(height: 14),

            // 2. ACTIVE BIRTH PROFILE SELECTOR (Crucial for multi-profile awareness)
            ActiveBirthProfileHeaderCard(
              activeProfile: ref.watch(selectedBirthProfileProvider),
              profiles: profilesState.profiles,
              onSelectProfile: (id) {
                ref.read(selectedBirthProfileIdProvider.notifier).state = id;
              },
              onAddProfile: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
            ),

            const SizedBox(height: 16),

            // 3. HERO ASTROLOGY CARD (Janma Kundli primary action)
            HeroAstrologyCard(
              hasBirthProfile: hasProfile,
              onViewChartTap: () => _navigateToBirthChart(context, hasProfile),
            ),

            const SizedBox(height: 16),

            // 4. DAILY PANCHANG REAL-DATA SUMMARY CARD
            DailyPanchangSummaryCard(
              onViewFullPanchang: () => _navigateToPanchanga(context),
            ),

            const SizedBox(height: 16),

            // 5. ACTIVE DASHA SUMMARY (When profile exists, shows real Mahadasha)
            ActiveDashaSummaryCard(
              onViewDashaTree: () => _navigateToDasha(context),
            ),

            const SizedBox(height: 20),

            // 6. ESSENTIAL ASTROLOGY SHORTCUTS (Primary 6 core journeys)
            EssentialAstrologyShortcutsGrid(
              onBirthChartTap: () => _navigateToBirthChart(context, hasProfile),
              onPlanetsTap: () => _navigateToPlanets(context, hasProfile),
              onDashaTap: () => _navigateToDasha(context),
              onMatchmakingTap: () => _navigateToMatchmaking(context),
              onReportsTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 1;
              },
              onConsultTap: () {
                ref.read(homeTabControllerProvider.notifier).state = 2;
              },
            ),

            const SizedBox(height: 20),

            // 7. EXPLORE ALL ASTROLOGY TOOLS (Clean Progressive Disclosure)
            ExploreAstrologyCard(
              onExploreTap: () => _navigateToAstrologyHub(context),
            ),

            const SizedBox(height: 22),

            // 8. TODAY'S RASHI BHAVISHYA PREVIEW
            RashiBhavishyaSection(
              preview: prediction,
              onReadTap: () => _navigateToRashiBhavishya(context),
            ),

            const SizedBox(height: 22),

            // 9. GUPTA NADI FLAGSHIP FEATURE
            GuptaNadiCard(
              onExploreTap: () {
                AuthRequiredGate.checkAndProceed(
                  context: context,
                  ref: ref,
                  feature: AppFeature.guptaNadi,
                  featureTitle: 'Gupta Nadi Analysis',
                  onAllowed: () => _showGuptaNadiModal(context, hasProfile),
                );
              },
            ),

            const SizedBox(height: 20),

            // 9.5 VEDIC COURSES & MASTERCLASSES
            _CoursesHomeCard(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CoursesHubScreen()),
                );
              },
            ),

            const SizedBox(height: 20),

            // 10. ASK JYOTI ASSISTANT ENTRY CARD
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

class _CoursesHomeCard extends StatelessWidget {
  final VoidCallback onTap;

  const _CoursesHomeCard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.school_rounded,
                    color: AppColors.premiumAccent,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              l10n.coursesScreenTitle,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.lightTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.premiumAccent.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'NEW',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.coursesSubtitle,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.lightTextSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: AppColors.lightTextMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

