import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/auth/auth_required_gate.dart';
import '../../core/auth/feature_access_service.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/models/astro_chart_model.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/astrology/screens/birth_chart_screen.dart';
import '../../features/astrology/screens/astrology_hub_screen.dart';
import '../../features/astrology/screens/vimshottari_dasha_screen.dart';
import '../../features/astrology/screens/matchmaking_screen.dart';
import '../../features/astrology/screens/panchanga_screen.dart';
import '../../features/astrology/screens/planets_screen.dart';
import '../../features/astrology/screens/rashi_bhavishya_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/courses/screens/course_detail_screen.dart';
import '../../features/courses/screens/courses_hub_screen.dart';
import '../../features/home_content/widgets/home_content_sections.dart';
import '../../features/jyoti/screens/jyoti_chat_screen.dart';
import '../../features/shop/screens/shop_catalog_screen.dart';
import '../../features/sushil_explainer/models/explanation_context.dart';
import '../../features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import '../../shared/widgets/astro_design_system.dart';
import '../providers/home_provider.dart';
import '../widgets/celestial_background_painter.dart';
import '../widgets/home_bottom_navigation.dart';
import '../widgets/home_greeting.dart';
import '../widgets/home_header.dart';
import '../widgets/home_service_grid.dart';
import '../widgets/home_today_cards.dart';
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
      // iOS: content scrolls under the frosted tab bar (each tab pads its
      // end by MediaQuery's bottom padding). Android: solid M3 bar.
      extendBody: AstroPlatform.isCupertino(context),
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
    );
  }
}

/// Home tab, kept deliberately simple for users of all ages:
/// 1. Brand bar (notifications, language, account)
/// 2. Greeting + active birth profile ("Change" opens the profile switcher)
/// 3. One highlight card: today's horoscope for the Moon sign
/// 4. Slim Today's Panchang card
/// 5. "Astrology" grid of large labelled tiles + "All tools" link
/// 6. Featured content (owner decision 2026-11-27): consultations, reports,
///    shop, celebrity videos, YouTube, testimonials, blog
/// 7. "Services" grid (Ask Jyoti, Sushil Sir explainer, Consult, Reports,
///    Courses, Gupta Nadi, Shop)
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

    showAstroSheet<void>(
      context: context,
      title: l10n.switchProfile,
      builder: (ctx) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          AstroGroupedSection(
            children: [
              for (final p in profilesState.profiles)
                AstroListRow(
                  leading: _ProfileInitial(name: p.name, selected: p.id == activeProfile?.id),
                  title: p.name,
                  subtitle: '${p.dateOfBirth} • ${p.placeName.isNotEmpty ? p.placeName : "Vedic Chart"}',
                  trailing: p.id == activeProfile?.id
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.successText)
                      : null,
                  onTap: () {
                    ref.read(selectedBirthProfileIdProvider.notifier).state = p.id;
                    Navigator.of(ctx).pop();
                  },
                ),
            ],
          ),
          const SizedBox(height: 16),
          AstroGroupedSection(
            children: [
              AstroListRow(
                icon: Icons.add_rounded,
                tint: AstroTint.amber,
                title: l10n.addBirthProfile,
                titleColor: AppColors.accent,
                onTap: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _openSushilExplainer(BuildContext context, WidgetRef ref, BirthProfileModel? activeProfile, AstroChartModel? chart) {
    final locale = ref.read(localeProvider);
    final hasProfile = activeProfile != null;

    final contextData = ExplanationContext(
      feature: 'home_dashboard',
      screenTitle: 'Home Screen',
      purpose: hasProfile
          ? 'Explaining key patterns, lagna, and current planetary alignments from Janma Kundli'
          : 'Introducing Vedic astrology concepts and guiding the user to create their birth profile',
      mode: 'standard',
      language: locale.languageCode == 'hi' ? 'hi' : 'en',
      birthProfileId: activeProfile?.id,
      astrologyData: {
        'hasProfile': hasProfile,
        if (activeProfile != null) 'profileName': activeProfile.name,
        if (activeProfile != null) 'dateOfBirth': activeProfile.dateOfBirth,
        if (chart?.ascendant != null) 'ascendant': chart!.ascendant!.rashiName,
        if (chart != null) 'planetsCount': chart.planets.length,
      },
      importantValues: {
        if (chart?.ascendant != null) 'lagna': chart!.ascendant!.rashiName,
        if (activeProfile != null) 'location': activeProfile.placeName,
      },
    );

    SushilExplainerSheet.show(
      context,
      explanationContext: contextData,
      initialPoseAsset: AppAssets.sushilExplainingChart,
    );
  }

  void _openGuptaNadi(BuildContext context, WidgetRef ref) {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.courses,
      featureTitle: 'Gupta Nadi Masterclass',
      onAllowed: () => _navigateToGuptaNadiCourse(context),
    );
  }

  void _createProfile(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
    );
  }

  void _setTab(WidgetRef ref, int index) {
    ref.read(homeTabControllerProvider.notifier).state = index;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = ref.watch(selectedBirthProfileProvider);
    final hasProfile = profilesState.profiles.isNotEmpty;
    final chart = ref.watch(activeProfileAstroChartProvider).valueOrNull;
    final prediction = ref.watch(homeRashiPreviewProvider);

    final fullName = user?.fullName?.trim() ?? '';
    final email = user?.email ?? '';
    final displayName = fullName.isNotEmpty
        ? fullName.split(' ').first
        : (email.contains('@') ? email.split('@').first : email);

    final astrologyItems = <HomeServiceItem>[
      HomeServiceItem(
        id: 'kundli',
        tint: AstroTint.indigo,
        label: l10n.homeTileKundli,
        icon: Icons.grid_view_rounded,
        onTap: () => _navigateToBirthChart(context, hasProfile),
      ),
      HomeServiceItem(
        id: 'horoscope',
        tint: AstroTint.amber,
        label: l10n.homeTileHoroscope,
        icon: Icons.wb_sunny_outlined,
        onTap: () => _navigateToRashiBhavishya(context),
      ),
      HomeServiceItem(
        id: 'panchang',
        tint: AstroTint.coral,
        label: l10n.homeTilePanchang,
        icon: Icons.calendar_month_rounded,
        onTap: () => _navigateToPanchanga(context),
      ),
      HomeServiceItem(
        id: 'matching',
        tint: AstroTint.rose,
        label: l10n.homeTileMatching,
        icon: Icons.favorite_border_rounded,
        onTap: () => _navigateToMatchmaking(context),
      ),
      HomeServiceItem(
        id: 'planets',
        tint: AstroTint.sky,
        label: l10n.homeTilePlanets,
        icon: Icons.public_rounded,
        onTap: () => _navigateToPlanets(context, hasProfile),
      ),
      HomeServiceItem(
        id: 'dasha',
        tint: AstroTint.violet,
        label: l10n.homeTileDasha,
        icon: Icons.timeline_rounded,
        onTap: () => _navigateToDasha(context),
      ),
    ];

    final serviceItems = <HomeServiceItem>[
      HomeServiceItem(
        id: 'ask-jyoti',
        tint: AstroTint.violet,
        label: l10n.homeTileAskJyoti,
        icon: Icons.chat_bubble_outline_rounded,
        onTap: () => _navigateToJyoti(context, ref),
      ),
      HomeServiceItem(
        id: 'explain-chart',
        tint: AstroTint.amber,
        label: l10n.homeTileExplainChart,
        icon: Icons.record_voice_over_outlined,
        imageAsset: AppAssets.sushilAvatar,
        onTap: () => _openSushilExplainer(context, ref, activeProfile, chart),
      ),
      HomeServiceItem(
        id: 'consult',
        tint: AstroTint.sage,
        label: l10n.navConsult,
        icon: Icons.phone_in_talk_outlined,
        onTap: () => _setTab(ref, 2),
      ),
      HomeServiceItem(
        id: 'reports',
        tint: AstroTint.sky,
        label: l10n.navReports,
        icon: Icons.description_outlined,
        onTap: () => _setTab(ref, 1),
      ),
      HomeServiceItem(
        id: 'courses',
        tint: AstroTint.indigo,
        label: l10n.homeTileCourses,
        icon: Icons.school_outlined,
        onTap: () => _navigateToCourses(context),
      ),
      HomeServiceItem(
        id: 'gupta-nadi',
        tint: AstroTint.amber,
        label: l10n.homeTileGuptaNadi,
        icon: Icons.menu_book_outlined,
        onTap: () => _openGuptaNadi(context, ref),
      ),
      HomeServiceItem(
        id: 'shop',
        tint: AstroTint.coral,
        label: l10n.homeTileShop,
        icon: Icons.shopping_bag_outlined,
        onTap: () => _navigateToShop(context),
      ),
    ];

    final gridLabels = [...astrologyItems, ...serviceItems].map((i) => i.label).toList();

    final greeting = displayName.isNotEmpty ? '${l10n.welcomeGuest}, $displayName' : l10n.welcomeGuest;

    return CustomScrollView(
      slivers: [
        // 1. Large-title greeting with the brand mark and quick actions.
        AstroSliverNavBar(
          title: greeting,
          subtitle: _todayLabel(context),
          showBack: false,
          leading: const HomeBrandMark(),
          actions: HomeHeaderActions.build(
            context,
            userName: email.isNotEmpty ? email : 'User',
            onProfileTap: () => _setTab(ref, 3),
          ),
        ),
        AstroSliverContent(
          top: 8,
          bottom: 32 + MediaQuery.paddingOf(context).bottom,
          // A box column (not a lazy list) keeps the whole home tab built,
          // so semantics and keyboard/screen-reader traversal see every tile.
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
              // 2. Active birth profile ("Change" opens the switcher).
              HomeGreeting(
                displayName: displayName,
                activeProfile: activeProfile,
                onChangeProfileTap: () => _showProfileSwitchBottomSheet(context, ref),
              ),
              if (activeProfile != null) const SizedBox(height: 16),

              // 3. The one hero: today's horoscope for the Moon sign.
              HomeHoroscopeCard(
                preview: prediction,
                hasProfile: hasProfile,
                onReadTap: () => _navigateToRashiBhavishya(context),
                onCreateProfileTap: () => _createProfile(context),
                onRetryTap: () => ref.invalidate(homeRashiPreviewProvider),
              ),
              const SizedBox(height: 14),

              // 4. Today's Panchang (slim).
              HomePanchangCard(onTap: () => _navigateToPanchanga(context)),
              const SizedBox(height: 32),

              // 5. Astrology tools grid + link to every tool.
              HomeSectionTitle(l10n.homeSectionAstrology),
              const SizedBox(height: 12),
              HomeServiceGrid(items: astrologyItems, sizingLabels: gridLabels),
              const SizedBox(height: 12),
              HomeLinkRow(
                key: const ValueKey('home-service-all-tools'),
                label: l10n.exploreAllTools,
                icon: Icons.apps_rounded,
                onTap: () => _navigateToAstrologyHub(context),
              ),
              const SizedBox(height: 32),

              // 6. Featured consultations, reports and shop, then videos,
              //    testimonials and blog (each hidden when empty).
              const HomeContentSections(),

              // 7. Guidance, learning and shop.
              HomeSectionTitle(l10n.homeSectionServices),
              const SizedBox(height: 12),
              HomeServiceGrid(items: serviceItems, sizingLabels: gridLabels),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// "Friday, November 20" in the app language (falls back to the medium
  /// Material date if the locale has no intl data).
  String _todayLabel(BuildContext context) {
    final now = DateTime.now();
    try {
      return DateFormat.MMMMEEEEd(Localizations.localeOf(context).toLanguageTag()).format(now);
    } catch (_) {
      return MaterialLocalizations.of(context).formatMediumDate(now);
    }
  }
}

/// Initial avatar for the profile switcher rows.
class _ProfileInitial extends StatelessWidget {
  final String name;
  final bool selected;

  const _ProfileInitial({required this.name, required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: AstroMetrics.iconSquare + 4,
      height: AstroMetrics.iconSquare + 4,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: selected ? AppGradients.heroNavy : null,
        color: selected ? null : AstroTint.navy.background,
      ),
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : 'U',
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 16,
          color: selected ? AppColors.gold : AppColors.primary,
        ),
      ),
    );
  }
}
