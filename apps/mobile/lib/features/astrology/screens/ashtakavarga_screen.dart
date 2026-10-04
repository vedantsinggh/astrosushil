import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/ashtakavarga_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/astrology_tab_bar.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/planet_chip.dart';

/// Screen presenting Vedic Ashtakavarga charts (SAV, BAV, Shodhana & Shodhya Pindas)
/// Evaluated deterministically via Fastify backend /astrology/ashtakavarga
class AshtakavargaScreen extends ConsumerStatefulWidget {
  const AshtakavargaScreen({super.key});

  @override
  ConsumerState<AshtakavargaScreen> createState() => _AshtakavargaScreenState();
}

class _AshtakavargaScreenState extends ConsumerState<AshtakavargaScreen> {
  int _selectedTabIndex = 0;
  String _selectedPlanet = 'SUN';

  static const _tabs = [
    AstrologyTabItem(label: 'Sarvashtakavarga (SAV)', icon: Icons.grid_view_rounded),
    AstrologyTabItem(label: 'Bhinnashtakavarga (BAV)', icon: Icons.auto_awesome_rounded),
    AstrologyTabItem(label: 'Shodhana & Pindas', icon: Icons.tune_rounded),
  ];

  static const _rashiNames = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  static const _rashiSanskrit = [
    'मेष', 'वृषभ', 'मिथुन', 'कर्क',
    'सिंह', 'कन्या', 'तुला', 'वृश्चिक',
    'धनु', 'मकर', 'कुम्भ', 'मीन'
  ];

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Ashtakavarga (अष्टकवर्ग)',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: 'About Ashtakavarga',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Ashtakavarga evaluates 8-contributor benefic bindu distributions across 12 Rashis for all 7 classical grahas.',
                  ),
                  duration: Duration(seconds: 4),
                ),
              );
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Profile Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: ActiveBirthProfileSelector(
                  isDark: false,
                  onProfileChanged: (_) {},
                ),
              ),

              // Tab Bar
              AstrologyTabBar(
                tabs: _tabs,
                selectedIndex: _selectedTabIndex,
                onTabSelected: (index) => setState(() => _selectedTabIndex = index),
              ),

              // Main Content Area
              Expanded(
                child: activeProfile == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: AstrologyEmptyState(
                            title: 'No Active Birth Profile',
                            message: 'Select or create a birth profile to calculate Sarvashtakavarga and Bhinnashtakavarga charts.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                              );
                            },
                          ),
                        ),
                      )
                    : ref.watch(ashtakavargaForProfileProvider(activeProfile)).when(
                          loading: () => const AstrologyLoadingState(
                            message: 'Computing Ashtakavarga matrices, Shodhana & Pindas...',
                          ),
                          error: (err, stack) => AstrologyErrorState(
                            error: err,
                            customMessage: 'Failed to calculate Ashtakavarga',
                            onRetry: () => ref.invalidate(ashtakavargaForProfileProvider(activeProfile)),
                          ),
                          data: (ashtakavarga) => _buildTabContent(context, ashtakavarga),
                        ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(BuildContext context, AshtakavargaResultModel report) {
    switch (_selectedTabIndex) {
      case 0:
        return _buildSarvashtakavargaView(report.sav);
      case 1:
        return _buildBhinnashtakavargaView(report.bav);
      case 2:
        return _buildShodhanaAndPindasView(report);
      default:
        return _buildSarvashtakavargaView(report.sav);
    }
  }

  // ==========================================
  // TAB 1: SARVASHTAKAVARGA (SAV)
  // ==========================================
  Widget _buildSarvashtakavargaView(SarvashtakavargaModel sav) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // Grand Total Hero Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.25),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.stars_rounded, color: AppColors.premiumAccent, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Sarvashtakavarga (SAV) Total',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.premiumAccent,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${sav.grandTotal} Bindus',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Aggregated across all 7 classical planetary charts',
                      style: TextStyle(fontSize: 11, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 12-Sign SAV Grid
        AstrologySectionCard(
          title: 'Sign-Wise SAV Distribution',
          subtitle: 'Scores ≥28 denote supportive, high-vitality signs',
          icon: Icons.grid_3x3_rounded,
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 12,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 0.88,
            ),
            itemBuilder: (ctx, idx) {
              final signIndex = idx + 1;
              final score = sav.getScoreForRashi(signIndex);
              final isFavorable = score >= 28;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                decoration: BoxDecoration(
                  color: isFavorable
                      ? AppColors.success.withValues(alpha: 0.08)
                      : AppColors.lightBackground,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isFavorable
                        ? AppColors.success.withValues(alpha: 0.3)
                        : AppColors.lightBorder,
                  ),
                ),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${_rashiNames[idx]} (${_rashiSanskrit[idx]})',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$score',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isFavorable ? AppColors.success : AppColors.secondary,
                        ),
                      ),
                      Text(
                        isFavorable ? 'High' : 'Moderate',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w500,
                          color: isFavorable ? AppColors.success : AppColors.lightTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 14),

        // SAV Interpretation Summary
        const ExpandableAstrologyCard(
          title: 'SAV Scoring Guidelines',
          subtitle: 'Classical Parashari thresholds for houses and signs',
          icon: Icons.menu_book_rounded,
          initiallyExpanded: false,
          expandedChild: Text(
            '• 30+ Points: Highly auspicious; supports expansive planetary transits and houses.\n'
            '• 28–29 Points: Balanced, steady energetic foundation.\n'
            '• 25–27 Points: Average strength; demands conscious karmic effort.\n'
            '• Under 25 Points: Sensitive sign; challenges manifest during major transits.',
            style: TextStyle(fontSize: 12.5, height: 1.45, color: AppColors.primary),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // TAB 2: BHINNASHTAKAVARGA (BAV)
  // ==========================================
  Widget _buildBhinnashtakavargaView(Map<String, BhinnashtakavargaModel> bavMap) {
    const planets = AshtakavargaResultModel.classicalPlanets;
    final activeBav = bavMap[_selectedPlanet] ?? bavMap.values.firstOrNull;

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // Horizontal Planet Selector
        SizedBox(
          height: 42,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: planets.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (ctx, index) {
              final p = planets[index];
              final isSelected = p == _selectedPlanet;

              return GestureDetector(
                onTap: () => setState(() => _selectedPlanet = p),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : AppColors.lightSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.lightBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      PlanetChip(planetName: p, isCompact: true),
                      const SizedBox(width: 6),
                      Text(
                        p,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 14),

        if (activeBav != null) ...[
          // Planet BAV Hero Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.lightSurface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.lightBorder),
            ),
            child: Row(
              children: [
                PlanetChip(planetName: activeBav.planet, isCompact: false),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${activeBav.planet} BAV Total',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                      Text(
                        '${activeBav.totalPoints} Benefic Bindus',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.secondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 12-Sign BAV Grid
          AstrologySectionCard(
            title: '${activeBav.planet} Sign Distribution',
            subtitle: 'Scores ≥4 denote benefic transit support',
            icon: Icons.grid_view_rounded,
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 12,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.88,
              ),
              itemBuilder: (ctx, idx) {
                final signIndex = idx + 1;
                final score = activeBav.getScoreForRashi(signIndex);
                final isFavorable = score >= 4;

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                  decoration: BoxDecoration(
                    color: isFavorable
                        ? AppColors.secondary.withValues(alpha: 0.08)
                        : AppColors.lightBackground,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isFavorable
                          ? AppColors.secondary.withValues(alpha: 0.3)
                          : AppColors.lightBorder,
                    ),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _rashiNames[idx],
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                          textAlign: TextAlign.center,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$score / 8',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isFavorable ? AppColors.secondary : AppColors.lightTextMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  // ==========================================
  // TAB 3: SHODHANA & SHODHYA PINDAS
  // ==========================================
  Widget _buildShodhanaAndPindasView(AshtakavargaResultModel report) {
    const planets = AshtakavargaResultModel.classicalPlanets;

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        // Shodhya Pindas Table
        AstrologySectionCard(
          title: 'Shodhya Pinda Summary',
          subtitle: 'Pinda Sadhana (Rashi Pinda, Graha Pinda & Shodhya Pinda)',
          icon: Icons.account_balance_rounded,
          child: AstrologyDataTable(
            columns: const [
              AstrologyTableColumn(header: 'Graha', flex: 3),
              AstrologyTableColumn(header: 'Rashi-P', flex: 2, alignment: TextAlign.center),
              AstrologyTableColumn(header: 'Graha-P', flex: 2, alignment: TextAlign.center),
              AstrologyTableColumn(header: 'Shodhya-P', flex: 3, alignment: TextAlign.right),
            ],
            rows: planets.map((p) {
              final pinda = report.pinda[p];
              return [
                PlanetChip(planetName: p, isCompact: true),
                Text(
                  '${pinda?.rashiPinda ?? 0}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  textAlign: TextAlign.center,
                ),
                Text(
                  '${pinda?.grahaPinda ?? 0}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  textAlign: TextAlign.center,
                ),
                Text(
                  '${pinda?.shodhyaPinda ?? 0}',
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.secondary),
                  textAlign: TextAlign.right,
                ),
              ];
            }).toList(),
          ),
        ),

        const SizedBox(height: 14),

        // Shodhana Reductions Table
        AstrologySectionCard(
          title: 'Shodhana (Reductions)',
          subtitle: 'Trikona & Ekadhipatya Shodhana reduced bindus',
          icon: Icons.tune_rounded,
          child: AstrologyDataTable(
            columns: const [
              AstrologyTableColumn(header: 'Graha', flex: 3),
              AstrologyTableColumn(header: 'Trikona Total', flex: 3, alignment: TextAlign.center),
              AstrologyTableColumn(header: 'Ekadhipatya Total', flex: 3, alignment: TextAlign.right),
            ],
            rows: planets.map((p) {
              final shodhana = report.shodhana[p];
              return [
                PlanetChip(planetName: p, isCompact: true),
                Text(
                  '${shodhana?.totalTrikonaPoints ?? 0}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
                Text(
                  '${shodhana?.totalEkadhipatyaPoints ?? 0}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  textAlign: TextAlign.right,
                ),
              ];
            }).toList(),
          ),
        ),
      ],
    );
  }
}
