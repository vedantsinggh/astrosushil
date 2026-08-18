import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_chip.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';

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

  @override
  Widget build(BuildContext context) {
    final cleanName = widget.planetName.replaceAll('(R)', '').trim();

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: cleanName,
        actions: [
          IconButton(
            icon: const Icon(Icons.ios_share_rounded, color: AppColors.primary, size: 20),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Sharing placement details for $cleanName...')),
              );
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 1. CELESTIAL PLANET EMBLEM VISUAL WITH ASSET LOADING
                _buildPlanetVisualEmblem(cleanName),

                const SizedBox(height: 16),

                // 2. PLACEMENT SUMMARY TITLES
                Text(
                  cleanName.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${widget.signName} • ${widget.degree}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'House ${widget.houseNumber}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.lightTextSecondary,
                  ),
                ),

                const SizedBox(height: 20),

                // 3. SEGMENTED NAVIGATION TABS
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AstroChip(
                      label: 'Overview',
                      isSelected: _selectedTab == 0,
                      onTap: () => setState(() => _selectedTab = 0),
                    ),
                    const SizedBox(width: 8),
                    AstroChip(
                      label: 'Placement',
                      isSelected: _selectedTab == 1,
                      onTap: () => setState(() => _selectedTab = 1),
                    ),
                    const SizedBox(width: 8),
                    AstroChip(
                      label: 'Meaning',
                      isSelected: _selectedTab == 2,
                      onTap: () => setState(() => _selectedTab = 2),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // 4. STRUCTURED INTERPRETATION SECTIONS
                _buildStructuredSections(cleanName),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
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
        border: Border.all(color: AppColors.lightBorder, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipOval(
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Celestial background layer
            AstroImage(
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // SECTION 1: ABOUT THE PLANET
        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.wb_sunny_outlined, size: 18, color: AppColors.premiumAccent),
                  const SizedBox(width: 8),
                  Text(
                    'About the $planet',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                overviewText,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.lightTextSecondary,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // SECTION 2: PLANET IN SIGN
        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        widget.signName.substring(0, 1),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    '$planet in ${widget.signName}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                signText,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.lightTextSecondary,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // SECTION 3: PLANET IN HOUSE
        AstroCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${widget.houseNumber}',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    '$planet in the ${_getOrdinal(widget.houseNumber)} House',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                houseText,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.lightTextSecondary,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ],
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
      ..color = AppColors.primary.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final goldPaint = Paint()
      ..color = AppColors.premiumAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final fillGold = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.25)
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
