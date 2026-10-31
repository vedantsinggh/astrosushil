import 'package:flutter/material.dart';
import '../../../features/astrology/models/astro_chart_model.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Compact planetary positions grid/table preview for Planets feature card.
class PlanetsPreview extends StatelessWidget {
  final AstroChartModel? chart;
  final bool isLoading;
  final bool hasProfile;

  const PlanetsPreview({
    super.key,
    this.chart,
    this.isLoading = false,
    this.hasProfile = true,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: PreviewSkeleton(height: 70, width: 140));
    }

    if (!hasProfile) {
      return const PreviewEmptyState(
        title: 'Planetary Placements',
        message: 'Planetary degrees and signs will appear here',
        icon: Icons.public_rounded,
      );
    }

    // Default key planets to show in 2 columns
    final planets = chart?.planets.isNotEmpty == true
        ? chart!.planets.take(6).toList()
        : <PlanetModel>[];

    if (planets.isEmpty) {
      return _buildFallbackGrid();
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          children: [
            Expanded(child: _buildPlanetChip(planets[0])),
            const SizedBox(width: 4),
            if (planets.length > 1)
              Expanded(child: _buildPlanetChip(planets[1]))
            else
              const Spacer(),
          ],
        ),
        const SizedBox(height: 3),
        if (planets.length > 3) ...[
          Row(
            children: [
              Expanded(child: _buildPlanetChip(planets[2])),
              const SizedBox(width: 4),
              Expanded(child: _buildPlanetChip(planets[3])),
            ],
          ),
          const SizedBox(height: 3),
        ],
        if (planets.length > 5) ...[
          Row(
            children: [
              Expanded(child: _buildPlanetChip(planets[4])),
              const SizedBox(width: 4),
              Expanded(child: _buildPlanetChip(planets[5])),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildPlanetChip(PlanetModel p) {
    final glyph = _getGlyph(p.planet);
    final signAbbr = p.rashiName.length > 3 ? p.rashiName.substring(0, 3) : p.rashiName;
    final deg = '${p.degreeInRashi.toStringAsFixed(1)}°';
    final retro = p.isRetrograde ? ' (R)' : '';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.lightBorder, width: 0.6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            glyph,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.secondary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 3),
          Flexible(
            child: Text(
              '${p.planet.substring(0, p.planet.length > 2 ? 2 : p.planet.length)}$retro',
              style: const TextStyle(
                fontSize: 8.5,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 2),
          Text(
            '$signAbbr $deg',
            style: const TextStyle(
              fontSize: 7.5,
              color: AppColors.lightTextSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackGrid() {
    final sample = [
      {'glyph': '☉', 'name': 'Su', 'sign': 'Leo 14°'},
      {'glyph': '☽', 'name': 'Mo', 'sign': 'Tau 08°'},
      {'glyph': '♂', 'name': 'Ma', 'sign': 'Ari 22°'},
      {'glyph': '☿', 'name': 'Me', 'sign': 'Vir 19°'},
      {'glyph': '♃', 'name': 'Ju', 'sign': 'Pis 05°'},
      {'glyph': '♀', 'name': 'Ve', 'sign': 'Lib 11°'},
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          children: [
            Expanded(child: _buildRawChip(sample[0])),
            const SizedBox(width: 4),
            Expanded(child: _buildRawChip(sample[1])),
          ],
        ),
        const SizedBox(height: 3),
        Row(
          children: [
            Expanded(child: _buildRawChip(sample[2])),
            const SizedBox(width: 4),
            Expanded(child: _buildRawChip(sample[3])),
          ],
        ),
        const SizedBox(height: 3),
        Row(
          children: [
            Expanded(child: _buildRawChip(sample[4])),
            const SizedBox(width: 4),
            Expanded(child: _buildRawChip(sample[5])),
          ],
        ),
      ],
    );
  }

  Widget _buildRawChip(Map<String, String> item) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.lightBorder, width: 0.6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            item['glyph']!,
            style: const TextStyle(fontSize: 10, color: AppColors.secondary),
          ),
          const SizedBox(width: 3),
          Text(
            item['name']!,
            style: const TextStyle(
              fontSize: 8.5,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 2),
          Text(
            item['sign']!,
            style: const TextStyle(
              fontSize: 7.5,
              color: AppColors.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }

  String _getGlyph(String planet) {
    final clean = planet.toUpperCase();
    if (clean.contains('SUN') || clean.contains('SURYA')) return '☉';
    if (clean.contains('MOON') || clean.contains('CHANDRA')) return '☽';
    if (clean.contains('MARS') || clean.contains('MANGAL')) return '♂';
    if (clean.contains('MERCURY') || clean.contains('BUDHA')) return '☿';
    if (clean.contains('JUPITER') || clean.contains('GURU')) return '♃';
    if (clean.contains('VENUS') || clean.contains('SHUKRA')) return '♀';
    if (clean.contains('SATURN') || clean.contains('SHANI')) return '♄';
    if (clean.contains('RAHU')) return '☊';
    if (clean.contains('KETU')) return '☋';
    return '✦';
  }
}
