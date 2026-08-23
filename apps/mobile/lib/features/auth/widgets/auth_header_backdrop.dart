import 'package:flutter/material.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_image.dart';

/// Premium Cosmic Header for Astro Sushil Authentication Screens.
/// Features a dark navy gradient, celestial orbital ring geometry, stars,
/// official Astro Sushil logo, and gold tagline.
class AuthHeaderBackdrop extends StatelessWidget {
  final String tagline;
  final double height;

  const AuthHeaderBackdrop({
    super.key,
    this.tagline = 'Your Journey. Written in the Stars.',
    this.height = 220.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.background,
            AppColors.primary,
            AppColors.tertiary,
          ],
        ),
      ),
      child: Stack(
        children: [
          // Background celestial starfield / overlay image
          Positioned.fill(
            child: Opacity(
              opacity: 0.25,
              child: AstroImage(
                assetPath: AppAssets.zodiacWheelOverlay,
                fit: BoxFit.cover,
                fallback: AstroImageFallback.celestial,
                semanticLabel: 'Zodiac overlay',
              ),
            ),
          ),
          // Custom painted orbital rings and star points
          Positioned.fill(
            child: CustomPaint(
              painter: _HeaderCelestialPainter(),
            ),
          ),
          // Center Content: Logo + Tagline
          SafeArea(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Container with soft glow
                  Container(
                    width: 72,
                    height: 72,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withOpacity(0.6),
                      border: Border.all(
                        color: AppColors.premiumAccent.withOpacity(0.6),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.premiumAccent.withOpacity(0.2),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: AstroImage(
                      assetPath: AppAssets.logoAs,
                      fit: BoxFit.contain,
                      fallback: AstroImageFallback.icon,
                      semanticLabel: 'Astro Sushil Logo',
                    ),
                  ),
                  const SizedBox(height: 12),
                  // App Title
                  const Text(
                    'Astro Sushil',
                    style: TextStyle(
                      fontFamily: 'serif',
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: AppColors.premiumAccent,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Tagline
                  Text(
                    tagline,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      letterSpacing: 0.5,
                      color: Colors.white.withOpacity(0.85),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderCelestialPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.4);

    final linePaint = Paint()
      ..color = AppColors.premiumAccent.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Draw orbital rings
    canvas.drawCircle(center, size.width * 0.28, linePaint);
    canvas.drawCircle(center, size.width * 0.45, linePaint);

    // Star dots
    final starPaint = Paint()
      ..color = Colors.white.withOpacity(0.4)
      ..style = PaintingStyle.fill;

    final stars = [
      Offset(size.width * 0.12, size.height * 0.2),
      Offset(size.width * 0.88, size.height * 0.25),
      Offset(size.width * 0.22, size.height * 0.7),
      Offset(size.width * 0.78, size.height * 0.65),
      Offset(size.width * 0.5, size.height * 0.85),
    ];

    for (final star in stars) {
      canvas.drawCircle(star, 1.2, starPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
