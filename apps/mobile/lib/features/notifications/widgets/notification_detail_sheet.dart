import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
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

  /// Optional explicit delete action (a visible alternative to swipe-to-delete).
  final VoidCallback? onDelete;

  const NotificationDetailSheet({
    super.key,
    required this.notification,
    this.onDismiss,
    this.onDelete,
  });

  static Future<void> show({
    required BuildContext context,
    required NotificationItemModel notification,
    VoidCallback? onDismiss,
    VoidCallback? onDelete,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => NotificationDetailSheet(
        notification: notification,
        onDismiss: onDismiss,
        onDelete: onDelete,
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
          MaterialPageRoute(builder: (_) => const ConsultScreen(initialTab: ConsultTab.bookings)),
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

  String _formatTimestamp(DateTime dt) => AppDateTime.timeAgo(dt);

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';
    final title = isHindi ? notification.titleHi : notification.title;
    final body = isHindi ? notification.bodyHi : notification.body;
    final hasAction = notification.routeAction != null && notification.routeAction != 'OPEN_HOME';

    final categoryName = notification.category.name;
    final categoryLabel =
        categoryName.isEmpty ? categoryName : categoryName[0].toUpperCase() + categoryName.substring(1);

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      decoration: const BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
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
              const SizedBox(height: 18),

              // Category & Timestamp
              Wrap(
                spacing: 12,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  AstroBadge(
                    text: categoryLabel,
                    style: AstroBadgeStyle.pastel,
                  ),
                  Text(
                    _formatTimestamp(notification.timestamp),
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Title
              Text(
                title,
                style: AppTypography.displayMedium.copyWith(fontSize: 22, height: 1.3),
              ),
              const SizedBox(height: 12),

              // Body
              Text(
                body,
                style: const TextStyle(
                  fontSize: 16,
                  color: AppColors.lightTextPrimary,
                  height: 1.55,
                ),
              ),
              const SizedBox(height: 24),

              // Actions
              if (hasAction) ...[
                AstroButton(
                  label: isHindi ? 'विवरण देखें' : 'Open Details',
                  variant: AstroButtonVariant.primary,
                  fullWidth: true,
                  onPressed: () => _handleRouteNavigation(context),
                ),
                const SizedBox(height: 10),
              ],
              AstroButton(
                label: isHindi ? 'बंद करें' : 'Close',
                variant: AstroButtonVariant.outlined,
                fullWidth: true,
                onPressed: () {
                  Navigator.of(context).pop();
                  onDismiss?.call();
                },
              ),
              if (onDelete != null) ...[
                const SizedBox(height: 6),
                TextButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    onDelete!.call();
                  },
                  icon: const Icon(Icons.delete_outline_rounded, size: 22),
                  label: Text(
                    isHindi ? 'सूचना हटाएं' : 'Delete notification',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.error,
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
