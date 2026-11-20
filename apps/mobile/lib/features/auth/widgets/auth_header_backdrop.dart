import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
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
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
      child: Container(
        width: double.infinity,
        // Grows with large text instead of overflowing.
        constraints: BoxConstraints(minHeight: height),
        decoration: const BoxDecoration(gradient: AppGradients.heroNavy),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Faint gold chart wheel, centred behind the logo.
            Positioned.fill(
              child: ExcludeSemantics(
                child: Opacity(
                  opacity: 0.18,
                  child: ShaderMask(
                    blendMode: BlendMode.dstIn,
                    shaderCallback: (rect) => const RadialGradient(
                      radius: 0.75,
                      colors: [Colors.white, Colors.transparent],
                    ).createShader(rect),
                    child: AstroImage(
                      assetPath: AppAssets.homeHero,
                      fit: BoxFit.cover,
                      fallback: AstroImageFallback.celestial,
                    ),
                  ),
                ),
              ),
            ),
            Positioned.fill(child: CustomPaint(painter: _HeaderCelestialPainter())),
            SafeArea(
              bottom: false,
              child: Padding(
                // Leave room for the form sheet that overlaps the bottom edge.
                padding: const EdgeInsets.fromLTRB(0, 20, 0, 28 + 20),
                child: Center(
                  child: MediaQuery.withClampedTextScaling(
                    maxScaleFactor: 1.3,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 78,
                          height: 78,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.96),
                            border: Border.all(color: AppColors.gold.withValues(alpha: 0.9), width: 1.5),
                          ),
                          child: AstroImage(
                            assetPath: AppAssets.logoAs,
                            fit: BoxFit.contain,
                            fallback: AstroImageFallback.icon,
                            semanticLabel: 'Astro Sushil Logo',
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'Astro Sushil',
                          style: AppTypography.largeTitle.copyWith(
                            fontSize: 28,
                            letterSpacing: -0.3,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            tagline,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              letterSpacing: 0.2,
                              color: Color(0xFFE9C766),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderCelestialPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.4);

    final linePaint = Paint()
      ..color = AppColors.gold.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Draw orbital rings
    canvas.drawCircle(center, size.width * 0.28, linePaint);
    canvas.drawCircle(center, size.width * 0.45, linePaint);

    // Star dots
    final starPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.4)
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
