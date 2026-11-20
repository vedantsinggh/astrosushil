import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/jyoti_message.dart';
import 'jyoti_bubble_layout.dart';
import 'jyoti_markdown_text.dart';

/// Jyoti AI Assistant response message bubble widget.
///
/// Shown on the left like an incoming message in a familiar chat app:
/// a clean white bubble, large readable text and the time underneath.
class JyotiMessage extends StatelessWidget {
  final JyotiMessageModel message;

  const JyotiMessage({
    super.key,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final timeStr = AppDateTime.formatLocal(message.timestamp, 'h:mm a');

    return JyotiBubbleLayout.align(
      context: context,
      fromUser: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(6),
            topRight: Radius.circular(20),
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
          border: Border.all(color: AppColors.cardBorder, width: 1),
          boxShadow: const [
            BoxShadow(
              color: AppColors.cardShadowWarm,
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Jyoti',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.goldDark,
              ),
            ),
            const SizedBox(height: 4),
            JyotiMarkdownText(
              text: message.text,
              style: const TextStyle(
                fontSize: 17,
                height: 1.5,
                color: AppColors.lightTextPrimary,
                fontWeight: FontWeight.w400,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              timeStr,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
