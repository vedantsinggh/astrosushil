import 'package:flutter/material.dart';
import 'solar_system_loader_painter.dart';

/// Reusable animation container driving [SolarSystemLoaderPainter].
///
/// Ensures a single [AnimationController] lifecycle per loader widget instance.
class AstroSolarSystemAnimation extends StatefulWidget {
  final double size;
  final bool isDark;
  final int numOrbits;
  final bool showStars;
  final bool? reducedMotionOverride;

  const AstroSolarSystemAnimation({
    super.key,
    required this.size,
    this.isDark = false,
    this.numOrbits = 3,
    this.showStars = true,
    this.reducedMotionOverride,
  });

  @override
  State<AstroSolarSystemAnimation> createState() => _AstroSolarSystemAnimationState();
}

class _AstroSolarSystemAnimationState extends State<AstroSolarSystemAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool disableAnimations = widget.reducedMotionOverride ??
        (MediaQuery.maybeOf(context)?.disableAnimations ?? false);

    return RepaintBoundary(
      child: CustomPaint(
        size: Size(widget.size, widget.size),
        painter: SolarSystemLoaderPainter(
          animation: _controller,
          isDark: widget.isDark,
          numOrbits: widget.numOrbits,
          showStars: widget.showStars,
          reducedMotion: disableAnimations,
        ),
      ),
    );
  }
}
