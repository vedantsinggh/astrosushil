import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import 'preview_skeleton.dart';

/// Compact real Varga harmonic previews (D1, D9 Navamsha, D10 Dashamsha, D60) for Divisional Charts card.
class VargasPreview extends StatelessWidget {
  final bool isLoading;
  final bool hasProfile;

  const VargasPreview({
    super.key,
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
        title: 'Divisional Charts',
        message: 'Your D1 to D60 Vargas will appear here',
        icon: Icons.pie_chart_outline_rounded,
      );
    }

    final vargas = [
      {'code': 'D1', 'name': 'Rashi', 'color': AppColors.secondary},
      {'code': 'D9', 'name': 'Navamsha', 'color': AppColors.premiumAccent},
      {'code': 'D10', 'name': 'Dashamsha', 'color': const Color(0xFF0284C7)},
      {'code': 'D60', 'name': 'Shashtiamsha', 'color': const Color(0xFF16A34A)},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: vargas.map((v) {
        final color = v['color'] as Color;
        return Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: color.withValues(alpha: 0.25), width: 0.8),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Mini Kundli Diamond Geometry
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CustomPaint(
                    painter: _MicroDiamondPainter(color: color),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  v['code'] as String,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                Text(
                  v['name'] as String,
                  style: const TextStyle(
                    fontSize: 7.5,
                    color: AppColors.lightTextSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _MicroDiamondPainter extends CustomPainter {
  final Color color;

  _MicroDiamondPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final paint = Paint()
      ..color = color.withValues(alpha: 0.8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), paint);
    canvas.drawLine(const Offset(0, 0), Offset(w, h), paint);
    canvas.drawLine(Offset(w, 0), Offset(0, h), paint);

    final path = Path()
      ..moveTo(w / 2, 0)
      ..lineTo(w, h / 2)
      ..lineTo(w / 2, h)
      ..lineTo(0, h / 2)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _MicroDiamondPainter oldDelegate) =>
      oldDelegate.color != color;
}
