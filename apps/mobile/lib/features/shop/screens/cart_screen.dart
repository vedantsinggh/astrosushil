import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/cart_item_model.dart';
import '../providers/cart_provider.dart';
import 'checkout_screen.dart';
import 'shop_catalog_screen.dart';

/// Redesigned Shopping Cart Screen for Astro Sushil
/// Following the shared design system: Warm ivory item cards, free shipping indicator,
/// transparent 18% inclusive GST breakdown, and accessible touch targets.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final cartState = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

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
          l10n.shoppingCartTitle,
          style: const TextStyle(
            color: Colors.white,
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
                style: const TextStyle(color: AppColors.gold, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: cartState.isEmpty
            ? Center(
                child: SingleChildScrollView(
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
                          Icons.shopping_bag_outlined,
                          size: 56,
                          color: AppColors.gold,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        l10n.cartEmptyTitle,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.cartEmptySubtitle,
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
                          icon: const Icon(Icons.explore_outlined, size: 18),
                          label: Text(
                            isHindi ? 'उत्पाद देखें' : 'Explore Shop Offerings',
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
                        return _CartItemCard(
                          item: item,
                          locale: locale.languageCode,
                          isHindi: isHindi,
                          onQuantityChanged: (newQty) {
                            cartNotifier.updateQuantity(item.key, newQty);
                          },
                          onRemove: () => cartNotifier.removeItem(item.key),
                        );
                      },
                    ),

                    const SizedBox(height: 20),

                    // Order Summary Card
                    _buildSummaryCard(cartState, isHindi, l10n),

                    const SizedBox(height: 100),
                  ],
                ),
              ),
      ),
      bottomNavigationBar: cartState.isEmpty
          ? null
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceWarm,
                border: const Border(top: BorderSide(color: AppColors.cardBorder)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  height: AppTouchTargets.minTouchTarget,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                      );
                    },
                    icon: const Icon(Icons.lock_outline, size: 18),
                    label: Text(
                      l10n.proceedToCheckout,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: qualifies ? AppColors.gold.withValues(alpha: 0.12) : AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: qualifies ? AppColors.gold : AppColors.cardBorder,
        ),
      ),
      child: Row(
        children: [
          Icon(
            qualifies ? Icons.verified_rounded : Icons.local_shipping_outlined,
            color: qualifies ? AppColors.gold : AppColors.primary,
            size: 24,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              qualifies
                  ? (isHindi
                      ? 'बधाई! आपका आर्डर निःशुल्क होम डिलीवरी के योग्य है।'
                      : 'You qualify for FREE express shipping on this order!')
                  : (isHindi
                      ? 'मुफ्त डिलीवरी के लिए ₹${((freeThreshold - physicalSubtotal) / 100).round()} का और सामान जोड़ें।'
                      : 'Add ₹${((freeThreshold - physicalSubtotal) / 100).round()} more in physical items for FREE Delivery!'),
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.bold,
                color: qualifies ? AppColors.primary : AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(CartState cartState, bool isHindi, dynamic l10n) {
    final calc = cartState.calculation;
    final subtotal = calc != null ? calc.formattedSubtotal : cartState.formattedLocalSubtotal;
    final shipping = calc != null ? calc.formattedShipping : (cartState.requiresShipping ? '₹99' : 'FREE');
    final total = calc != null ? calc.formattedTotal : cartState.formattedLocalSubtotal;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.orderSummary,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
          ),
          const SizedBox(height: 12),
          _SummaryRow(title: isHindi ? 'मूल मूल्य (Base Fee)' : 'Base Subtotal', value: subtotal),
          const SizedBox(height: 8),
          _SummaryRow(
            title: isHindi ? 'लागू कर (18% जीएसटी सम्मिलित)' : 'Taxes (18% Inclusive GST)',
            value: calc != null ? calc.formattedTax : 'Included',
          ),
          const SizedBox(height: 8),
          _SummaryRow(
            title: isHindi ? 'डिलीवरी शुल्क' : 'Shipping Fee',
            value: shipping,
            isGreen: shipping == 'FREE',
          ),
          const Divider(height: 24, color: AppColors.cardBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l10n.totalAmount,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
              ),
              Text(
                total,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 19, color: AppColors.primary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  final CartItemModel item;
  final String locale;
  final bool isHindi;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onRemove;

  const _CartItemCard({
    required this.item,
    required this.locale,
    required this.isHindi,
    required this.onQuantityChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final bundledAsset = AppAssets.getProductAsset(
      item.product.slug.isNotEmpty ? item.product.slug : item.product.catalogId,
    );

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
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
              color: AppColors.cardSurfaceParchment,
              child: bundledAsset != null
                  ? Image.asset(
                      bundledAsset,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 28, color: AppColors.gold),
                    )
                  : const Icon(Icons.image, size: 28, color: AppColors.gold),
            ),
          ),
          const SizedBox(width: 12),

          // Details & Quantity
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.product.displayTitle(locale),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13.5,
                    color: AppColors.primary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (item.variant != null) ...[
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${item.variant!.name}: ${item.variant!.value}',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
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
                          onTap: () => onQuantityChanged(item.quantity - 1),
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
                          onTap: () => onQuantityChanged(item.quantity + 1),
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                          onPressed: onRemove,
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
  }
}

class _QuantityButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _QuantityButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: AppColors.cardSurfaceParchment,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.cardBorder),
        ),
        child: Center(
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
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
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.bold,
            color: isGreen ? AppColors.success : AppColors.lightTextPrimary,
          ),
        ),
      ],
    );
  }
}
