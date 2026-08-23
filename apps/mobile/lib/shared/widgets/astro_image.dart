import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../assets/app_assets.dart';
import '../theme/app_colors.dart';

// ---------------------------------------------------------------------------
// Fallback variant
// ---------------------------------------------------------------------------

/// Describes how the placeholder should look when an image asset cannot load.
enum AstroImageFallback {
  /// Full celestial scene — gold sun, orbital rings, small planets, star dots.
  /// Use for hero images, large illustrations, and state graphics.
  celestial,

  /// Minimal ring + center dot. Suitable for cards and compact contexts.
  minimal,

  /// Small gold planet orb. Suitable for 32–48 dp icon slots.
  icon,
}

// ---------------------------------------------------------------------------
// AstroImage
// ---------------------------------------------------------------------------

/// A resilient image widget that loads a local asset and gracefully falls back
/// to a branded Astro Sushil [CustomPaint] placeholder when the asset is
/// missing, invalid, or cannot be decoded.
///
/// ```dart
/// AstroImage(
///   assetPath: AppAssets.stateOffline,
///   width: 180,
///   height: 180,
///   semanticLabel: 'Offline connection illustration',
///   fallback: AstroImageFallback.celestial,
/// )
/// ```
///
/// Behaviour contract:
/// - Never throws an uncaught image-loading exception.
/// - Never shows Flutter's default broken-image widget.
/// - In [kDebugMode] prints a one-time warning when an asset is missing.
/// - Always respects [width], [height], and [fit].
/// - Works with zero assets available.
class AstroImage extends StatelessWidget {
  /// Asset path, typically sourced from [AppAssets].
  final String assetPath;

  final double? width;
  final double? height;
  final BoxFit fit;

  /// Screen-reader label. Describes the *content*, not the technical path.
  final String? semanticLabel;

  /// Which fallback style to render when the asset cannot be loaded.
  final AstroImageFallback fallback;

  /// Optional colour override for the fallback illustration accent colour.
  /// Defaults to [AppColors.premiumAccent].
  final Color? fallbackAccentColor;

  const AstroImage({
    super.key,
    required this.assetPath,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.semanticLabel,
    this.fallback = AstroImageFallback.celestial,
    this.fallbackAccentColor,
  });

  // ── Convenience named constructors ─────────────────────────────────────────

  /// Celestial hero variant — large full-scene illustration.
  const AstroImage.celestial({
    Key? key,
    required String assetPath,
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
    String? semanticLabel,
  }) : this(
          key: key,
          assetPath: assetPath,
          width: width,
          height: height,
          fit: fit,
          semanticLabel: semanticLabel,
          fallback: AstroImageFallback.celestial,
        );

  /// Minimal ring variant — cards and compact layouts.
  const AstroImage.minimal({
    Key? key,
    required String assetPath,
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
    String? semanticLabel,
  }) : this(
          key: key,
          assetPath: assetPath,
          width: width,
          height: height,
          fit: fit,
          semanticLabel: semanticLabel,
          fallback: AstroImageFallback.minimal,
        );

  /// Small icon orb variant — 32–48 dp planet/icon slots.
  const AstroImage.icon({
    Key? key,
    required String assetPath,
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
    String? semanticLabel,
  }) : this(
          key: key,
          assetPath: assetPath,
          width: width,
          height: height,
          fit: fit,
          semanticLabel: semanticLabel,
          fallback: AstroImageFallback.icon,
        );

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final effectiveWidth = width;
    final effectiveHeight = height;

    return Semantics(
      label: semanticLabel,
      image: true,
      child: Image.asset(
        assetPath,
        width: effectiveWidth,
        height: effectiveHeight,
        fit: fit,
        errorBuilder: (context, error, stackTrace) {
          // Log the missing asset in development; stay silent in release.
          if (kDebugMode) {
            debugPrint('[AstroImage] ⚠️  Missing or invalid asset: $assetPath');
          }
          return _AstroFallbackWidget(
            width: effectiveWidth,
            height: effectiveHeight,
            variant: fallback,
            accentColor: fallbackAccentColor ?? AppColors.premiumAccent,
            semanticLabel: semanticLabel,
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _AstroFallbackWidget
// ---------------------------------------------------------------------------

class _AstroFallbackWidget extends StatelessWidget {
  final double? width;
  final double? height;
  final AstroImageFallback variant;
  final Color accentColor;
  final String? semanticLabel;

  const _AstroFallbackWidget({
    required this.width,
    required this.height,
    required this.variant,
    required this.accentColor,
    this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    // Resolve a display size from explicit dimensions or parent constraints.
    final resolvedSize = Size(width ?? 120, height ?? 120);

    return Semantics(
      label: semanticLabel ?? 'Astro Sushil illustration',
      image: true,
      child: SizedBox(
        width: resolvedSize.width,
        height: resolvedSize.height,
        child: CustomPaint(
          painter: _AstroFallbackPainter(
            variant: variant,
            accentColor: accentColor,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _AstroFallbackPainter
// ---------------------------------------------------------------------------

class _AstroFallbackPainter extends CustomPainter {
  final AstroImageFallback variant;
  final Color accentColor;

  const _AstroFallbackPainter({
    required this.variant,
    required this.accentColor,
  });

  // ── Shared paints ──────────────────────────────────────────────────────────

  Paint _goldStroke(double width) => Paint()
    ..color = accentColor
    ..style = PaintingStyle.stroke
    ..strokeWidth = width
    ..strokeCap = StrokeCap.round;

  Paint _goldFill([double opacity = 1.0]) => Paint()
    ..color = accentColor.withOpacity(opacity)
    ..style = PaintingStyle.fill;

  Paint _navyStroke(double width) => Paint()
    ..color = AppColors.primary
    ..style = PaintingStyle.stroke
    ..strokeWidth = width
    ..strokeCap = StrokeCap.round;

  Paint _purpleStroke(double opacity, double width) => Paint()
    ..color = AppColors.secondary.withOpacity(opacity)
    ..style = PaintingStyle.stroke
    ..strokeWidth = width;

  // ── Paint dispatcher ───────────────────────────────────────────────────────

  @override
  void paint(Canvas canvas, Size size) {
    switch (variant) {
      case AstroImageFallback.celestial:
        _paintCelestial(canvas, size);
      case AstroImageFallback.minimal:
        _paintMinimal(canvas, size);
      case AstroImageFallback.icon:
        _paintIcon(canvas, size);
    }
  }

  // ── CELESTIAL variant ──────────────────────────────────────────────────────
  // Gold sun at centre, two orbital rings, 3 small planets, star accent dots.

  void _paintCelestial(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final center = Offset(cx, cy);
    final r = math.min(cx, cy) * 0.82;

    // Outer orbit
    canvas.drawCircle(center, r, _purpleStroke(0.45, 1.2));
    // Inner orbit
    canvas.drawCircle(center, r * 0.58, _purpleStroke(0.28, 0.9));

    // 12-spoke house lines (very faint)
    for (int i = 0; i < 12; i++) {
      final angle = i * math.pi / 6;
      final inner = center + Offset(math.cos(angle) * r * 0.2, math.sin(angle) * r * 0.2);
      final outer = center + Offset(math.cos(angle) * r, math.sin(angle) * r);
      canvas.drawLine(inner, outer, _purpleStroke(0.12, 0.6));
    }

    // Sun glow halo
    canvas.drawCircle(center, r * 0.22, _goldFill(0.18));
    // Sun core
    canvas.drawCircle(center, r * 0.12, _goldFill());
    // Sun ring
    canvas.drawCircle(center, r * 0.12, _goldStroke(1.4));

    // 8 sun rays
    for (int i = 0; i < 8; i++) {
      final angle = i * math.pi / 4;
      final start = center + Offset(math.cos(angle) * r * 0.14, math.sin(angle) * r * 0.14);
      final end = center + Offset(math.cos(angle) * r * 0.25, math.sin(angle) * r * 0.25);
      canvas.drawLine(start, end, _goldStroke(1.0));
    }

    // 3 planets on outer orbit
    final planetAngles = [0.55, 2.1, 4.3];
    final planetSizes = [r * 0.075, r * 0.06, r * 0.08];
    for (int i = 0; i < 3; i++) {
      final pos = center + Offset(
        math.cos(planetAngles[i]) * r,
        math.sin(planetAngles[i]) * r,
      );
      canvas.drawCircle(pos, planetSizes[i], _goldFill(0.85));
      canvas.drawCircle(pos, planetSizes[i], _navyStroke(0.8));
    }

    // 1 small planet on inner orbit
    final innerPos = center + Offset(
      math.cos(3.8) * r * 0.58,
      math.sin(3.8) * r * 0.58,
    );
    canvas.drawCircle(innerPos, r * 0.055, _goldFill(0.65));

    // Star accent dots
    _dot(canvas, center + Offset(-r * 0.72, -r * 0.62), r * 0.022);
    _dot(canvas, center + Offset(r * 0.65, r * 0.7), r * 0.018);
    _dot(canvas, center + Offset(r * 0.8, -r * 0.4), r * 0.015);
    _dot(canvas, center + Offset(-r * 0.5, r * 0.75), r * 0.013);
  }

  void _dot(Canvas canvas, Offset pos, double r) {
    canvas.drawCircle(pos, r, _goldFill(0.6));
  }

  // ── MINIMAL variant ────────────────────────────────────────────────────────
  // Single thin ring + small filled center dot. Light-touch for cards.

  void _paintMinimal(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final center = Offset(cx, cy);
    final r = math.min(cx, cy) * 0.7;

    canvas.drawCircle(center, r, _purpleStroke(0.4, 1.0));
    canvas.drawCircle(center, r * 0.55, _purpleStroke(0.2, 0.8));

    // Small planet on outer ring
    final pos = center + Offset(math.cos(math.pi * 0.3) * r, math.sin(math.pi * 0.3) * r);
    canvas.drawCircle(pos, r * 0.1, _goldFill(0.8));

    // Center dot
    canvas.drawCircle(center, r * 0.1, _goldFill());
    canvas.drawCircle(center, r * 0.1, _goldStroke(1.0));
  }

  // ── ICON variant ───────────────────────────────────────────────────────────
  // Compact: filled planet orb + tiny orbit arc. Fits 32–48 dp slots.

  void _paintIcon(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final center = Offset(cx, cy);
    final r = math.min(cx, cy) * 0.72;

    // Orbit arc — not full circle, 270°
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: r),
      math.pi * 0.15,
      math.pi * 1.7,
      false,
      _purpleStroke(0.5, 1.0),
    );

    // Planet body
    canvas.drawCircle(center, r * 0.5, _goldFill(0.2));
    canvas.drawCircle(center, r * 0.5, _goldStroke(1.2));

    // Tiny highlight dot on planet
    final highlight = center + Offset(-r * 0.15, -r * 0.15);
    canvas.drawCircle(highlight, r * 0.08, _goldFill(0.8));
  }

  @override
  bool shouldRepaint(covariant _AstroFallbackPainter old) =>
      old.variant != variant || old.accentColor != accentColor;
}
