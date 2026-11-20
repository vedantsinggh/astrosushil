import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
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

  String _formatTimestamp(DateTime dt) => AppDateTime.timeAgo(dt);

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';
    final title = isHindi ? notification.titleHi : notification.title;
    final body = isHindi ? notification.bodyHi : notification.body;

    final radius = BorderRadius.circular(18);
    final isUnread = !notification.isRead;

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.15),
          borderRadius: radius,
        ),
        child: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: isUnread ? Colors.white : AppColors.canvasSecondary.withValues(alpha: 0.6),
          borderRadius: radius,
          border: Border.all(
            color: isUnread ? AppColors.premiumAccent : AppColors.cardBorder,
            width: isUnread ? 1.5 : 1.0,
          ),
        ),
        child: Material(
          type: MaterialType.transparency,
          borderRadius: radius,
          child: InkWell(
            onTap: onTap,
            borderRadius: radius,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category Icon
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: _getCategoryBgColor(),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      _getCategoryIcon(),
                      color: _getCategoryColor(),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Notification Title & Excerpt
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (isUnread) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.premiumAccent.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              isHindi ? 'नई' : 'New',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                        ],
                        Text(
                          title,
                          style: AppTypography.titleLarge.copyWith(
                            fontSize: 17,
                            height: 1.3,
                            fontWeight: isUnread ? FontWeight.bold : FontWeight.w500,
                            color: isUnread ? AppColors.primary : AppColors.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          body,
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.lightTextSecondary,
                            height: 1.4,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _formatTimestamp(notification.timestamp),
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 4),
                  const Padding(
                    padding: EdgeInsets.only(top: 10),
                    child: Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.textMuted,
                      size: 26,
                    ),
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
