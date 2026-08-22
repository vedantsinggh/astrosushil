import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import 'jyoti_avatar.dart';

/// Subtle typing indicator displaying "Jyoti is thinking..." with animated dots.
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
    return Container(
      margin: const EdgeInsets.only(left: 12, right: 48, top: 6, bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const JyotiAvatar(size: 28),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.secondary.withOpacity(0.15),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Jyoti is thinking',
                  style: TextStyle(
                    fontSize: 13,
                    fontStyle: FontStyle.italic,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(width: 4),
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    final value = _controller.value;
                    final dotCount = (value * 3).floor() + 1;
                    return Text(
                      '.' * dotCount,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.secondary,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
