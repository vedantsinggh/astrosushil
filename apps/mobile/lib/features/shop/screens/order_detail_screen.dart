import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../providers/shop_provider.dart';
import '../widgets/order_status_badge.dart';
import '../widgets/order_status_timeline.dart';
import '../widgets/shop_ui.dart';
import 'digital_downloads_screen.dart';

/// Order detail: status pill and a simple visual timeline first, then
/// tracking, downloads, items, address, invoice and a support button.
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

    Widget fill(Widget child) => SliverFillRemaining(hasScrollBody: false, child: child);

    return AstroPage(
      title: l10n.orderDetailsTitle,
      onRefresh: () async => ref.invalidate(orderDetailProvider(orderId)),
      slivers: [
        orderAsync.when(
          loading: () =>
              fill(AstroStateView.loading(message: isHindi ? 'आर्डर लोड हो रहा है...' : 'Loading order details...')),
          error: (err, _) => fill(ShopStateView(
            icon: Icons.cloud_off_outlined,
            isError: true,
            title: isHindi ? 'विवरण लोड नहीं हो सका' : 'Unable to load order details',
            message: isHindi ? 'कृपया अपना इंटरनेट जांचें।' : 'Please check your internet connection.',
            actionLabel: context.l10n.commonTryAgain,
            actionIcon: Icons.refresh,
            onAction: () => ref.invalidate(orderDetailProvider(orderId)),
          )),
          data: (order) {
            final shortId = order.id.length > 10 ? order.id.substring(0, 10).toUpperCase() : order.id;
            final hasDigital = order.items.any((i) => !i.title.toLowerCase().contains('herb'));

            return AstroSliverContent(
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header: one hero summary card.
                    AstroGradientCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 10,
                            runSpacing: 8,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                'Order #$shortId',
                                style: AppTypography.headlineLarge.copyWith(fontSize: 21, color: Colors.white),
                              ),
                              OrderStatusBadge(status: order.status, fulfillmentStatus: order.fulfillmentStatus),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Placed on ${AppDateTime.shortNumericDate(order.createdAt)}',
                            style: const TextStyle(color: AppColors.textInverseSecondary, fontSize: 15),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            order.formattedAmount,
                            style: const TextStyle(color: AppColors.gold, fontSize: 26, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Status timeline
                    AstroSurfaceCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AstroSectionHeading(isHindi ? 'आर्डर की स्थिति' : 'Order status'),
                          OrderStatusTimeline(order: order, isHindi: isHindi),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Tracking
                    if (order.trackingNumber != null && order.trackingNumber!.isNotEmpty) ...[
                      AstroSurfaceCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const AstroIconSquare(icon: Icons.local_shipping_outlined, tint: AstroTint.amber),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    isHindi ? 'शिपमेंट ट्रैकिंग विवरण' : 'Shipment Tracking',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.primary),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            SelectableText(
                              'Tracking ID: ${order.trackingNumber}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.textPrimary),
                            ),
                            if (order.courierPartner != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Courier: ${order.courierPartner}',
                                style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                              ),
                            ],
                            const SizedBox(height: 12),
                            AstroSecondaryButton(
                              label: isHindi ? 'ट्रैकिंग नंबर कॉपी करें' : 'Copy tracking number',
                              icon: Icons.copy_rounded,
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: order.trackingNumber!));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Tracking number copied to clipboard')),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Digital downloads
                    if (hasDigital) ...[
                      AstroSurfaceCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const AstroIconSquare(icon: Icons.download_for_offline_outlined, tint: AstroTint.sky),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isHindi ? 'डिजिटल उत्पाद उपलब्ध' : 'Digital Downloads Available',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.primary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        isHindi
                                            ? 'सुरक्षित 15-मिनट डाउनलोड लिंक से फ़ाइलें प्राप्त करें'
                                            : 'Access secure 15-min signed download links',
                                        style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            AstroSecondaryButton(
                              label: isHindi ? 'डाउनलोड्स' : 'Downloads',
                              icon: Icons.folder_open_outlined,
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => const DigitalDownloadsScreen()),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Items
                    AstroSectionHeading(isHindi ? 'खरीदे गए उत्पाद' : 'Purchased Items'),
                    AstroSurfaceCard(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      child: Column(
                        children: [
                          for (var idx = 0; idx < order.items.length; idx++) ...[
                            if (idx > 0) const Divider(height: 1, color: AppColors.cardBorder),
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          order.items[idx].title,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.primary),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Qty: ${order.items[idx].quantity} • ${order.items[idx].formattedUnitPrice} each',
                                          style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    order.items[idx].formattedTotal,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Shipping address
                    if (order.shippingAddress != null) ...[
                      AstroSectionHeading(isHindi ? 'डिलिवरी पता' : 'Shipping Address'),
                      AstroSurfaceCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.shippingAddress!.fullName,
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              order.shippingAddress!.formattedAddress,
                              style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Phone: ${order.shippingAddress!.phoneNumber}',
                              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Invoice
                    AstroSectionHeading(isHindi ? 'रसीद एवं इनवॉइस विवरण' : 'Invoice & Payment Summary'),
                    AstroSurfaceCard(
                      child: Column(
                        children: [
                          ShopPriceRow(
                              label: isHindi ? 'मूल मूल्य (Subtotal)' : 'Base Subtotal',
                              value: order.formattedSubtotal),
                          ShopPriceRow(
                              label: isHindi ? 'जीएसटी (18% सम्मिलित)' : 'Taxes (18% Inclusive)',
                              value: order.formattedTax),
                          ShopPriceRow(
                            label: isHindi ? 'डिलीवरी शुल्क' : 'Delivery Charges',
                            value: order.formattedShipping,
                            valueColor: order.formattedShipping == 'FREE' ? kShopSuccessText : null,
                          ),
                          const Divider(height: 24, color: AppColors.cardBorder),
                          ShopTotalRow(label: isHindi ? 'कुल भुगतान' : 'Total Paid', value: order.formattedAmount),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Support
                    AstroSecondaryButton(
                      label:
                          isHindi ? 'इस आर्डर हेतु सहायता प्राप्त करें' : 'Need help with this order? Contact Support',
                      icon: Icons.chat_bubble_outline_rounded,
                      onPressed: () => _launchWhatsAppSupport(context, shortId),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
