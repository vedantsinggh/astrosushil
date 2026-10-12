import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../providers/cart_provider.dart';
import 'checkout_screen.dart';
import 'shop_catalog_screen.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final cartState = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

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
          isHindi ? 'आपकी कार्ट' : 'Shopping Cart',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          if (!cartState.isEmpty)
            TextButton(
              onPressed: () => cartNotifier.clearCart(),
              child: Text(
                isHindi ? 'खाली करें' : 'Clear',
                style: const TextStyle(color: AppColors.error, fontSize: 13),
              ),
            ),
        ],
      ),
      body: cartState.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.shopping_bag_outlined,
                      size: 64,
                      color: AppColors.secondary.withValues(alpha: 0.4),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      isHindi ? 'आपकी कार्ट खाली है' : 'Your cart is empty',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isHindi
                          ? 'हमारे पवित्र वॉलपेपर, कला और अभिमंत्रित उत्पादों को देखें।'
                          : 'Explore our consecrated wallpapers, sacred art, and spiritual remedies.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(isHindi ? 'उत्पाद देखें' : 'Explore Shop Offerings'),
                    ),
                  ],
                ),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Free Shipping Notice Banner for physical items
                  if (cartState.requiresShipping) ...[
                    _buildShippingBanner(cartState, isHindi),
                    const SizedBox(height: 16),
                  ],

                  // Items List
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: cartState.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, idx) {
                      final item = cartState.items[idx];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.lightBorder),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Thumbnail
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                width: 70,
                                height: 70,
                                color: AppColors.tertiary.withValues(alpha: 0.05),
                                child: item.product.imageUrl != null && item.product.imageUrl!.isNotEmpty
                                    ? Image.network(
                                        item.product.imageUrl!,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 28),
                                      )
                                    : const Icon(Icons.image, size: 28),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Details & Quantity
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.product.displayTitle(locale.languageCode),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: AppColors.lightTextPrimary,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (item.variant != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      '${item.variant!.name}: ${item.variant!.value}',
                                      style: const TextStyle(
                                        color: AppColors.secondary,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        item.formattedTotal,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      // Quantity Controls
                                      Row(
                                        children: [
                                          _QuantityButton(
                                            icon: Icons.remove,
                                            onTap: () => cartNotifier.updateQuantity(
                                              item.key,
                                              item.quantity - 1,
                                            ),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 10),
                                            child: Text(
                                              item.quantity.toString(),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                              ),
                                            ),
                                          ),
                                          _QuantityButton(
                                            icon: Icons.add,
                                            onTap: () => cartNotifier.updateQuantity(
                                              item.key,
                                              item.quantity + 1,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                                            onPressed: () => cartNotifier.removeItem(item.key),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 20),

                  // Order Summary Card
                  _buildSummaryCard(cartState, isHindi),

                  const SizedBox(height: 100),
                ],
              ),
            ),
      bottomNavigationBar: cartState.isEmpty
          ? null
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      isHindi ? 'चेकआउट के लिए आगे बढ़ें' : 'Proceed to Checkout',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildShippingBanner(CartState cartState, bool isHindi) {
    final physicalSubtotal = cartState.items
        .where((i) => i.requiresShipping)
        .fold(0, (sum, i) => sum + i.totalPaise);
    const freeThreshold = 200000; // ₹2,000 in paise
    final qualifies = physicalSubtotal >= freeThreshold;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: qualifies ? AppColors.success.withValues(alpha: 0.1) : AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: qualifies ? AppColors.success.withValues(alpha: 0.4) : AppColors.primary.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            qualifies ? Icons.check_circle_outline : Icons.local_shipping_outlined,
            color: qualifies ? AppColors.success : AppColors.primary,
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              qualifies
                  ? (isHindi
                      ? 'बधाई! आपका आर्डर निःशुल्क होम डिलीवरी के योग्य है।'
                      : 'You qualify for FREE express shipping on this order!')
                  : (isHindi
                      ? 'मुफ्त डिलीवरी के लिए ₹${((freeThreshold - physicalSubtotal) / 100).round()} का और आर्डर जोड़ें।'
                      : 'Add ₹${((freeThreshold - physicalSubtotal) / 100).round()} more in physical items for FREE Delivery!'),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: qualifies ? AppColors.success : AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(CartState cartState, bool isHindi) {
    final calc = cartState.calculation;
    final subtotal = calc != null ? calc.formattedSubtotal : cartState.formattedLocalSubtotal;
    final shipping = calc != null ? calc.formattedShipping : (cartState.requiresShipping ? '₹99' : 'FREE');
    final total = calc != null ? calc.formattedTotal : cartState.formattedLocalSubtotal;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isHindi ? 'आर्डर सारांश' : 'Order Summary',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary),
          ),
          const SizedBox(height: 12),
          _SummaryRow(title: isHindi ? 'उप-योग (Subtotal)' : 'Subtotal', value: subtotal),
          const SizedBox(height: 8),
          _SummaryRow(
            title: isHindi ? 'लागू कर (18% जीएसटी)' : 'Taxes (18% Inclusive GST)',
            value: calc != null ? calc.formattedTax : 'Included',
          ),
          const SizedBox(height: 8),
          _SummaryRow(
            title: isHindi ? 'डिलीवरी शुल्क' : 'Shipping Fee',
            value: shipping,
            isGreen: shipping == 'FREE',
          ),
          const Divider(height: 24, color: AppColors.lightBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isHindi ? 'कुल देय राशि' : 'Total Payable',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
              ),
              Text(
                total,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuantityButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _QuantityButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.lightBackground,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.lightBorder),
        ),
        child: Icon(icon, size: 16, color: AppColors.primary),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String title;
  final String value;
  final bool isGreen;

  const _SummaryRow({required this.title, required this.value, this.isGreen = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary)),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: isGreen ? AppColors.success : AppColors.lightTextPrimary,
          ),
        ),
      ],
    );
  }
}
