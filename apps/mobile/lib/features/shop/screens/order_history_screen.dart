import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../providers/shop_provider.dart';
import '../widgets/order_status_badge.dart';
import 'order_detail_screen.dart';

class OrderHistoryScreen extends ConsumerWidget {
  const OrderHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final ordersAsync = ref.watch(customerOrdersProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          isHindi ? 'मेरे आर्डर्स एवं रसीदें' : 'My Orders & Purchases',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: ordersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                const SizedBox(height: 12),
                Text(
                  isHindi ? 'आर्डर लोड करने में त्रुटि' : 'Failed to load orders',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(err.toString(), style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.refresh(customerOrdersProvider),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  child: Text(isHindi ? 'पुनः प्रयास करें' : 'Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (orders) {
          if (orders.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.secondary.withValues(alpha: 0.4)),
                    const SizedBox(height: 16),
                    Text(
                      isHindi ? 'कोई पिछला आर्डर नहीं मिला' : 'No order history yet',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isHindi
                          ? 'आपके द्वारा खरीदे गए रिपोर्ट, परामर्श, कोर्स एवं आध्यात्मिक उत्पाद यहाँ दिखाई देंगे।'
                          : 'Your purchases across reports, consultations, courses, and shop items will appear here.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              ref.invalidate(customerOrdersProvider);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (ctx, idx) {
                final order = orders[idx];
                final shortId = order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id;

                return GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => OrderDetailScreen(orderId: order.id),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Order #$shortId',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                            ),
                            OrderStatusBadge(
                              status: order.status,
                              fulfillmentStatus: order.fulfillmentStatus,
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          '${order.items.length} ${order.items.length == 1 ? "item" : "items"}: ${order.items.map((i) => i.title).join(", ")}',
                          style: const TextStyle(fontSize: 13, color: AppColors.lightTextPrimary),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Divider(height: 20, color: AppColors.lightBorder),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}',
                              style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                            ),
                            Text(
                              order.formattedAmount,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
