import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Intentional animated shimmer skeleton for loading states.
///
/// Replaces stark blank white panels with cohesive warm placeholders.
class AstroSkeleton extends StatefulWidget {
  final double? width;
  final double? height;
  final double borderRadius;
  final BoxShape shape;

  const AstroSkeleton({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = 8,
    this.shape = BoxShape.rectangle,
  });

  /// Factory for a card placeholder
  const AstroSkeleton.card({
    super.key,
    this.width = double.infinity,
    this.height = 100,
    this.borderRadius = 16,
  }) : shape = BoxShape.rectangle;

  /// Factory for a circular avatar placeholder
  const AstroSkeleton.avatar({
    super.key,
    double size = 48,
  })  : width = size,
        height = size,
        borderRadius = 0,
        shape = BoxShape.circle;

  /// Factory for a text line placeholder
  const AstroSkeleton.text({
    super.key,
    this.width = double.infinity,
    this.height = 14,
    this.borderRadius = 6,
  }) : shape = BoxShape.rectangle;

  @override
  State<AstroSkeleton> createState() => _AstroSkeletonState();
}

class _AstroSkeletonState extends State<AstroSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.35, end: 0.75).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final color = Color.lerp(
          AppColors.cardBorderSubtle,
          AppColors.cardBorder,
          _animation.value,
        )!;

        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: color,
            shape: widget.shape,
            borderRadius: widget.shape == BoxShape.circle
                ? null
                : BorderRadius.circular(widget.borderRadius),
          ),
        );
      },
    );
  }
}
