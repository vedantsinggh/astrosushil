import 'package:flutter/material.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/astro_badge.dart';
import '../../../../shared/widgets/astro_button.dart';
import '../models/notification_item_model.dart';
import '../../astrology/screens/panchanga_screen.dart';
import '../../astrology/screens/gochara_screen.dart';
import '../../shop/screens/order_history_screen.dart';
import '../../settings/screens/app_settings_screen.dart';
import '../../../../home/screens/consult_screen.dart';

class NotificationDetailSheet extends StatelessWidget {
  final NotificationItemModel notification;
  final VoidCallback? onDismiss;

  const NotificationDetailSheet({
    super.key,
    required this.notification,
    this.onDismiss,
  });

  static Future<void> show({
    required BuildContext context,
    required NotificationItemModel notification,
    VoidCallback? onDismiss,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => NotificationDetailSheet(
        notification: notification,
        onDismiss: onDismiss,
      ),
    );
  }

  void _handleRouteNavigation(BuildContext context) {
    Navigator.of(context).pop();
    switch (notification.routeAction?.toUpperCase()) {
      case 'OPEN_PANCHANG':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PanchangaScreen()),
        );
        break;
      case 'OPEN_GOCHARA':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const GocharaScreen()),
        );
        break;
      case 'OPEN_ORDERS':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
        );
        break;
      case 'OPEN_APPOINTMENTS':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ConsultScreen()),
        );
        break;
      case 'OPEN_SETTINGS':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const AppSettingsScreen()),
        );
        break;
      default:
        break;
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
    final hasAction = notification.routeAction != null && notification.routeAction != 'OPEN_HOME';

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: AppColors.cardBorder, width: 1.5),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.lightBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Category Badge & Timestamp
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AstroBadge(
                  text: notification.category.name.toUpperCase(),
                  style: AstroBadgeStyle.pastel,
                ),
                Text(
                  _formatTimestamp(notification.timestamp),
                  style: AppTypography.caption.copyWith(
                    color: AppColors.lightTextMuted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Title
            Text(
              title,
              style: AppTypography.headlineMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 12),

            // Body
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Text(
                body,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.lightTextPrimary,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Actions
            Row(
              children: [
                Expanded(
                  child: AstroButton(
                    label: isHindi ? 'हटाएं' : 'Close',
                    variant: AstroButtonVariant.outlined,
                    onPressed: () {
                      Navigator.of(context).pop();
                      onDismiss?.call();
                    },
                  ),
                ),
                if (hasAction) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: AstroButton(
                      label: isHindi ? 'विवरण देखें' : 'Open Details',
                      variant: AstroButtonVariant.primary,
                      onPressed: () => _handleRouteNavigation(context),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
