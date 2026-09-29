import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';

/// Quick Access and Vedic Systems explorer on the Home Screen.
/// Provides categorized, 1-tap access to all 17 classical Parashari, Jaimini, Tajika & KP systems.
class QuickAccessSection extends StatefulWidget {
  final VoidCallback onKundliTap;
  final VoidCallback onPlanetsTap;
  final VoidCallback onPredictionTap;
  final VoidCallback onVastuTap;
  final VoidCallback? onDivisionalChartsTap;
  final VoidCallback? onDashaTap;
  final VoidCallback? onMatchmakingTap;
  final VoidCallback? onPanchangaTap;
  final VoidCallback? onGocharaTap;
  final VoidCallback? onYogasTap;
  final VoidCallback? onJaiminiTap;
  final VoidCallback? onKPTap;
  final VoidCallback? onVarshaphalaTap;
  final VoidCallback? onPrashnaTap;
  final VoidCallback? onSeeAllTap;

  const QuickAccessSection({
    super.key,
    required this.onKundliTap,
    required this.onPlanetsTap,
    required this.onPredictionTap,
    required this.onVastuTap,
    this.onDivisionalChartsTap,
    this.onDashaTap,
    this.onMatchmakingTap,
    this.onPanchangaTap,
    this.onGocharaTap,
    this.onYogasTap,
    this.onJaiminiTap,
    this.onKPTap,
    this.onVarshaphalaTap,
    this.onPrashnaTap,
    this.onSeeAllTap,
  });

  @override
  State<QuickAccessSection> createState() => _QuickAccessSectionState();
}

class _QuickAccessSectionState extends State<QuickAccessSection> {
  int _selectedCategoryIndex = 0; // 0 = All, 1 = Charts, 2 = Timing, 3 = Matchmaking, 4 = Advanced

  @override
  Widget build(BuildContext context) {
    final allItems = _buildAllItems();
    final displayedItems = _filterItems(allItems);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. SECTION HEADER
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Access',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Explore classical Vedic astrology tools',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: AppColors.lightTextSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: widget.onSeeAllTap ?? () {},
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.18),
                      width: 0.8,
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'See All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.primary),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // 2. CATEGORY PILL FILTER BAR
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              _buildFilterPill('All Tools', 0),
              _buildFilterPill('Charts & Kundli', 1),
              _buildFilterPill('Timing & Dashas', 2),
              _buildFilterPill('Matchmaking', 3),
              _buildFilterPill('Advanced', 4),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 3. RESPONSIVE VEDIC SYSTEMS GRID
        LayoutBuilder(
          builder: (context, constraints) {
            final screenWidth = constraints.maxWidth;
            final isSmall = screenWidth < 360;
            final crossAxisCount = isSmall ? 2 : 2;

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayedItems.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: isSmall ? 1.35 : 1.45,
              ),
              itemBuilder: (context, index) {
                final item = displayedItems[index];
                return _QuickAccessCard(item: item);
              },
            );
          },
        ),
      ],
    );
  }

  Widget _buildFilterPill(String label, int index) {
    final isSelected = _selectedCategoryIndex == index;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: InkWell(
        onTap: () => setState(() => _selectedCategoryIndex = index),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.lightBorder,
              width: 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }

  List<_QuickAccessItem> _filterItems(List<_QuickAccessItem> all) {
    switch (_selectedCategoryIndex) {
      case 1:
        return all.where((i) => i.category == 'charts').toList();
      case 2:
        return all.where((i) => i.category == 'timing').toList();
      case 3:
        return all.where((i) => i.category == 'matchmaking').toList();
      case 4:
        return all.where((i) => i.category == 'advanced').toList();
      case 0:
      default:
        return all;
    }
  }

  List<_QuickAccessItem> _buildAllItems() {
    return [
      // 1. Birth Chart (Kundli)
      _QuickAccessItem(
        title: 'Birth Chart',
        subtitle: 'Your Kundli',
        badge: 'CORE',
        icon: Icons.auto_awesome_rounded,
        iconBgColor: const Color(0xFFEAE8F4),
        iconColor: AppColors.secondary,
        category: 'charts',
        onTap: widget.onKundliTap,
      ),

      // 2. Divisional Charts (Vargas D1-D60)
      _QuickAccessItem(
        title: 'Divisional Charts',
        subtitle: 'D1–D60 Vargas (Navamsha, etc.)',
        badge: 'D1–D60',
        icon: Icons.pie_chart_outline_rounded,
        iconBgColor: const Color(0xFFE0F2FE),
        iconColor: const Color(0xFF0284C7),
        category: 'charts',
        onTap: widget.onDivisionalChartsTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 3. Vimshottari Dasha
      _QuickAccessItem(
        title: 'Vimshottari Dasha',
        subtitle: '120-Yr planetary timeline',
        badge: '120 YRS',
        icon: Icons.timeline_rounded,
        iconBgColor: const Color(0xFFFEF3C7),
        iconColor: const Color(0xFFD97706),
        category: 'timing',
        onTap: widget.onDashaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 4. Kundli Matchmaking (Guna Milan)
      _QuickAccessItem(
        title: 'Matchmaking',
        subtitle: '36-Pt Guna Milan & Manglik',
        badge: '36 PTS',
        icon: Icons.favorite_rounded,
        iconBgColor: const Color(0xFFFCE7F3),
        iconColor: const Color(0xFFDB2777),
        category: 'matchmaking',
        onTap: widget.onMatchmakingTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 5. Daily Panchanga
      _QuickAccessItem(
        title: 'Daily Panchanga',
        subtitle: 'Tithi, Nakshatra & Muhurta',
        badge: 'LIVE',
        icon: Icons.calendar_month_rounded,
        iconBgColor: const Color(0xFFDCFCE7),
        iconColor: const Color(0xFF16A34A),
        category: 'timing',
        onTap: widget.onPanchangaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 6. Planets
      _QuickAccessItem(
        title: 'Planets',
        subtitle: 'Planetary positions',
        badge: 'LIVE',
        icon: Icons.public_rounded,
        iconBgColor: const Color(0xFFEAE8F4),
        iconColor: AppColors.secondary,
        category: 'charts',
        onTap: widget.onPlanetsTap,
      ),

      // 7. Transits (Gochara)
      _QuickAccessItem(
        title: 'Transits (Gochara)',
        subtitle: 'Current planetary movements',
        badge: 'GOCHARA',
        icon: Icons.sync_alt_rounded,
        iconBgColor: const Color(0xFFEDE9FE),
        iconColor: const Color(0xFF7C3AED),
        category: 'timing',
        onTap: widget.onGocharaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 8. Vedic Yogas
      _QuickAccessItem(
        title: 'Vedic Yogas',
        subtitle: 'Raja, Dhana & Auspicious Yogas',
        badge: 'YOGAS',
        icon: Icons.stars_rounded,
        iconBgColor: const Color(0xFFFFF1F2),
        iconColor: const Color(0xFFE11D48),
        category: 'timing',
        onTap: widget.onYogasTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 9. Jaimini & KP Systems
      _QuickAccessItem(
        title: 'Jaimini & KP',
        subtitle: 'Chara Karakas & Sub-Lords',
        badge: 'ADVANCED',
        icon: Icons.psychology_rounded,
        iconBgColor: const Color(0xFFF1F5F9),
        iconColor: const Color(0xFF475569),
        category: 'advanced',
        onTap: widget.onJaiminiTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 10. Varshaphala & Prashna
      _QuickAccessItem(
        title: 'Varshaphala & Prashna',
        subtitle: 'Solar Return & Horary Query',
        badge: 'TAJIKA',
        icon: Icons.wb_sunny_rounded,
        iconBgColor: const Color(0xFFFFFBEB),
        iconColor: const Color(0xFFCA8A04),
        category: 'advanced',
        onTap: widget.onVarshaphalaTap ?? widget.onSeeAllTap ?? () {},
      ),

      // 11. Rashi Bhavishya
      _QuickAccessItem(
        title: 'Rashi Bhavishya',
        subtitle: 'Daily prediction',
        badge: 'DAILY',
        icon: Icons.wb_sunny_outlined,
        iconBgColor: const Color(0xFFFFF6E5),
        iconColor: const Color(0xFFD98A2B),
        category: 'charts',
        onTap: widget.onPredictionTap,
      ),

      // 12. Vastu Alignment
      _QuickAccessItem(
        title: 'Vastu',
        subtitle: 'Guidance for your space',
        badge: 'ENERGY',
        icon: Icons.home_outlined,
        iconBgColor: const Color(0xFFFDE8EF),
        iconColor: AppColors.supportingAccent,
        category: 'charts',
        onTap: widget.onVastuTap,
      ),
    ];
  }
}

class _QuickAccessItem {
  final String title;
  final String subtitle;
  final String badge;
  final IconData icon;
  final Color iconBgColor;
  final Color iconColor;
  final String category;
  final VoidCallback onTap;

  const _QuickAccessItem({
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.icon,
    required this.iconBgColor,
    required this.iconColor,
    required this.category,
    required this.onTap,
  });
}

class _QuickAccessCard extends StatelessWidget {
  final _QuickAccessItem item;

  const _QuickAccessCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: item.onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Row: Icon + Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: item.iconBgColor,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Icon(
                        item.icon,
                        size: 16,
                        color: item.iconColor,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: item.iconColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.badge,
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                            color: item.iconColor,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
                // Bottom Column: Title + Subtitle
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 1),
                    Text(
                      item.subtitle,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.lightTextSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
