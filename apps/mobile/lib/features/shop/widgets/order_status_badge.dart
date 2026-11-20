import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Small rounded status pill. Labels use plain sentence case and
/// high-contrast text colours on soft tinted fills.
class OrderStatusBadge extends StatelessWidget {
  final String status;
  final String? fulfillmentStatus;

  const OrderStatusBadge({
    super.key,
    required this.status,
    this.fulfillmentStatus,
  });

  static String _sentenceCase(String raw) {
    final s = raw.replaceAll('_', ' ').toLowerCase();
    return s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label = _sentenceCase(status);

    if (fulfillmentStatus != null && fulfillmentStatus!.isNotEmpty) {
      final fStatus = fulfillmentStatus!.toUpperCase();
      if (fStatus == 'DELIVERED' || fStatus == 'FULFILLED') {
        bg = AppColors.successBg;
        fg = AppColors.tintSageText;
        label = fStatus == 'DELIVERED' ? 'Delivered' : 'Completed';
      } else if (fStatus == 'DISPATCHED') {
        bg = AppColors.tintVioletBg;
        fg = AppColors.secondary;
        label = 'Dispatched';
      } else if (fStatus == 'PROCESSING') {
        bg = AppColors.warningBg;
        fg = AppColors.goldDark;
        label = 'Processing';
      } else if (fStatus == 'CANCELLED') {
        bg = AppColors.errorBg;
        fg = AppColors.tintRoseText;
        label = 'Cancelled';
      } else {
        bg = AppColors.cardSurfaceParchment;
        fg = AppColors.primary;
        label = _sentenceCase(fStatus);
      }
    } else {
      if (status == 'PAID') {
        bg = AppColors.successBg;
        fg = AppColors.tintSageText;
        label = 'Paid';
      } else if (status == 'PENDING') {
        bg = AppColors.warningBg;
        fg = AppColors.goldDark;
        label = 'Payment pending';
      } else if (status == 'FAILED' || status == 'CANCELLED') {
        bg = AppColors.errorBg;
        fg = AppColors.tintRoseText;
        label = _sentenceCase(status);
      } else {
        bg = AppColors.cardSurfaceParchment;
        fg = AppColors.primary;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
