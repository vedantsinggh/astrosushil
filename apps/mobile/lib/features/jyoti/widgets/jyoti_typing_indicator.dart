import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import 'jyoti_bubble_layout.dart';

/// Clear "Jyoti is thinking…" bubble with three gently pulsing dots,
/// shown on the left exactly where Jyoti's answer will appear.
class JyotiTypingIndicator extends StatefulWidget {
  const JyotiTypingIndicator({super.key});

  @override
  State<JyotiTypingIndicator> createState() => _JyotiTypingIndicatorState();
}

class _JyotiTypingIndicatorState extends State<JyotiTypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      label: 'Jyoti is thinking',
      child: JyotiBubbleLayout.align(
        context: context,
        fromUser: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.cardSurface,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(6),
              topRight: Radius.circular(20),
              bottomLeft: Radius.circular(20),
              bottomRight: Radius.circular(20),
            ),
            border: Border.all(color: AppColors.goldBorder, width: 1),
          ),
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: [
              AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(3, (i) {
                      // Each dot peaks a third of a cycle after the previous one.
                      final phase = (_controller.value - i / 3) % 1.0;
                      final t = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color.lerp(
                            AppColors.cardBorder,
                            AppColors.goldDark,
                            t,
                          ),
                        ),
                      );
                    }),
                  );
                },
              ),
              const Text(
                'Jyoti is thinking…',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
