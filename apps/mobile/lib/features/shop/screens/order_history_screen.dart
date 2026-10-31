import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/shop_provider.dart';
import '../widgets/order_status_badge.dart';
import 'order_detail_screen.dart';
import 'shop_catalog_screen.dart';

/// Redesigned Order History Screen for Astro Sushil
/// Following the shared design system: Warm ivory order cards,
/// high-contrast semantic badges, 18% inclusive GST tags, and accessible touch targets.
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
          l10n.myOrdersTitle,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SubtleCelestialBackground(
        child: ordersAsync.when(
          loading: () => const LoadingIndicator(message: 'Loading orders...'),
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
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    err.toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => ref.refresh(customerOrdersProvider),
                    icon: const Icon(Icons.refresh, size: 16),
                    label: Text(isHindi ? 'पुनः प्रयास करें' : 'Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(120, AppTouchTargets.minTouchTarget),
                    ),
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
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.cardSurfaceParchment,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: const Icon(
                          Icons.receipt_long_outlined,
                          size: 56,
                          color: AppColors.gold,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        isHindi ? 'कोई पिछला आर्डर नहीं मिला' : 'No order history yet',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isHindi
                            ? 'आपके द्वारा खरीदे गए रिपोर्ट, परामर्श, कोर्स एवं आध्यात्मिक उत्पाद यहाँ दिखाई देंगे।'
                            : 'Your purchases across reports, consultations, courses, and shop items will appear here.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13, height: 1.4),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        height: AppTouchTargets.minTouchTarget,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                            );
                          },
                          icon: const Icon(Icons.storefront_outlined, size: 18),
                          label: Text(
                            isHindi ? 'शॉप देखें' : 'Explore Shop Offerings',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
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

            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async {
                ref.invalidate(customerOrdersProvider);
              },
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Filter Chips
                  SizedBox(
                    height: 38,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _FilterChip(
                          label: isHindi ? 'सभी (${orders.length})' : 'All (${orders.length})',
                          isSelected: _selectedFilter == 'ALL',
                          onTap: () => setState(() => _selectedFilter = 'ALL'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: isHindi ? 'प्रक्रियाधीन' : 'Processing',
                          isSelected: _selectedFilter == 'PROCESSING',
                          onTap: () => setState(() => _selectedFilter = 'PROCESSING'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: isHindi ? 'भेज दिया गया' : 'Dispatched',
                          isSelected: _selectedFilter == 'DISPATCHED',
                          onTap: () => setState(() => _selectedFilter = 'DISPATCHED'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: isHindi ? 'डिलीवर' : 'Delivered',
                          isSelected: _selectedFilter == 'DELIVERED',
                          onTap: () => setState(() => _selectedFilter = 'DELIVERED'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: isHindi ? 'रद्द' : 'Cancelled',
                          isSelected: _selectedFilter == 'CANCELLED',
                          onTap: () => setState(() => _selectedFilter = 'CANCELLED'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (filteredOrders.isEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.all(32),
                      child: Center(
                        child: Text(
                          isHindi ? 'इस श्रेणी में कोई आर्डर नहीं' : 'No orders in this category',
                          style: const TextStyle(color: AppColors.lightTextSecondary),
                        ),
                      ),
                    ),
                  ] else ...[
                    ...filteredOrders.map((order) {
                      final shortId = order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.cardSurfaceWarm,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.cardBorder),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    'Order #$shortId',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: AppColors.primary),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OrderStatusBadge(
                                  status: order.status,
                                  fulfillmentStatus: order.fulfillmentStatus,
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${order.items.length} ${order.items.length == 1 ? "item" : "items"}: ${order.items.map((i) => i.title).join(", ")}',
                              style: const TextStyle(fontSize: 13, color: AppColors.lightTextPrimary, height: 1.3),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const Divider(height: 20, color: AppColors.cardBorder),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${order.createdAt.day}/${order.createdAt.month}/${order.createdAt.year}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                                      ),
                                      const SizedBox(height: 2),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: AppColors.gold.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          '18% GST Incl.',
                                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.primary),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      order.formattedAmount,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                                    ),
                                    const SizedBox(width: 10),
                                    OutlinedButton(
                                      onPressed: () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => OrderDetailScreen(orderId: order.id),
                                          ),
                                        );
                                      },
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.primary,
                                        side: const BorderSide(color: AppColors.primary),
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: Text(
                                        isHindi ? 'विवरण' : 'Details',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? Colors.white : AppColors.lightTextPrimary,
        ),
      ),
      selected: isSelected,
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.cardSurfaceWarm,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: isSelected ? AppColors.primary : AppColors.cardBorder),
      ),
      onSelected: (_) => onTap(),
    );
  }
}
