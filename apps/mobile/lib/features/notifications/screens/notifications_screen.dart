import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/screens/simple_screen_kit.dart';
import '../../../../shared/widgets/astro_design_system.dart';
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

    // Heading, "mark all as read" and category filters. Rendered as the first
    // item of the scrolling content so nothing overflows on short screens or
    // with large text.
    final title = isHindi ? 'सूचनाएं एवं अलर्ट' : 'Notifications';
    final header = Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (state.unreadCount > 0) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Tooltip(
                message: l10n.markAllRead,
                excludeFromSemantics: true,
                child: TextButton.icon(
                  icon: const Icon(Icons.done_all_rounded, size: 22),
                  label: Text(
                    l10n.markAllRead,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.accent,
                    minimumSize: const Size(48, 48),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                  ),
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
              ),
            ),
          ],
          const SizedBox(height: 12),
          // Category filters wrap onto new lines: no hidden sideways scrolling.
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildCategoryChip(
                context,
                ref,
                category: NotificationCategory.all,
                label: isHindi ? 'सभी' : 'All',
                isSelected: state.selectedCategory == NotificationCategory.all,
                badgeCount: state.items.where((i) => !i.isRead).length,
              ),
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
        ],
      ),
    );

    // Body slivers under the shared large-title nav bar.
    final List<Widget> content;
    if (state.isLoading && state.items.isEmpty) {
      content = [const SliverFillRemaining(hasScrollBody: false, child: AstroStateView.loading())];
    } else if (state.errorMessage != null && state.items.isEmpty) {
      content = [
        SliverFillRemaining(
          hasScrollBody: false,
          child: SimpleStateView(
            icon: Icons.cloud_off_rounded,
            iconColor: AppColors.error,
            title: isHindi ? 'सूचनाएं लोड नहीं हो सकीं। कृपया पुनः प्रयास करें।' : "Couldn't load notifications",
            message: isHindi ? null : state.errorMessage!,
            actionLabel: context.l10n.commonTryAgain,
            actionIcon: Icons.refresh_rounded,
            onAction: notifier.load,
          ),
        ),
      ];
    } else if (filteredItems.isEmpty) {
      content = [
        AstroSliverContent(bottom: 0, sliver: SliverToBoxAdapter(child: header)),
        SliverFillRemaining(hasScrollBody: false, child: _buildEmptyState(context, isHindi)),
      ];
    } else {
      content = [
        AstroSliverContent(
          bottom: 24 + MediaQuery.paddingOf(context).bottom,
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                if (index == 0) return header;
                final item = filteredItems[index - 1];
                return NotificationCard(
                  notification: item,
                  onTap: () {
                    notifier.markAsRead(item.id);
                    NotificationDetailSheet.show(
                      context: context,
                      notification: item,
                      onDelete: () => notifier.deleteNotification(item.id),
                    );
                  },
                  onDismiss: () {
                    notifier.deleteNotification(item.id);
                  },
                );
              },
              childCount: filteredItems.length + 1,
            ),
          ),
        ),
      ];
    }

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: CustomScrollView(
          slivers: [
            AstroSliverNavBar(title: title),
            ...content,
          ],
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
    return AstroPill(
      label: badgeCount > 0 ? '$label ($badgeCount)' : label,
      selected: isSelected,
      onTap: () {
        ref.read(notificationsNotifierProvider.notifier).setCategory(category);
      },
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isHindi) {
    return SimpleStateView(
      icon: Icons.notifications_none_rounded,
      title: isHindi ? 'कोई नई सूचना नहीं है' : 'No Notifications Yet',
      message: isHindi
          ? 'आपके दैनिक पंचांग, गोचर अलर्ट एवं आर्डर से जुड़ी महत्वपूर्ण सूचनाएं यहां प्रदर्शित होंगी।'
          : 'Your daily panchang, planetary transit updates, and order milestones will appear here.',
    );
  }
}
