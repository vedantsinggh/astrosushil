import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/shop_provider.dart';
import '../widgets/order_status_badge.dart';
import 'digital_downloads_screen.dart';

/// Redesigned Order Detail Screen for Astro Sushil
/// Following the shared design system: Warm ivory surfaces,
/// shipment tracking details, itemized 18% GST invoices, and support actions.
class OrderDetailScreen extends ConsumerWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  Future<void> _launchWhatsAppSupport(BuildContext context, String shortId) async {
    const phone = '919621127233';
    final message = Uri.encodeComponent(
      'Namaste Astro Sushil Support, I need assistance regarding my Order #$shortId.',
    );
    final uri = Uri.parse('https://wa.me/$phone?text=$message');

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support: +91 9621127233')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support: +91 9621127233')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final orderAsync = ref.watch(orderDetailProvider(orderId));

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: AppColors.midnightNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          l10n.orderDetailsTitle,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SubtleCelestialBackground(
        child: orderAsync.when(
          loading: () => const LoadingIndicator(message: 'Loading order details...'),
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
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    err.toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          data: (order) {
            final shortId = order.id.length > 10 ? order.id.substring(0, 10).toUpperCase() : order.id;
            final hasDigital = order.items.any((i) => !i.title.toLowerCase().contains('herb'));

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
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.cardBorder),
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
                        color: AppColors.cardSurfaceWarm,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.gold.withValues(alpha: 0.6)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.local_shipping_outlined, color: AppColors.gold, size: 22),
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
                                icon: const Icon(Icons.copy, size: 16, color: AppColors.primary),
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

                  // Digital Downloads Access Card (if digital items present)
                  if (hasDigital) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurfaceWarm,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.download_for_offline_outlined, color: AppColors.gold, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isHindi ? 'डिजिटल उत्पाद उपलब्ध' : 'Digital Downloads Available',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.primary),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isHindi
                                      ? 'सुरक्षित 15-मिनट डाउनलोड लिंक से फ़ाइलें प्राप्त करें'
                                      : 'Access secure 15-min signed download links',
                                  style: const TextStyle(fontSize: 11.5, color: AppColors.lightTextSecondary),
                                ),
                              ],
                            ),
                          ),
                          OutlinedButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const DigitalDownloadsScreen()),
                              );
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: Text(
                              isHindi ? 'डाउनलोड्स' : 'Downloads',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Purchased Items List
                  Text(
                    isHindi ? 'खरीदे गए उत्पाद' : 'Purchased Items',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: order.items.length,
                      separatorBuilder: (_, __) => const Divider(height: 20, color: AppColors.cardBorder),
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
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppColors.primary),
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
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurfaceWarm,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(order.shippingAddress!.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary)),
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
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Column(
                      children: [
                        _DetailRow(title: isHindi ? 'मूल मूल्य (Subtotal)' : 'Base Subtotal', value: order.formattedSubtotal),
                        const SizedBox(height: 8),
                        _DetailRow(title: isHindi ? 'जीएसटी (18% सम्मिलित)' : 'Taxes (18% Inclusive)', value: order.formattedTax),
                        const SizedBox(height: 8),
                        _DetailRow(title: isHindi ? 'डिलीवरी शुल्क' : 'Delivery Charges', value: order.formattedShipping),
                        const Divider(height: 20, color: AppColors.cardBorder),
                        _DetailRow(title: isHindi ? 'कुल भुगतान' : 'Total Paid', value: order.formattedAmount, isBold: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // WhatsApp Support Action
                  SizedBox(
                    width: double.infinity,
                    height: AppTouchTargets.minTouchTarget,
                    child: OutlinedButton.icon(
                      onPressed: () => _launchWhatsAppSupport(context, shortId),
                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                      label: Text(
                        isHindi ? 'इस आर्डर हेतु सहायता प्राप्त करें' : 'Need help with this order? Contact Support',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.cardBorder),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            );
          },
        ),
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
        Text(
          title,
          style: TextStyle(
            fontSize: 13,
            color: isBold ? AppColors.primary : AppColors.lightTextSecondary,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 16 : 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}
