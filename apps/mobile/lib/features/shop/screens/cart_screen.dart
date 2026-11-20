import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/cart_item_model.dart';
import '../providers/cart_provider.dart';
import '../widgets/shop_ui.dart';
import 'checkout_screen.dart';
import 'shipping_addresses_screen.dart';
import 'shop_catalog_screen.dart';

/// Cart (step 1 of 3, or 1 of 2 for digital-only carts): items with large
/// quantity buttons, a short price summary with a big total, and one gold
/// "Proceed to Checkout" button. Physical carts continue to the address step;
/// digital-only carts go straight to Review & Pay.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  Future<void> _confirmClear(BuildContext context, CartNotifier cartNotifier, bool isHindi) async {
    final confirmed = await showAstroConfirm(
      context: context,
      title: isHindi ? 'कार्ट खाली करें?' : 'Empty your cart?',
      message: isHindi ? 'सभी आइटम कार्ट से हटा दिए जाएंगे।' : 'All items will be removed from your cart.',
      confirmLabel: isHindi ? 'खाली करें' : 'Empty cart',
      cancelLabel: isHindi ? 'रद्द करें' : 'Keep items',
      destructive: true,
    );
    if (confirmed) cartNotifier.clearCart();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final cartState = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

    final calc = cartState.calculation;
    final total = calc != null ? calc.formattedTotal : cartState.formattedLocalSubtotal;

    return AstroPage(
      title: l10n.shoppingCartTitle,
      actions: [
        if (!cartState.isEmpty)
          AstroNavAction.text(
            label: isHindi ? 'खाली करें' : 'Clear',
            color: AppColors.errorText,
            onPressed: () => _confirmClear(context, cartNotifier, isHindi),
          ),
      ],
      slivers: cartState.isEmpty
          ? [
              SliverFillRemaining(
                hasScrollBody: false,
                child: ShopStateView(
                  icon: Icons.shopping_bag_outlined,
                  title: l10n.cartEmptyTitle,
                  message: l10n.cartEmptySubtitle,
                  actionLabel: isHindi ? 'उत्पाद देखें' : 'Explore Shop Offerings',
                  actionIcon: Icons.storefront_outlined,
                  onAction: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                    );
                  },
                ),
              ),
            ]
          : [
              AstroSliverContent(
                bottom: 24,
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ShopStepIndicator(
                        current: 1,
                        isHindi: isHindi,
                        includeAddress: cartState.requiresShipping,
                      ),
                      const SizedBox(height: 20),

                      // Free shipping notice for physical items
                      if (cartState.requiresShipping) ...[
                        _buildShippingBanner(cartState, isHindi),
                        const SizedBox(height: 16),
                      ],

                      // Items
                      for (final item in cartState.items) ...[
                        _CartItemCard(
                          item: item,
                          locale: locale.languageCode,
                          isHindi: isHindi,
                          onQuantityChanged: (newQty) {
                            cartNotifier.updateQuantity(item.key, newQty);
                          },
                          onRemove: () => cartNotifier.removeItem(item.key),
                        ),
                        const SizedBox(height: 12),
                      ],

                      const SizedBox(height: 8),

                      // Order summary
                      _buildSummaryCard(cartState, isHindi, l10n),
                    ],
                  ),
                ),
              ),
            ],
      bottomBar: cartState.isEmpty
          ? null
          : ShopBottomBar(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (MediaQuery.textScalerOf(context).scale(1.0) < 1.5) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l10n.totalAmount,
                            style: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
                          ),
                        ),
                        Text(
                          total,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                  AstroPrimaryButton(
                    label: l10n.proceedToCheckout,
                    icon: Icons.arrow_forward,
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => cartState.requiresShipping
                              ? const ShippingAddressesScreen(isSelectionMode: true)
                              : const CheckoutScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildShippingBanner(CartState cartState, bool isHindi) {
    final physicalSubtotal = cartState.items.where((i) => i.requiresShipping).fold(0, (sum, i) => sum + i.totalPaise);
    const freeThreshold = 200000; // ₹2,000 in paise
    final qualifies = physicalSubtotal >= freeThreshold;

    return AstroSurfaceCard(
      color: qualifies ? AppColors.successBg : AppColors.cardSurface,
      borderColor: qualifies ? AppColors.successBorder : AppColors.cardBorder,
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AstroIconSquare(
            icon: qualifies ? Icons.local_shipping : Icons.local_shipping_outlined,
            tint: qualifies ? AstroTint.sage : AstroTint.amber,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              qualifies
                  ? (isHindi
                      ? 'बधाई! आपका आर्डर निःशुल्क होम डिलीवरी के योग्य है।'
                      : 'You qualify for FREE express shipping on this order!')
                  : (isHindi
                      ? 'मुफ्त डिलीवरी के लिए ₹${((freeThreshold - physicalSubtotal) / 100).round()} का और सामान जोड़ें।'
                      : 'Add ₹${((freeThreshold - physicalSubtotal) / 100).round()} more in physical items for FREE Delivery!'),
              style: const TextStyle(fontSize: 16, height: 1.35, fontWeight: FontWeight.w600, color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(CartState cartState, bool isHindi, AppLocalizations l10n) {
    final calc = cartState.calculation;
    final subtotal = calc != null ? calc.formattedSubtotal : cartState.formattedLocalSubtotal;
    final shipping = calc != null ? calc.formattedShipping : (cartState.requiresShipping ? '₹99' : 'FREE');
    final total = calc != null ? calc.formattedTotal : cartState.formattedLocalSubtotal;

    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AstroSectionHeading(l10n.orderSummary),
          ShopPriceRow(label: isHindi ? 'मूल मूल्य (Base Fee)' : 'Base Subtotal', value: subtotal),
          ShopPriceRow(
            label: isHindi ? 'लागू कर (18% जीएसटी सम्मिलित)' : 'Taxes (18% Inclusive GST)',
            value: calc != null ? calc.formattedTax : 'Included',
          ),
          ShopPriceRow(
            label: isHindi ? 'डिलीवरी शुल्क' : 'Shipping Fee',
            value: shipping,
            valueColor: shipping == 'FREE' ? kShopSuccessText : null,
          ),
          const Divider(height: 24, color: AppColors.cardBorder),
          ShopTotalRow(label: l10n.totalAmount, value: total),
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
    return AstroSurfaceCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 72,
                  height: 72,
                  child: ShopProductImage(
                    assetKey: item.product.slug.isNotEmpty ? item.product.slug : item.product.catalogId,
                    isPhysical: item.product.isPhysical,
                    iconSize: 28,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.product.displayTitle(locale),
                      style: AppTypography.headlineMedium.copyWith(fontSize: 17, height: 1.3),
                    ),
                    if (item.variant != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${item.variant!.name}: ${item.variant!.value}',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      item.formattedTotal,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: [
              // Quantity stepper
              Container(
                decoration: BoxDecoration(
                  color: AppColors.cardSurfaceParchment,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _QuantityButton(
                      icon: Icons.remove,
                      tooltip: isHindi ? 'मात्रा घटाएं' : 'Decrease quantity',
                      onTap: () => onQuantityChanged(item.quantity - 1),
                    ),
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 36),
                      child: Text(
                        item.quantity.toString(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                      ),
                    ),
                    _QuantityButton(
                      icon: Icons.add,
                      tooltip: isHindi ? 'मात्रा बढ़ाएं' : 'Increase quantity',
                      onTap: () => onQuantityChanged(item.quantity + 1),
                    ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: onRemove,
                icon: const Icon(Icons.delete_outline, size: 22),
                label: Text(isHindi ? 'हटाएं' : 'Remove', style: const TextStyle(fontSize: 16)),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.tintRoseText,
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
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
  final String tooltip;
  final VoidCallback onTap;

  const _QuantityButton({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onTap,
      icon: Icon(icon, size: 22, color: AppColors.primary),
      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      style: IconButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
