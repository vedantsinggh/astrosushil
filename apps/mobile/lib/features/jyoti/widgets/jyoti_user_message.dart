import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/jyoti_message.dart';
import 'jyoti_bubble_layout.dart';

/// User chat bubble widget, shown on the right like a sent message.
class JyotiUserMessage extends StatelessWidget {
  final JyotiMessageModel message;

  const JyotiUserMessage({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final timeStr = AppDateTime.formatLocal(message.timestamp, 'h:mm a');

    return JyotiBubbleLayout.align(
      context: context,
      fromUser: true,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
        decoration: const BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(6),
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message.text,
              style: const TextStyle(
                fontSize: 17,
                height: 1.45,
                color: AppColors.textInversePrimary,
                fontWeight: FontWeight.w400,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              timeStr,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textInverseSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
