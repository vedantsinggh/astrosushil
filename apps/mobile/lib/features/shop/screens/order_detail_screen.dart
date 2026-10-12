import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../providers/shop_provider.dart';
import '../widgets/order_status_badge.dart';

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final orderAsync = ref.watch(orderDetailProvider(orderId));

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
          isHindi ? 'आर्डर विवरण' : 'Order Details',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: orderAsync.when(
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
                  isHindi ? 'विवरण लोड नहीं हो सका' : 'Unable to load order details',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(err.toString(), style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12)),
              ],
            ),
          ),
        ),
        data: (order) {
          final shortId = order.id.length > 10 ? order.id.substring(0, 10).toUpperCase() : order.id;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status Header Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
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
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                          ),
                          OrderStatusBadge(
                            status: order.status,
                            fulfillmentStatus: order.fulfillmentStatus,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Placed on ${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}',
                        style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Tracking Details (if Dispatched/Delivered)
                if (order.trackingNumber != null && order.trackingNumber!.isNotEmpty) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.local_shipping_outlined, color: AppColors.secondary, size: 22),
                            const SizedBox(width: 8),
                            Text(
                              isHindi ? 'शिपमेंट ट्रैकिंग विवरण' : 'Shipment Tracking',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Tracking ID: ${order.trackingNumber}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 16, color: AppColors.secondary),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: order.trackingNumber!));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Tracking number copied to clipboard')),
                                );
                              },
                            ),
                          ],
                        ),
                        if (order.courierPartner != null)
                          Text(
                            'Courier: ${order.courierPartner}',
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Purchased Items List
                Text(
                  isHindi ? 'खरीदे गए उत्पाद' : 'Purchased Items',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.lightTextPrimary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.lightBorder),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: order.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 20, color: AppColors.lightBorder),
                    itemBuilder: (ctx, idx) {
                      final item = order.items[idx];
                      return Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Qty: ${item.quantity} • ${item.formattedUnitPrice} each',
                                  style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            item.formattedTotal,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // Shipping Address (if physical)
                if (order.shippingAddress != null) ...[
                  Text(
                    isHindi ? 'डिलिवरी पता' : 'Shipping Address',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.lightTextPrimary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.shippingAddress!.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(order.shippingAddress!.formattedAddress, style: const TextStyle(fontSize: 13, height: 1.4)),
                        const SizedBox(height: 4),
                        Text('Phone: ${order.shippingAddress!.phoneNumber}', style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Invoice Breakdown Card
                Text(
                  isHindi ? 'रसीद एवं इनवॉइस विवरण' : 'Invoice & Payment Summary',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.lightTextPrimary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.lightBorder),
                  ),
                  child: Column(
                    children: [
                      _DetailRow(title: isHindi ? 'उप-योग' : 'Subtotal', value: order.formattedSubtotal),
                      const SizedBox(height: 8),
                      _DetailRow(title: isHindi ? 'जीएसटी (18% सम्मिलित)' : 'Taxes (18% Inclusive)', value: order.formattedTax),
                      const SizedBox(height: 8),
                      _DetailRow(title: isHindi ? 'डिलीवरी' : 'Delivery Charges', value: order.formattedShipping),
                      const Divider(height: 20, color: AppColors.lightBorder),
                      _DetailRow(title: isHindi ? 'कुल भुगतान' : 'Total Paid', value: order.formattedAmount, isBold: true),
                    ],
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String title;
  final String value;
  final bool isBold;

  const _DetailRow({required this.title, required this.value, this.isBold = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(fontSize: 13, color: isBold ? AppColors.primary : AppColors.lightTextSecondary, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(value, style: TextStyle(fontSize: isBold ? 16 : 13, fontWeight: isBold ? FontWeight.bold : FontWeight.normal, color: AppColors.primary)),
      ],
    );
  }
}
