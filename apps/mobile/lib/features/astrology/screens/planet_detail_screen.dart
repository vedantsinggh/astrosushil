import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_image.dart';
import '../widgets/astrology_tab_bar.dart';

import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';

class PlanetDetailScreen extends StatefulWidget {
  final String planetName;
  final String signName;
  final String degree;
  final int houseNumber;
  final bool isRetrograde;
  final String? nakshatraName;

  const PlanetDetailScreen({
    super.key,
    required this.planetName,
    required this.signName,
    required this.degree,
    required this.houseNumber,
    this.isRetrograde = false,
    this.nakshatraName,
  });

  @override
  State<PlanetDetailScreen> createState() => _PlanetDetailScreenState();
}

class _PlanetDetailScreenState extends State<PlanetDetailScreen> {
  int _selectedTab = 0; // 0 = Overview, 1 = Placement, 2 = Meaning

  ExplanationContext _buildExplanationContext(String cleanName) {
    return ExplanationContext(
      feature: 'planet_details',
      screenTitle: '$cleanName Details',
      purpose: 'Explain the deeper meaning of $cleanName in ${widget.signName} occupying House ${widget.houseNumber}',
      astrologyData: {
        'planet': cleanName,
        'sign': widget.signName,
        'degree': widget.degree,
        'houseNumber': widget.houseNumber,
        'isRetrograde': widget.isRetrograde,
        'nakshatra': widget.nakshatraName,
      },
      importantValues: {
        'house': widget.houseNumber,
        'retrograde': widget.isRetrograde,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final cleanName = widget.planetName.replaceAll('(R)', '').trim();

    return AstroPage(
      title: cleanName,
      actions: [
        AstroNavAction(
          icon: AstroIcons.share(context),
          tooltip: 'Share $cleanName placement',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Sharing placement details for $cleanName...')),
            );
          },
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. HERO: planet emblem + placement summary
          AstroGradientCard(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 22),
            child: Column(
              children: [
                _buildPlanetVisualEmblem(cleanName),
                const SizedBox(height: 16),
                Text(
                  cleanName.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.gold,
                    letterSpacing: 1.6,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${widget.signName.isNotEmpty ? widget.signName : 'N/A'} • ${widget.degree}',
                  textAlign: TextAlign.center,
                  style: AppTypography.headlineLarge.copyWith(fontSize: 24, color: Colors.white, height: 1.2),
                ),
                const SizedBox(height: 12),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _heroPill(Icons.home_work_rounded, 'House ${widget.houseNumber}'),
                    if (widget.nakshatraName != null && widget.nakshatraName!.isNotEmpty)
                      _heroPill(Icons.auto_awesome_rounded, widget.nakshatraName!),
                    if (widget.isRetrograde) _heroPill(Icons.replay_rounded, 'Retrograde'),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Sushil Sir Explainer Button
          SushilExplainerButton(
            contextBuilder: () => _buildExplanationContext(cleanName),
            poseAsset: AppAssets.sushilExplaining,
          ),

          const SizedBox(height: 16),

          // 3. SEGMENTED NAVIGATION TABS
          AstrologyTabBar(
            selectedIndex: _selectedTab,
            onTabSelected: (index) => setState(() => _selectedTab = index),
            tabs: const [
              AstrologyTabItem(label: 'Overview'),
              AstrologyTabItem(label: 'Placement'),
              AstrologyTabItem(label: 'Meaning'),
            ],
          ),

          const SizedBox(height: 20),

          // 4. STRUCTURED INTERPRETATION SECTIONS
          _buildStructuredSections(cleanName),
        ],
      ),
    );
  }

  Widget _heroPill(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.gold),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.bodyFamily,
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanetVisualEmblem(String planet) {
    final assetPath = AppAssets.getPlanetAsset(planet);

    return Container(
      width: 140,
      height: 140,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.lightSurface,
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.55), width: 1.5),
      ),
      child: ClipOval(
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Celestial background layer
            const AstroImage(
              assetPath: AppAssets.subtleCelestialBackground,
              fit: BoxFit.cover,
              width: 140,
              height: 140,
              fallback: AstroImageFallback.minimal,
              semanticLabel: 'Celestial background',
            ),
            // Planet PNG Image or Custom Painter fallback
            if (assetPath != null)
              AstroImage(
                assetPath: assetPath,
                width: 110,
                height: 110,
                fit: BoxFit.contain,
                fallback: AstroImageFallback.icon,
                semanticLabel: '$planet planet illustration',
              )
            else
              CustomPaint(
                size: const Size(140, 140),
                painter: _PlanetEmblemPainter(planetName: planet),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStructuredSections(String planet) {
    final overviewText = _getPlanetOverview(planet);
    final signText = _getSignInterpretation(planet, widget.signName);
    final houseText = _getHouseInterpretation(planet, widget.houseNumber);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _section(
          icon: Icons.wb_sunny_rounded,
          tint: AstroTint.amber,
          title: 'About the $planet',
          body: overviewText,
        ),
        const SizedBox(height: 14),
        _section(
          icon: Icons.brightness_5_rounded,
          tint: AstroTint.indigo,
          title: '$planet in ${widget.signName.isNotEmpty ? widget.signName : 'Sign'}',
          body: signText,
        ),
        const SizedBox(height: 14),
        _section(
          icon: Icons.home_work_rounded,
          tint: AstroTint.sage,
          title: '$planet in the ${_getOrdinal(widget.houseNumber)} House',
          body: houseText,
        ),
      ],
    );
  }

  Widget _section({required IconData icon, required AstroTint tint, required String title, required String body}) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AstroIconSquare(icon: icon, tint: tint, size: 38),
              const SizedBox(width: 12),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: AppTypography.headlineLarge.copyWith(fontSize: 19, height: 1.25),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            body,
            style: AppTypography.bodyLarge.copyWith(fontSize: 16, color: AppColors.textSecondary, height: 1.5),
          ),
        ],
      ),
    );
  }

  String _getPlanetOverview(String planet) {
    switch (planet.toUpperCase()) {
      case 'SUN':
        return 'The Sun represents your soul, core identity, leadership, vitality, and willpower. It shows your innate purpose and how you radiate confidence to the world.';
      case 'MOON':
        return 'The Moon governs your emotional landscape, mind, instincts, and feeling of inner security. It reveals how you react naturally to life and nurture others.';
      case 'MARS':
        return 'Mars represents courage, energy, physical action, passion, and drive. It indicates how you assert yourself and overcome life obstacles.';
      case 'MERCURY':
        return 'Mercury governs intellect, communication, analytical reasoning, trade, and learning agility. It dictates how you process and share ideas.';
      case 'JUPITER':
        return 'Jupiter signifies wisdom, higher expansion, spiritual grace, optimism, and good fortune. It highlights your path to personal growth and wisdom.';
      case 'VENUS':
        return 'Venus governs harmony, artistic refinement, romance, wealth, and appreciation for beauty. It shapes your approach to relationships and aesthetics.';
      case 'SATURN':
        return 'Saturn represents discipline, perseverance, structure, karma, and long-term endurance. It teaches valuable lessons through responsibility.';
      case 'RAHU':
        return 'Rahu represents worldly ambition, innovation, futuristic desire, and unexpected growth paths. It points to where soul expansion occurs.';
      case 'KETU':
        return 'Ketu signifies spiritual detachment, past life mastery, deep intuition, and liberation. It highlights areas of innate spiritual wisdom.';
      default:
        return 'This planetary placement brings distinct energies shaping your chart dynamics.';
    }
  }

  String _getSignInterpretation(String planet, String sign) {
    return 'With $planet placed in $sign, your expressions carry the characteristic traits of $sign. You act with confidence, clarity, and dedication when pursuing goals.';
  }

  String _getHouseInterpretation(String planet, int house) {
    return 'In the ${_getOrdinal(house)} house, $planet directs its core focus toward the themes of this sector. It influences your daily routine, choices, and personal growth.';
  }

  String _getOrdinal(int number) {
    switch (number) {
      case 1:
        return '1st';
      case 2:
        return '2nd';
      case 3:
        return '3rd';
      default:
        return '${number}th';
    }
  }
}

class _PlanetEmblemPainter extends CustomPainter {
  final String planetName;

  _PlanetEmblemPainter({required this.planetName});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.28;

    final linePaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final goldPaint = Paint()
      ..color = AppColors.premiumAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final fillGold = Paint()
      ..color = AppColors.premiumAccent.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;

    // Concentric orbital circles
    canvas.drawCircle(center, radius * 1.5, linePaint);
    canvas.drawCircle(center, radius * 1.15, goldPaint);

    // Celestial rays around emblem
    for (int i = 0; i < 12; i++) {
      final angle = (i * 30) * (math.pi / 180);
      final start = Offset(center.dx + radius * 1.25 * math.cos(angle), center.dy + radius * 1.25 * math.sin(angle));
      final end = Offset(center.dx + radius * 1.42 * math.cos(angle), center.dy + radius * 1.42 * math.sin(angle));
      canvas.drawLine(start, end, linePaint);
    }

    // Inner central sphere
    canvas.drawCircle(center, radius * 0.75, fillGold);
    canvas.drawCircle(center, radius * 0.75, goldPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
