import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Clean 9-pad directional matrix for Vastu Alignment feature card.
class VastuPreview extends StatelessWidget {
  const VastuPreview({super.key});

  @override
  Widget build(BuildContext context) {
    final grid = [
      {'dir': 'NW', 'elem': 'Air', 'col': const Color(0xFF0284C7)},
      {'dir': 'N', 'elem': 'Water', 'col': const Color(0xFF0284C7)},
      {'dir': 'NE', 'elem': 'Ishan', 'col': AppColors.secondary},
      {'dir': 'W', 'elem': 'Space', 'col': AppColors.primary},
      {'dir': 'C', 'elem': 'Brahma', 'col': AppColors.premiumAccent},
      {'dir': 'E', 'elem': 'Sun', 'col': const Color(0xFFD97706)},
      {'dir': 'SW', 'elem': 'Earth', 'col': const Color(0xFF854D0E)},
      {'dir': 'S', 'elem': 'Mars', 'col': const Color(0xFFE11D48)},
      {'dir': 'SE', 'elem': 'Fire', 'col': const Color(0xFFE11D48)},
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildCell(grid[0]),
            const SizedBox(width: 2),
            _buildCell(grid[1]),
            const SizedBox(width: 2),
            _buildCell(grid[2]),
          ],
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildCell(grid[3]),
            const SizedBox(width: 2),
            _buildCell(grid[4]),
            const SizedBox(width: 2),
            _buildCell(grid[5]),
          ],
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildCell(grid[6]),
            const SizedBox(width: 2),
            _buildCell(grid[7]),
            const SizedBox(width: 2),
            _buildCell(grid[8]),
          ],
        ),
      ],
    );
  }

  Widget _buildCell(Map<String, dynamic> item) {
    final col = item['col'] as Color;
    return Container(
      width: 36,
      height: 15,
      decoration: BoxDecoration(
        color: col.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: col.withValues(alpha: 0.3), width: 0.6),
      ),
      child: Center(
        child: Text(
          '${item['dir']} • ${item['elem']}',
          style: TextStyle(
            fontSize: 6,
            fontWeight: FontWeight.bold,
            color: col,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
