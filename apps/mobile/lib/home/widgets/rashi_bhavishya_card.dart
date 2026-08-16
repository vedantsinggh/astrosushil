import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';
import '../models/home_models.dart';

/// Section and preview card for Today's Rashi Bhavishya
class RashiBhavishyaSection extends StatelessWidget {
  final RashiBhavishyaPreview preview;
  final VoidCallback onReadTap;
  final VoidCallback? onViewAllTap;

  const RashiBhavishyaSection({
    super.key,
    required this.preview,
    required this.onReadTap,
    this.onViewAllTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text(
                "Today's Rashi Bhavishya",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                  letterSpacing: -0.3,
                ),
              ),
              InkWell(
                onTap: onViewAllTap ?? onReadTap,
                borderRadius: BorderRadius.circular(8),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
                  child: Text(
                    'View All',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        RashiBhavishyaCard(
          preview: preview,
          onReadTap: onReadTap,
        ),
      ],
    );
  }
}

/// Compact preview card for daily Rashi Bhavishya prediction
class RashiBhavishyaCard extends StatelessWidget {
  final RashiBhavishyaPreview preview;
  final VoidCallback onReadTap;

  const RashiBhavishyaCard({
    super.key,
    required this.preview,
    required this.onReadTap,
  });

  @override
  Widget build(BuildContext context) {
    // Extract sign name (e.g. "Aries" from "Mesha (Aries)" or use preview.rashiName)
    final rashiTitle = preview.rashiName.contains('(')
        ? preview.rashiName.split('(').last.replaceAll(')', '').trim()
        : preview.rashiName;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.lightBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background Constellation Art (Right Aligned)
          Positioned(
            right: 40,
            top: 10,
            bottom: 10,
            width: 100,
            child: CustomPaint(
              painter: _ConstellationPatternPainter(),
            ),
          ),

          // Content
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              onTap: onReadTap,
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Left Sign Icon Circle Container (Dark Navy + Gold Aries Symbol)
                    Container(
                      width: 52,
                      height: 52,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          '♈',
                          style: TextStyle(
                            fontSize: 26,
                            color: AppColors.premiumAccent,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(width: 14),

                    // Middle Details Column
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            rashiTitle,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'March 21 - April 19',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'A positive day for new beginnings. Your confidence will attract good opportunities.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.lightTextSecondary,
                              height: 1.35,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 12),

                    // Right Arrow Indicator
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 22,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom painter for subtle faint constellation dots & lines in card background
class _ConstellationPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    final dotPaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.2)
      ..style = PaintingStyle.fill;

    final pts = [
      Offset(size.width * 0.2, size.height * 0.7),
      Offset(size.width * 0.45, size.height * 0.4),
      Offset(size.width * 0.75, size.height * 0.3),
      Offset(size.width * 0.9, size.height * 0.5),
    ];

    for (int i = 0; i < pts.length - 1; i++) {
      canvas.drawLine(pts[i], pts[i + 1], linePaint);
    }
    for (final pt in pts) {
      canvas.drawCircle(pt, 2.0, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
