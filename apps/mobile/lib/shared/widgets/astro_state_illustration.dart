import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Cosmic state illustration types matching system error/status states.
enum AstroStateType {
  offline,
  slowConnection,
  serverError,
  emptyData,
  maintenance,
  sessionExpired,
  noBirthProfile,
  pdfError,
}

/// Renders a premium state illustration using coherent on-brand celestial
/// vector graphics.
///
/// Architecture note: When real PNG assets are placed at the paths declared
/// in [AppAssets] (state_*.png), this widget can be upgraded to load them
/// via [Image.asset] with this [CustomPaint] as the [errorBuilder] fallback.
/// Until then the vector painter is the primary and only renderer.
class AstroStateIllustration extends StatelessWidget {
  final AstroStateType type;
  final double size;

  const AstroStateIllustration({
    super.key,
    required this.type,
    this.size = 140.0,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        size: Size(size, size),
        painter: _AstroStateVectorPainter(type: type),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Brand palette constants
// ---------------------------------------------------------------------------
const _kNavy = Color(0xFF121440);
const _kPurple = Color(0xFF61568C);
const _kGold = Color(0xFFD9B13B);

/// Custom Vector Painter producing premium, coherent celestial illustrations.
class _AstroStateVectorPainter extends CustomPainter {
  final AstroStateType type;

  const _AstroStateVectorPainter({required this.type});

  // ── Shared paint factories ──────────────────────────────────────────────

  Paint get _orbitStroke => Paint()
    ..color = _kPurple.withOpacity(0.55)
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.4
    ..strokeCap = StrokeCap.round;

  Paint get _orbitStrokeFaint => Paint()
    ..color = _kPurple.withOpacity(0.25)
    ..style = PaintingStyle.stroke
    ..strokeWidth = 0.9;

  Paint get _navyStroke => Paint()
    ..color = _kNavy
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.8
    ..strokeCap = StrokeCap.round;

  Paint get _goldStroke => Paint()
    ..color = _kGold
    ..style = PaintingStyle.stroke
    ..strokeWidth = 2.0
    ..strokeCap = StrokeCap.round;

  Paint get _goldFill => Paint()
    ..color = _kGold
    ..style = PaintingStyle.fill;

  Paint get _navyFill => Paint()
    ..color = _kNavy
    ..style = PaintingStyle.fill;

  Paint _goldFillOpacity(double opacity) => Paint()
    ..color = _kGold.withOpacity(opacity)
    ..style = PaintingStyle.fill;

  Paint _purpleStroke(double opacity, double width) => Paint()
    ..color = _kPurple.withOpacity(opacity)
    ..style = PaintingStyle.stroke
    ..strokeWidth = width
    ..strokeCap = StrokeCap.round;

  Paint _goldStrokeWidth(double w) => Paint()
    ..color = _kGold
    ..style = PaintingStyle.stroke
    ..strokeWidth = w
    ..strokeCap = StrokeCap.round;

  // ── Helper: small star dot ──────────────────────────────────────────────

  void _drawStar(Canvas c, Offset pos, double r, Paint p) {
    c.drawCircle(pos, r, p);
  }

  // ── Helper: 4-point sparkle ─────────────────────────────────────────────

  void _drawSparkle(Canvas c, Offset pos, double r, Paint stroke) {
    c.drawLine(pos + Offset(0, -r), pos + Offset(0, r), stroke);
    c.drawLine(pos + Offset(-r, 0), pos + Offset(r, 0), stroke);
  }

  // ── Helper: crescent moon ───────────────────────────────────────────────

  void _drawCrescent(Canvas c, Offset center, double r, Paint fill) {
    final path = Path();
    path.addArc(Rect.fromCircle(center: center, radius: r), -math.pi / 2, math.pi * 1.6);
    final innerCenter = center + Offset(r * 0.35, 0);
    path.addArc(
      Rect.fromCircle(center: innerCenter, radius: r * 0.78),
      math.pi / 2,
      -math.pi * 1.6,
    );
    path.close();
    c.drawPath(path, fill);
  }

  // ── Helper: dotted arc ──────────────────────────────────────────────────

  void _dottedArc(
    Canvas c,
    Offset center,
    double radius,
    double startAngle,
    double sweepAngle,
    int dots,
    Paint dotPaint,
    double dotR,
  ) {
    for (int i = 0; i < dots; i++) {
      final angle = startAngle + (sweepAngle / (dots - 1)) * i;
      final pos = center + Offset(math.cos(angle) * radius, math.sin(angle) * radius);
      c.drawCircle(pos, dotR, dotPaint);
    }
  }

  // ── Main paint dispatch ─────────────────────────────────────────────────

  @override
  void paint(Canvas canvas, Size size) {
    final c = canvas;
    final cx = size.width / 2;
    final cy = size.height / 2;
    final center = Offset(cx, cy);
    final r = size.width * 0.36; // primary orbit radius

    switch (type) {
      case AstroStateType.offline:
        _paintOffline(c, center, r, size);
      case AstroStateType.slowConnection:
        _paintSlowConnection(c, center, r, size);
      case AstroStateType.serverError:
        _paintServerError(c, center, r, size);
      case AstroStateType.emptyData:
        _paintEmptyData(c, center, r, size);
      case AstroStateType.maintenance:
        _paintMaintenance(c, center, r, size);
      case AstroStateType.sessionExpired:
        _paintSessionExpired(c, center, r, size);
      case AstroStateType.noBirthProfile:
        _paintNoBirthProfile(c, center, r, size);
      case AstroStateType.pdfError:
        _paintPdfError(c, center, r, size);
    }
  }

  // ── Offline: crescent moon + broken orbit + faint stars ─────────────────

  void _paintOffline(Canvas c, Offset center, double r, Size size) {
    // Outer orbit — dashed by drawing arc segments
    final op = _orbitStroke;
    c.drawArc(Rect.fromCircle(center: center, radius: r), -math.pi * 0.9, math.pi * 1.2, false, op);
    // Inner faint ring
    c.drawArc(
      Rect.fromCircle(center: center, radius: r * 0.62),
      0,
      math.pi * 2,
      false,
      _orbitStrokeFaint,
    );

    // Moon crescent slightly offset
    final moonCenter = center + const Offset(-6, -8);
    _drawCrescent(c, moonCenter, r * 0.22, _goldFill);

    // Disconnected node — small circle at orbit break point
    final breakPt = center + Offset(math.cos(-0.3) * r, math.sin(-0.3) * r);
    c.drawCircle(breakPt, 3.5, _goldFill);
    c.drawCircle(breakPt, 6.0, _goldStroke);

    // Three tiny stars
    final sf = _goldFillOpacity(0.7);
    _drawStar(c, center + Offset(r * 0.6, -r * 0.7), 1.8, sf);
    _drawStar(c, center + Offset(-r * 0.75, r * 0.4), 1.4, sf);
    _drawStar(c, center + Offset(r * 0.2, r * 0.8), 1.2, sf);
  }

  // ── Slow connection: planet on orbit with trailing arc ──────────────────

  void _paintSlowConnection(Canvas c, Offset center, double r, Size size) {
    // Primary orbit ring
    c.drawCircle(center, r, _orbitStroke);
    // Secondary inner ring
    c.drawCircle(center, r * 0.55, _orbitStrokeFaint);

    // Planet position at ~45° on orbit
    const angle = -math.pi * 0.35;
    final planetPos = center + Offset(math.cos(angle) * r, math.sin(angle) * r);

    // Trailing motion arc behind planet
    const trailStart = -math.pi * 0.85;
    const trailSweep = math.pi * 0.5;
    final trailPaint = Paint()
      ..color = _kGold.withOpacity(0.28)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;
    c.drawArc(Rect.fromCircle(center: center, radius: r), trailStart, trailSweep, false, trailPaint);

    // Planet body
    c.drawCircle(planetPos, r * 0.12, _goldFill);
    c.drawCircle(planetPos, r * 0.12, _goldStroke);

    // Small center dot (star/sun)
    c.drawCircle(center, 3.5, _navyFill);
    c.drawCircle(center, 3.5, _navyStroke);

    // Faint star accent
    _drawStar(c, center + Offset(-r * 0.65, -r * 0.55), 1.5, _goldFillOpacity(0.6));
  }

  // ── Server error: misaligned orbit with displaced planet ─────────────────

  void _paintServerError(Canvas c, Offset center, double r, Size size) {
    // Outer orbit — slightly elliptical / broken: draw two arcs with a gap
    final arc1Paint = _orbitStroke;
    c.drawArc(Rect.fromCircle(center: center, radius: r), 0.4, math.pi * 1.35, false, arc1Paint);
    c.drawArc(Rect.fromCircle(center: center, radius: r), math.pi + 0.4, math.pi * 0.8, false, arc1Paint);

    // Displaced planet — off the orbit path
    final planetPos = center + Offset(r * 0.55, -r * 0.58);
    c.drawCircle(planetPos, r * 0.13, _goldFill);
    c.drawCircle(planetPos, r * 0.13, _goldStroke);

    // Dashed line from orbit to displaced planet (misalignment indicator)
    const dashCount = 5;
    final orbitEdge = center + Offset(math.cos(-0.52) * r, math.sin(-0.52) * r);
    for (int i = 0; i < dashCount; i++) {
      final t1 = i / dashCount;
      final t2 = (i + 0.5) / dashCount;
      final p1 = Offset.lerp(orbitEdge, planetPos, t1)!;
      final p2 = Offset.lerp(orbitEdge, planetPos, t2)!;
      c.drawLine(p1, p2, _purpleStroke(0.5, 1.2));
    }

    // Center body
    c.drawCircle(center, r * 0.08, _navyFill);

    // Warning triangle — subtle gold, small
    final tri = center + Offset(0, r * 0.15);
    final triPath = Path()
      ..moveTo(tri.dx, tri.dy - r * 0.22)
      ..lineTo(tri.dx - r * 0.18, tri.dy + r * 0.08)
      ..lineTo(tri.dx + r * 0.18, tri.dy + r * 0.08)
      ..close();
    c.drawPath(triPath, _goldStrokeWidth(1.6));

    // Stars
    final sf = _goldFillOpacity(0.55);
    _drawStar(c, center + Offset(-r * 0.8, -r * 0.5), 1.6, sf);
    _drawStar(c, center + Offset(r * 0.8, r * 0.55), 1.3, sf);
  }

  // ── Empty data: quiet sparse constellation ───────────────────────────────

  void _paintEmptyData(Canvas c, Offset center, double r, Size size) {
    // Very faint outer orbit — implies emptiness
    c.drawCircle(center, r, _orbitStrokeFaint);
    c.drawCircle(center, r * 0.5, _orbitStrokeFaint);

    // Sparse constellation — 5 dots connected by thin lines
    final stars = [
      center + Offset(-r * 0.18, -r * 0.55),
      center + Offset(r * 0.3, -r * 0.38),
      center + Offset(r * 0.52, r * 0.1),
      center + Offset(r * 0.15, r * 0.5),
      center + Offset(-r * 0.45, r * 0.25),
    ];

    final linePaint = Paint()
      ..color = _kPurple.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;

    // Connect constellation
    for (int i = 0; i < stars.length; i++) {
      c.drawLine(stars[i], stars[(i + 1) % stars.length], linePaint);
    }

    // Star dots (slightly varied sizes)
    final sizes = [2.5, 2.0, 2.8, 1.8, 2.2];
    for (int i = 0; i < stars.length; i++) {
      _drawStar(c, stars[i], sizes[i], _goldFillOpacity(0.65));
    }

    // Very subtle center dot
    c.drawCircle(center, 2.0, _goldFillOpacity(0.35));
  }

  // ── Maintenance: concentric rings with adjustment marks ──────────────────

  void _paintMaintenance(Canvas c, Offset center, double r, Size size) {
    // Three concentric rings
    c.drawCircle(center, r, _orbitStroke);
    c.drawCircle(center, r * 0.65, _purpleStroke(0.4, 1.2));
    c.drawCircle(center, r * 0.3, _orbitStrokeFaint);

    // Four tick marks at cardinal points on the outer ring (adjustment indicators)
    for (int i = 0; i < 4; i++) {
      final angle = i * math.pi / 2;
      final outer = center + Offset(math.cos(angle) * r, math.sin(angle) * r);
      final inner = center + Offset(math.cos(angle) * (r - 8), math.sin(angle) * (r - 8));
      c.drawLine(inner, outer, _goldStrokeWidth(2.2));
    }

    // Eight smaller tick marks at 45° intervals on middle ring
    for (int i = 0; i < 8; i++) {
      final angle = i * math.pi / 4;
      final outer = center + Offset(math.cos(angle) * r * 0.65, math.sin(angle) * r * 0.65);
      final inner = center + Offset(math.cos(angle) * (r * 0.65 - 5), math.sin(angle) * (r * 0.65 - 5));
      c.drawLine(inner, outer, _goldStrokeWidth(1.2));
    }

    // Center planet
    c.drawCircle(center, r * 0.1, _goldFill);
    c.drawCircle(center, r * 0.1, _navyStroke);
  }

  // ── Session expired: celestial lock motif ────────────────────────────────

  void _paintSessionExpired(Canvas c, Offset center, double r, Size size) {
    // Outer orbit ring — faded, suggesting separation
    c.drawCircle(center, r, _orbitStrokeFaint);

    // Planet/celestial body behind the lock — top of composition
    final planetCenter = center + Offset(0, -r * 0.35);
    c.drawCircle(planetCenter, r * 0.14, _goldFillOpacity(0.6));
    c.drawCircle(planetCenter, r * 0.14, _purpleStroke(0.5, 1.2));

    // Lock body — center of composition
    final lockCenter = center + Offset(0, r * 0.12);
    final lockBodyRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: lockCenter, width: r * 0.52, height: r * 0.42),
      Radius.circular(r * 0.08),
    );
    c.drawRRect(lockBodyRect, _navyStroke);
    c.drawRRect(lockBodyRect, Paint()
      ..color = _kNavy.withOpacity(0.06)
      ..style = PaintingStyle.fill);

    // Lock shackle (arc above lock body)
    final shackleRect = Rect.fromCenter(
      center: lockCenter + Offset(0, -r * 0.19),
      width: r * 0.3,
      height: r * 0.38,
    );
    c.drawArc(shackleRect, math.pi, math.pi, false, _navyStroke);

    // Gold keyhole dot inside lock
    c.drawCircle(lockCenter, r * 0.055, _goldFill);

    // Four small stars around — celestial context
    final sf = _goldFillOpacity(0.6);
    _drawStar(c, center + Offset(-r * 0.72, -r * 0.45), 1.8, sf);
    _drawStar(c, center + Offset(r * 0.68, -r * 0.55), 1.4, sf);
    _drawStar(c, center + Offset(-r * 0.55, r * 0.62), 1.2, sf);
    _drawStar(c, center + Offset(r * 0.75, r * 0.4), 1.6, sf);
  }

  // ── No birth profile: empty zodiac chart ring ────────────────────────────

  void _paintNoBirthProfile(Canvas c, Offset center, double r, Size size) {
    // Outer chart ring
    c.drawCircle(center, r, _orbitStroke);

    // 12 house divider lines (like a birth chart)
    for (int i = 0; i < 12; i++) {
      final angle = i * math.pi / 6;
      final inner = center + Offset(math.cos(angle) * r * 0.42, math.sin(angle) * r * 0.42);
      final outer = center + Offset(math.cos(angle) * r, math.sin(angle) * r);
      c.drawLine(inner, outer, _purpleStroke(0.25, 0.8));
    }

    // Inner ring
    c.drawCircle(center, r * 0.42, _orbitStrokeFaint);

    // Very inner ring
    c.drawCircle(center, r * 0.18, _orbitStrokeFaint);

    // Center empty — subtle dashed circle
    _dottedArc(c, center, r * 0.18, 0, math.pi * 2, 12, _goldFillOpacity(0.35), 1.2);

    // Three small constellation dots in the field — suggests celestial map
    _drawStar(c, center + Offset(r * 0.28, -r * 0.28), 2.0, _goldFillOpacity(0.5));
    _drawStar(c, center + Offset(-r * 0.3, r * 0.2), 2.2, _goldFillOpacity(0.5));
    _drawStar(c, center + Offset(r * 0.22, r * 0.32), 1.6, _goldFillOpacity(0.5));
  }

  // ── PDF error: document sheet + broken orbit overlay ─────────────────────

  void _paintPdfError(Canvas c, Offset center, double r, Size size) {
    // Subtle orbit ring in background
    c.drawCircle(center, r, _orbitStrokeFaint);

    // Document shape (portrait rectangle, slight top-right fold)
    final docW = r * 0.75;
    final docH = r * 0.95;
    final docTop = center + Offset(-docW / 2, -docH / 2);
    final foldSize = docW * 0.22;

    final docPath = Path()
      ..moveTo(docTop.dx, docTop.dy)
      ..lineTo(docTop.dx + docW - foldSize, docTop.dy)
      ..lineTo(docTop.dx + docW, docTop.dy + foldSize)
      ..lineTo(docTop.dx + docW, docTop.dy + docH)
      ..lineTo(docTop.dx, docTop.dy + docH)
      ..close();
    c.drawPath(docPath, Paint()
      ..color = _kNavy.withOpacity(0.05)
      ..style = PaintingStyle.fill);
    c.drawPath(docPath, _navyStroke);

    // Fold corner triangle
    final foldPath = Path()
      ..moveTo(docTop.dx + docW - foldSize, docTop.dy)
      ..lineTo(docTop.dx + docW, docTop.dy + foldSize)
      ..lineTo(docTop.dx + docW - foldSize, docTop.dy + foldSize)
      ..close();
    c.drawPath(foldPath, _purpleStroke(0.45, 1.0));

    // Three horizontal text-line suggestions inside doc
    final lineX1 = docTop.dx + docW * 0.18;
    final lineX2 = docTop.dx + docW * 0.72;
    final lineY1 = center.dy - r * 0.08;
    final lineY2 = lineY1 + r * 0.14;
    final lineY3 = lineY2 + r * 0.14;
    c.drawLine(Offset(lineX1, lineY1), Offset(lineX2, lineY1), _purpleStroke(0.3, 1.0));
    c.drawLine(Offset(lineX1, lineY2), Offset(lineX2 * 0.88 + lineX1 * 0.12, lineY2), _purpleStroke(0.2, 1.0));
    c.drawLine(Offset(lineX1, lineY3), Offset(lineX2 * 0.7 + lineX1 * 0.3, lineY3), _purpleStroke(0.2, 1.0));

    // Broken orbit arc — overlaid on bottom-right of doc
    final orbitCenter = center + Offset(r * 0.25, r * 0.3);
    c.drawArc(
      Rect.fromCircle(center: orbitCenter, radius: r * 0.28),
      math.pi * 0.1,
      math.pi * 1.1,
      false,
      _goldStrokeWidth(1.6),
    );

    // Small displaced planet on the broken arc
    final pa = math.pi * 0.6;
    final planetPos = orbitCenter + Offset(math.cos(pa) * r * 0.28, math.sin(pa) * r * 0.28);
    c.drawCircle(planetPos, 3.5, _goldFill);
  }

  @override
  bool shouldRepaint(covariant _AstroStateVectorPainter oldDelegate) =>
      oldDelegate.type != type;
}
