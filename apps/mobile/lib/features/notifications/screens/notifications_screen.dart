import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/astro_app_bar.dart';
import '../../../../shared/widgets/astro_chip.dart';
import '../../../../shared/widgets/astro_state_illustration.dart';
import '../../../../shared/widgets/subtle_celestial_background.dart';
import '../../../../core/localization/locale_provider.dart';
import '../models/notification_item_model.dart';
import '../providers/notifications_provider.dart';
import '../widgets/notification_card.dart';
import '../widgets/notification_detail_sheet.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';
    final state = ref.watch(notificationsNotifierProvider);
    final notifier = ref.read(notificationsNotifierProvider.notifier);
    final filteredItems = state.filteredItems;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: isHindi ? 'सूचनाएं एवं अलर्ट' : 'Notifications',
        actions: [
          if (state.unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.done_all_rounded, color: AppColors.primary),
              tooltip: l10n.markAllRead,
              onPressed: () {
                notifier.markAllAsRead();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      isHindi
                          ? 'सभी सूचनाएं पढ़ी हुई चिह्नित की गईं'
                          : 'All notifications marked as read',
                    ),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
            ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Category Filter Row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      _buildCategoryChip(
                        context,
                        ref,
                        category: NotificationCategory.all,
                        label: isHindi ? 'सभी' : 'All',
                        isSelected: state.selectedCategory == NotificationCategory.all,
                        badgeCount: state.items.where((i) => !i.isRead).length,
                      ),
                      const SizedBox(width: 8),
                      _buildCategoryChip(
                        context,
                        ref,
                        category: NotificationCategory.panchang,
                        label: isHindi ? 'पंचांग' : 'Panchang',
                        isSelected: state.selectedCategory == NotificationCategory.panchang,
                        badgeCount: state.items
                            .where((i) => i.category == NotificationCategory.panchang && !i.isRead)
                            .length,
                      ),
                      const SizedBox(width: 8),
                      _buildCategoryChip(
                        context,
                        ref,
                        category: NotificationCategory.transit,
                        label: isHindi ? 'गोचर' : 'Transits',
                        isSelected: state.selectedCategory == NotificationCategory.transit,
                        badgeCount: state.items
                            .where((i) => i.category == NotificationCategory.transit && !i.isRead)
                            .length,
                      ),
                      const SizedBox(width: 8),
                      _buildCategoryChip(
                        context,
                        ref,
                        category: NotificationCategory.order,
                        label: isHindi ? 'आर्डर्स' : 'Orders',
                        isSelected: state.selectedCategory == NotificationCategory.order,
                        badgeCount: state.items
                            .where((i) => i.category == NotificationCategory.order && !i.isRead)
                            .length,
                      ),
                      const SizedBox(width: 8),
                      _buildCategoryChip(
                        context,
                        ref,
                        category: NotificationCategory.consultation,
                        label: isHindi ? 'परामर्श' : 'Consultations',
                        isSelected: state.selectedCategory == NotificationCategory.consultation,
                        badgeCount: state.items
                            .where((i) => i.category == NotificationCategory.consultation && !i.isRead)
                            .length,
                      ),
                    ],
                  ),
                ),
              ),

              // 2. Notification List or Empty State
              Expanded(
                child: filteredItems.isEmpty
                    ? _buildEmptyState(context, isHindi)
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                        physics: const BouncingScrollPhysics(),
                        itemCount: filteredItems.length,
                        itemBuilder: (context, index) {
                          final item = filteredItems[index];
                          return NotificationCard(
                            notification: item,
                            onTap: () {
                              notifier.markAsRead(item.id);
                              NotificationDetailSheet.show(
                                context: context,
                                notification: item,
                              );
                            },
                            onDismiss: () {
                              notifier.deleteNotification(item.id);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChip(
    BuildContext context,
    WidgetRef ref, {
    required NotificationCategory category,
    required String label,
    required bool isSelected,
    required int badgeCount,
  }) {
    return AstroChip(
      label: badgeCount > 0 ? '$label ($badgeCount)' : label,
      isSelected: isSelected,
      onTap: () {
        ref.read(notificationsNotifierProvider.notifier).setCategory(category);
      },
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isHindi) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const AstroStateIllustration(
              type: AstroStateType.emptyData,
              size: 130,
            ),
            const SizedBox(height: 24),
            Text(
              isHindi ? 'कोई नई सूचना नहीं है' : 'No Notifications Yet',
              style: AppTypography.headlineMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 280),
              child: Text(
                isHindi
                    ? 'आपके दैनिक पंचांग, गोचर अलर्ट एवं आर्डर से जुड़ी महत्वपूर्ण सूचनाएं यहां प्रदर्शित होंगी।'
                    : 'Your daily panchang, planetary transit updates, and order milestones will appear here.',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.lightTextSecondary,
                  height: 1.45,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
