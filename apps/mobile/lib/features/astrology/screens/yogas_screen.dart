import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/yoga_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_tab_bar.dart';
import '../widgets/planet_chip.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Classical Vedic Yogas evaluated deterministically
/// by packages/astrology-engine and served via Fastify /astrology/yogas
class YogasScreen extends ConsumerStatefulWidget {
  const YogasScreen({super.key});

  @override
  ConsumerState<YogasScreen> createState() => _YogasScreenState();
}

class _YogasScreenState extends ConsumerState<YogasScreen> {
  String _selectedCategory = 'ALL';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  static const _categories = [
    'ALL',
    'RAJA',
    'DHANA',
    'MAHAPURUSHA',
    'CHANDRA',
    'SURYA',
    'NEECHA_BHANGA',
    'PARIVARTANA',
    'VIPARITA',
    'NABHASA',
    'AUSPICIOUS',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AstroAppBar(
        title: 'Classical Vedic Yogas',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.midnightNavy),
            tooltip: 'About Vedic Yogas',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Evaluates classical Parashari Yogas (Mahapurusha, Raja, Dhana, Chandra, etc.) with 100% deterministic rule evidence.',
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
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                child: ActiveBirthProfileSelector(
                  isDark: false,
                  onProfileChanged: (_) {},
                ),
              ),

              // Main Content
              Expanded(
                child: activeProfile == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: AstrologyEmptyState(
                            title: 'No Active Birth Profile',
                            message: 'Select or create a birth profile to evaluate planetary yoga combinations.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const CreateBirthProfileScreen(),
                                ),
                              );
                            },
                          ),
                        ),
                      )
                    : _buildYogasBody(context, activeProfile),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildYogasBody(BuildContext context, BirthProfileModel profile) {
    final query = YogaEvaluationQuery(profile: profile, varga: 'D1');
    final yogasAsync = ref.watch(yogasForProfileProvider(query));

    return yogasAsync.when(
      loading: () => const AstrologyLoadingState(
        message: 'Evaluating classical Vedic Yoga combinations...',
      ),
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: AstrologyErrorState(
            error: error,
            customMessage: 'Failed to evaluate Yogas. Tap to retry.',
            onRetry: () => ref.refresh(yogasForProfileProvider(query)),
          ),
        ),
      ),
      data: (report) => RefreshIndicator(
        onRefresh: () async => ref.refresh(yogasForProfileProvider(query)),
        child: Column(
          children: [
            // Educational Guidance Card
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: AstrologyExplanationCard(
                title: context.l10n.explainYogasTitle,
                whatIsText: context.l10n.explainYogasWhatIs,
                howToReadText: context.l10n.explainYogasHowToRead,
              ),
            ),

            // Search & Category Filters
            _buildFilterHeader(report),

            // SUSHIL SIR CONTEXTUAL EXPLAINER ENTRYPOINT
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: SushilExplainerButton(
                contextData: _buildYogaExplanationContext(profile, report),
                label: 'Let Sushil Sir explain these Yogas',
                isCompact: false,
              ),
            ),

            // Yoga Cards List
            Expanded(
              child: _buildYogaList(report),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterHeader(YogaEvaluationReportModel report) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        border: Border(bottom: BorderSide(color: AppColors.cardBorder)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Bar
          TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
            decoration: InputDecoration(
              hintText: 'Search by yoga name or planet (e.g. Gajakesari, Jupiter)...',
              hintStyle: const TextStyle(fontSize: 12.5, color: AppColors.textMuted),
              prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.midnightNavy),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.textMuted),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: AppColors.cardSurfaceParchment,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.cardBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.cardBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.gold, width: 1.5),
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Horizontal Category Filter Pills
          AstrologyTabBar(
            isScrollable: true,
            selectedIndex: _categories.indexOf(_selectedCategory),
            onTabSelected: (idx) {
              if (idx >= 0 && idx < _categories.length) {
                setState(() => _selectedCategory = _categories[idx]);
              }
            },
            tabs: _categories.map((cat) {
              return AstrologyTabItem(
                label: _getCategoryLabel(cat),
                icon: _getCategoryIcon(cat),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  String _getCategoryLabel(String cat) {
    switch (cat) {
      case 'ALL': return 'All Yogas';
      case 'RAJA': return 'Raja';
      case 'DHANA': return 'Dhana';
      case 'MAHAPURUSHA': return 'Mahapurusha';
      case 'CHANDRA': return 'Chandra';
      case 'SURYA': return 'Surya';
      case 'NEECHA_BHANGA': return 'Neechabhanga';
      case 'PARIVARTANA': return 'Parivartana';
      case 'VIPARITA': return 'Viparita';
      case 'NABHASA': return 'Nabhasa';
      case 'AUSPICIOUS': return 'Auspicious';
      default: return cat;
    }
  }

  IconData _getCategoryIcon(String cat) {
    switch (cat) {
      case 'ALL': return Icons.all_inclusive_rounded;
      case 'RAJA': return Icons.workspace_premium_rounded;
      case 'DHANA': return Icons.account_balance_wallet_rounded;
      case 'MAHAPURUSHA': return Icons.stars_rounded;
      case 'CHANDRA': return Icons.nightlight_round;
      case 'SURYA': return Icons.wb_sunny_rounded;
      case 'NEECHA_BHANGA': return Icons.trending_up_rounded;
      case 'PARIVARTANA': return Icons.swap_horiz_rounded;
      case 'VIPARITA': return Icons.shield_rounded;
      case 'NABHASA': return Icons.cloud_outlined;
      case 'AUSPICIOUS': return Icons.auto_awesome_rounded;
      default: return Icons.category_rounded;
    }
  }

  Widget _buildYogaList(YogaEvaluationReportModel report) {
    // Filter by category and search
    final filtered = report.detectedYogas.where((y) {
      if (_selectedCategory != 'ALL' && y.category != _selectedCategory) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final matchesName = y.canonicalName.toLowerCase().contains(_searchQuery) ||
            y.sanskritName.toLowerCase().contains(_searchQuery);
        final matchesPlanet = y.planetNames.any((p) => p.toLowerCase().contains(_searchQuery));
        final matchesCategory = y.formattedCategory.toLowerCase().contains(_searchQuery);
        return matchesName || matchesPlanet || matchesCategory;
      }
      return true;
    }).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.search_off_rounded, size: 48, color: AppColors.textMuted.withValues(alpha: 0.5)),
              const SizedBox(height: 12),
              Text(
                _searchQuery.isNotEmpty
                    ? 'No yogas matching "$_searchQuery"'
                    : 'No ${_getCategoryLabel(_selectedCategory)} formed in this chart',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textDark,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              const Text(
                'Only combinations with verified astronomical criteria are displayed.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: filtered.length + 1,
      itemBuilder: (ctx, index) {
        if (index == 0) {
          // Summary Header
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${filtered.length} Formed ${filtered.length == 1 ? "Yoga" : "Yogas"} Detected',
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurfaceWarm,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Text(
                    '${report.totalEvaluated} Total Evaluated',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        final yoga = filtered[index - 1];
        return _YogaCard(yoga: yoga);
      },
    );
  }

  ExplanationContext _buildYogaExplanationContext(
    BirthProfileModel profile,
    YogaEvaluationReportModel report,
  ) {
    return ExplanationContext(
      feature: 'yogas',
      screenTitle: 'Classical Vedic Yogas',
      purpose: 'Explain active yoga combinations, auspicious blessings, and life impacts in simple terms',
      astrologyData: {
        'totalEvaluated': report.totalEvaluated,
        'detectedCount': report.detectedYogas.length,
        'detectedYogas': report.detectedYogas
            .map((y) => {
                  'name': y.canonicalName,
                  'sanskritName': y.sanskritName,
                  'category': y.formattedCategory,
                  'planets': y.planetNames,
                  'houses': y.houseNumbers,
                })
            .toList(),
      },
      importantValues: {
        'activeYogaCount': report.detectedYogas.length,
        'topYogas': report.detectedYogas.take(3).map((y) => y.canonicalName).toList(),
      },
      userProfileContext: {
        'name': profile.name,
      },
    );
  }
}

/// Expandable Yoga Card displaying canonical info and structured deterministic evidence
class _YogaCard extends StatefulWidget {
  final YogaResultModel yoga;

  const _YogaCard({required this.yoga});

  @override
  State<_YogaCard> createState() => _YogaCardState();
}

class _YogaCardState extends State<_YogaCard> {
  bool _isExpanded = false;

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'MAHAPURUSHA': return Colors.purple.shade700;
      case 'RAJA': return const Color(0xFFD4AF37); // Gold
      case 'DHANA': return Colors.teal.shade700;
      case 'CHANDRA': return Colors.indigo.shade600;
      case 'SURYA': return Colors.deepOrange.shade700;
      case 'NEECHA_BHANGA': return Colors.green.shade700;
      case 'PARIVARTANA': return Colors.blue.shade700;
      case 'VIPARITA': return Colors.brown.shade600;
      default: return AppColors.midnightNavy;
    }
  }

  @override
  Widget build(BuildContext context) {
    final y = widget.yoga;
    final catColor = _getCategoryColor(y.category);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _isExpanded ? AppColors.gold : AppColors.cardBorder,
          width: _isExpanded ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.cardShadowWarm,
            blurRadius: _isExpanded ? 10 : 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            // Top Clickable Header
            InkWell(
              onTap: () => setState(() => _isExpanded = !_isExpanded),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Category Badge & Formed Indicator
                    Row(
                      children: [
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: catColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: catColor.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              y.formattedCategory.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: catColor,
                                letterSpacing: 0.3,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1B5E20).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: const Color(0xFF2E7D32).withValues(alpha: 0.3)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF2E7D32)),
                              SizedBox(width: 4),
                              Text(
                                'FORMED',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2E7D32),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 8),

                    // Yoga Title & Sanskrit Name
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                y.canonicalName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              if (y.sanskritName.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  y.sanskritName,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.deepIndigo,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Icon(
                          _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                          color: AppColors.midnightNavy,
                          size: 24,
                        ),
                      ],
                    ),

                    const SizedBox(height: 8),

                    // Involved Planets Chips
                    if (y.planetNames.isNotEmpty)
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: y.planetNames.map((p) {
                          return PlanetChip(
                            planetName: p,
                            isCompact: true,
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
            ),

            // Expanded Deterministic Evidence Details
            if (_isExpanded) ...[
              const Divider(height: 1, color: AppColors.cardBorder),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                color: AppColors.cardSurfaceParchment,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. VERIFICATION CONDITIONS CHECKLIST
                    if (y.evidence.conditions.isNotEmpty) ...[
                      const Row(
                        children: [
                          Icon(Icons.fact_check_outlined, size: 15, color: AppColors.midnightNavy),
                          SizedBox(width: 6),
                          Text(
                            'Rule Verification Evidence',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ...y.evidence.conditions.map((cond) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.cardSurfaceWarm,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                cond.satisfied ? Icons.check_circle_rounded : Icons.cancel_rounded,
                                size: 16,
                                color: cond.satisfied ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cond.description,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textDark,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Observed: ${cond.observed} • Expected: ${cond.expected}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 10),
                    ],

                    // 2. INVOLVED PLANETARY PLACEMENTS TABLE
                    if (y.evidence.involvedPlanets.isNotEmpty) ...[
                      const Row(
                        children: [
                          Icon(Icons.public_rounded, size: 15, color: AppColors.midnightNavy),
                          SizedBox(width: 6),
                          Text(
                            'Planetary Coordinates',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      AstrologyDataTable(
                        columns: const [
                          AstrologyTableColumn(header: 'Graha', flex: 3),
                          AstrologyTableColumn(header: 'Sign', flex: 3),
                          AstrologyTableColumn(header: 'House', flex: 2),
                          AstrologyTableColumn(header: 'Dignity', flex: 3),
                        ],
                        rows: y.evidence.involvedPlanets.map((p) {
                          return [
                            PlanetChip(planetName: p.planet, isCompact: true),
                            Text(
                              p.rashiName,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: AppColors.textDark),
                            ),
                            Text(
                              'H-${p.house}',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppColors.deepIndigo),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                p.dignity,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.midnightNavy),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ];
                        }).toList(),
                      ),
                      const SizedBox(height: 10),
                    ],

                    // 3. INVOLVED HOUSES & RELATIONSHIPS
                    if (y.evidence.relationships.isNotEmpty) ...[
                      const Row(
                        children: [
                          Icon(Icons.hub_outlined, size: 15, color: AppColors.midnightNavy),
                          SizedBox(width: 6),
                          Text(
                            'Astronomical Relationships',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ...y.evidence.relationships.map((rel) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Text(
                            '• ${rel.description}',
                            style: const TextStyle(
                              fontSize: 12,
                              height: 1.4,
                              color: AppColors.textDark,
                            ),
                          ),
                        );
                      }),
                    ],

                    // Convention footnote
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.verified_outlined, size: 13, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          'Evaluated under ${y.convention} Classical Methodology in ${y.varga}',
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: AppColors.textMuted,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

