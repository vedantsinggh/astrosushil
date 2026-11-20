import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/shop_order_model.dart';
import '../providers/shop_provider.dart';
import '../widgets/order_status_badge.dart';
import '../widgets/shop_ui.dart';
import 'order_detail_screen.dart';
import 'shop_catalog_screen.dart';

/// Order history: simple filter chips and one tappable card per order
/// (number, status, items, date, total).
class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  String _selectedFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final ordersAsync = ref.watch(customerOrdersProvider);

    Widget fill(Widget child) => SliverFillRemaining(hasScrollBody: false, child: child);

    return AstroPage(
      title: l10n.myOrdersTitle,
      onRefresh: () async => ref.invalidate(customerOrdersProvider),
      slivers: [
        ordersAsync.when(
          loading: () =>
              fill(AstroStateView.loading(message: isHindi ? 'आर्डर लोड हो रहे हैं...' : 'Loading orders...')),
          error: (err, _) => fill(ShopStateView(
            icon: Icons.cloud_off_outlined,
            isError: true,
            title: isHindi ? 'आर्डर लोड करने में त्रुटि' : 'Failed to load orders',
            message: isHindi ? 'कृपया अपना इंटरनेट जांचें।' : 'Please check your internet connection.',
            actionLabel: context.l10n.commonTryAgain,
            actionIcon: Icons.refresh,
            onAction: () => ref.invalidate(customerOrdersProvider),
          )),
          data: (orders) {
            if (orders.isEmpty) {
              return fill(ShopStateView(
                icon: Icons.receipt_long_outlined,
                title: isHindi ? 'कोई पिछला आर्डर नहीं मिला' : 'No order history yet',
                message: isHindi
                    ? 'आपके द्वारा खरीदे गए रिपोर्ट, परामर्श, कोर्स एवं आध्यात्मिक उत्पाद यहाँ दिखाई देंगे।'
                    : 'Your purchases across reports, consultations, courses, and shop items will appear here.',
                actionLabel: isHindi ? 'शॉप देखें' : 'Explore Shop Offerings',
                actionIcon: Icons.storefront_outlined,
                onAction: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                  );
                },
              ));
            }

            // Apply filter
            final filteredOrders = orders.where((o) {
              if (_selectedFilter == 'ALL') return true;
              if (_selectedFilter == 'PROCESSING') return o.fulfillmentStatus == 'PROCESSING';
              if (_selectedFilter == 'DISPATCHED') return o.fulfillmentStatus == 'DISPATCHED';
              if (_selectedFilter == 'DELIVERED') return o.fulfillmentStatus == 'DELIVERED';
              if (_selectedFilter == 'CANCELLED') return o.status == 'CANCELLED';
              return true;
            }).toList();

            final filters = <(String, String)>[
              ('ALL', isHindi ? 'सभी (${orders.length})' : 'All (${orders.length})'),
              ('PROCESSING', isHindi ? 'प्रक्रियाधीन' : 'Processing'),
              ('DISPATCHED', isHindi ? 'भेज दिया गया' : 'Dispatched'),
              ('DELIVERED', isHindi ? 'डिलीवर' : 'Delivered'),
              ('CANCELLED', isHindi ? 'रद्द' : 'Cancelled'),
            ];

            return AstroSliverContent(
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Filter chips (wrap instead of hiding off-screen)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final f in filters)
                          AstroPill(
                            label: f.$2,
                            selected: _selectedFilter == f.$1,
                            showCheck: false,
                            onTap: () => setState(() => _selectedFilter = f.$1),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (filteredOrders.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        child: Center(
                          child: Text(
                            isHindi ? 'इस श्रेणी में कोई आर्डर नहीं' : 'No orders in this category',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
                          ),
                        ),
                      )
                    else
                      for (final order in filteredOrders)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _OrderCard(
                            order: order,
                            isHindi: isHindi,
                            onOpen: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id)),
                              );
                            },
                          ),
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

class _OrderCard extends StatelessWidget {
  final ShopOrderModel order;
  final bool isHindi;
  final VoidCallback onOpen;

  const _OrderCard({required this.order, required this.isHindi, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final shortId = order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id;

    return AstroSurfaceCard(
      onTap: onOpen,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.receipt_long_outlined, tint: AstroTint.amber),
              const SizedBox(width: 12),
              Expanded(
                child: Wrap(
                  spacing: 10,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Order #$shortId',
                      style: AppTypography.headlineMedium.copyWith(fontSize: 17),
                    ),
                    OrderStatusBadge(status: order.status, fulfillmentStatus: order.fulfillmentStatus),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${order.items.length} ${order.items.length == 1 ? "item" : "items"}: ${order.items.map((i) => i.title).join(", ")}',
            style: const TextStyle(fontSize: 16, color: AppColors.textPrimary, height: 1.35),
          ),
          const SizedBox(height: 6),
          Text(
            '${AppDateTime.shortNumericDate(order.createdAt)}  ·  18% GST Incl.',
            style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const Divider(height: 24, color: AppColors.cardBorder),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: [
              Text(
                order.formattedAmount,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppColors.primary),
              ),
              TextButton(
                onPressed: onOpen,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isHindi ? 'विवरण' : 'Details',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.chevron_right, size: 22),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
