import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Zodiac strip preview highlighting active Rashi for Rashi Bhavishya card.
class RashiPreview extends StatelessWidget {
  final String activeRashi;

  const RashiPreview({
    super.key,
    this.activeRashi = 'Aries',
  });

  @override
  Widget build(BuildContext context) {
    final rashis = [
      {'name': 'Ari', 'glyph': '♈', 'full': 'Aries'},
      {'name': 'Tau', 'glyph': '♉', 'full': 'Taurus'},
      {'name': 'Gem', 'glyph': '♊', 'full': 'Gemini'},
      {'name': 'Can', 'glyph': '♋', 'full': 'Cancer'},
      {'name': 'Leo', 'glyph': '♌', 'full': 'Leo'},
      {'name': 'Vir', 'glyph': '♍', 'full': 'Virgo'},
    ];

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: rashis.map((r) {
              final isSelected = r['full']!.toLowerCase() == activeRashi.toLowerCase() ||
                  (activeRashi.toLowerCase().contains(r['full']!.toLowerCase()));

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 1.5),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFD98A2B) : const Color(0xFFFFF6E5),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: isSelected ? const Color(0xFFD98A2B) : const Color(0xFFD98A2B).withValues(alpha: 0.25),
                    width: 0.8,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      r['glyph']!,
                      style: TextStyle(
                        fontSize: 9,
                        color: isSelected ? Colors.white : const Color(0xFFD98A2B),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      r['name']!,
                      style: TextStyle(
                        fontSize: 6.5,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : AppColors.primary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 5),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: const Color(0xFFD98A2B).withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(4),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Active: $activeRashi',
                  style: const TextStyle(
                    fontSize: 7.5,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB45309),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Favorable Transits',
                  style: TextStyle(
                    fontSize: 7.5,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
