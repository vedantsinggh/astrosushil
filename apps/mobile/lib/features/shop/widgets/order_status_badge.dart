import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

class OrderStatusBadge extends StatelessWidget {
  final String status;
  final String? fulfillmentStatus;

  const OrderStatusBadge({
    super.key,
    required this.status,
    this.fulfillmentStatus,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label = status.toUpperCase();

    if (fulfillmentStatus != null && fulfillmentStatus!.isNotEmpty) {
      final fStatus = fulfillmentStatus!.toUpperCase();
      if (fStatus == 'DELIVERED' || fStatus == 'FULFILLED') {
        bg = AppColors.success.withValues(alpha: 0.15);
        fg = AppColors.success;
        label = fStatus == 'DELIVERED' ? 'DELIVERED' : 'COMPLETED';
      } else if (fStatus == 'DISPATCHED') {
        bg = AppColors.secondary.withValues(alpha: 0.15);
        fg = AppColors.secondary;
        label = 'DISPATCHED';
      } else if (fStatus == 'PROCESSING') {
        bg = AppColors.warning.withValues(alpha: 0.15);
        fg = AppColors.warning;
        label = 'PROCESSING';
      } else if (fStatus == 'CANCELLED') {
        bg = AppColors.error.withValues(alpha: 0.15);
        fg = AppColors.error;
        label = 'CANCELLED';
      } else {
        bg = AppColors.primary.withValues(alpha: 0.1);
        fg = AppColors.primary;
        label = fStatus;
      }
    } else {
      if (status == 'PAID') {
        bg = AppColors.success.withValues(alpha: 0.15);
        fg = AppColors.success;
        label = 'PAID';
      } else if (status == 'PENDING') {
        bg = AppColors.warning.withValues(alpha: 0.15);
        fg = AppColors.warning;
        label = 'PAYMENT PENDING';
      } else if (status == 'FAILED' || status == 'CANCELLED') {
        bg = AppColors.error.withValues(alpha: 0.15);
        fg = AppColors.error;
        label = status;
      } else {
        bg = AppColors.primary.withValues(alpha: 0.1);
        fg = AppColors.primary;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
