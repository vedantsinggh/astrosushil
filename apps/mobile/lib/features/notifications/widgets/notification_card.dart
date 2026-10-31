import 'package:flutter/material.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../models/notification_item_model.dart';

class NotificationCard extends StatelessWidget {
  final NotificationItemModel notification;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const NotificationCard({
    super.key,
    required this.notification,
    required this.onTap,
    required this.onDismiss,
  });

  IconData _getCategoryIcon() {
    switch (notification.category) {
      case NotificationCategory.panchang:
        return Icons.wb_sunny_rounded;
      case NotificationCategory.transit:
        return Icons.auto_awesome_rounded;
      case NotificationCategory.order:
        return Icons.local_shipping_rounded;
      case NotificationCategory.consultation:
        return Icons.support_agent_rounded;
      case NotificationCategory.system:
      default:
        return Icons.notifications_active_rounded;
    }
  }

  Color _getCategoryColor() {
    switch (notification.category) {
      case NotificationCategory.panchang:
        return AppColors.tintAmberText;
      case NotificationCategory.transit:
        return AppColors.secondary;
      case NotificationCategory.order:
        return AppColors.success;
      case NotificationCategory.consultation:
        return AppColors.tertiary;
      case NotificationCategory.system:
      default:
        return AppColors.premiumAccent;
    }
  }

  Color _getCategoryBgColor() {
    switch (notification.category) {
      case NotificationCategory.panchang:
        return AppColors.tintAmberBg;
      case NotificationCategory.transit:
        return AppColors.secondary.withValues(alpha: 0.12);
      case NotificationCategory.order:
        return AppColors.success.withValues(alpha: 0.12);
      case NotificationCategory.consultation:
        return AppColors.tertiary.withValues(alpha: 0.12);
      case NotificationCategory.system:
      default:
        return AppColors.premiumAccent.withValues(alpha: 0.15);
    }
  }

  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final difference = now.difference(dt);
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';
    final title = isHindi ? notification.titleHi : notification.title;
    final body = isHindi ? notification.bodyHi : notification.body;

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: notification.isRead ? AppColors.cardSurfaceWarm : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: notification.isRead
                ? AppColors.cardBorder
                : AppColors.premiumAccent.withValues(alpha: 0.6),
            width: notification.isRead ? 1.0 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category Icon
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: _getCategoryBgColor(),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _getCategoryIcon(),
                      color: _getCategoryColor(),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Notification Title & Excerpt
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                title,
                                style: AppTypography.titleSmall.copyWith(
                                  fontWeight: notification.isRead
                                      ? FontWeight.w600
                                      : FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (!notification.isRead) ...[
                              const SizedBox(width: 6),
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.premiumAccent,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          body,
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.lightTextSecondary,
                            height: 1.35,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _formatTimestamp(notification.timestamp),
                          style: AppTypography.caption.copyWith(
                            color: AppColors.lightTextMuted,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 8),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.lightBorder,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
