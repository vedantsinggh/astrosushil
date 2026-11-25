import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../auth/providers/auth_provider.dart';
import '../../reports/models/report_purchase_models.dart';
import '../../reports/services/razorpay_checkout_service.dart';
import '../providers/cart_provider.dart';
import '../providers/shop_provider.dart';
import '../widgets/shop_ui.dart';
import 'order_confirmation_screen.dart';
import 'shipping_addresses_screen.dart';

/// Review & Pay: the last checkout step ("Step 3 of 3" for physical or mixed
/// carts, "Step 2 of 2" for digital-only carts). Shows the address chosen on
/// the address step with a "Change" button back to it, a short item review,
/// the price breakdown with a big total and one gold Pay button. The Pay
/// button is locked while a payment is in progress.
///
/// The address itself is chosen on [ShippingAddressesScreen] in selection
/// mode (step 2); this screen never picks one on its own.
class CheckoutScreen extends ConsumerStatefulWidget {
  /// True when pushed by the address step, so "Change" simply pops back to it.
  final bool openedFromAddressStep;

  const CheckoutScreen({super.key, this.openedFromAddressStep = false});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _isProcessing = false;
  String? _errorMessage;
  late String _idempotencyKey;
  IRazorpayCheckoutService? _razorpay;

  @override
  void initState() {
    super.initState();
    _idempotencyKey = 'mob_shop_${DateTime.now().millisecondsSinceEpoch}';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(cartProvider.notifier).recalculate();
    });
  }

  Future<void> _placeOrder() async {
    final cartState = ref.read(cartProvider);
    final locale = ref.read(localeProvider);
    final isHindi = locale.languageCode == 'hi';

    if (cartState.requiresShipping && cartState.selectedAddress == null) {
      setState(() {
        _errorMessage = isHindi
            ? 'कृपया भौतिक उत्पाद हेतु शिपिंग पता चुनें'
            : 'Please select a delivery address for physical items';
      });
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final shopService = ref.read(shopServiceProvider);

      // 1. Create shop order on backend using the per-attempt idempotencyKey
      final orderResult = await shopService.createShopOrder(
        cartState.items,
        shippingAddressId: cartState.selectedAddress?.id,
        idempotencyKey: _idempotencyKey,
      );

      final nestedOrder = orderResult['order'] as Map<String, dynamic>?;
      final orderId = (orderResult['orderId'] ?? nestedOrder?['id'] ?? '') as String;
      final razorpayOrderId =
          (orderResult['razorpayOrderId'] ?? nestedOrder?['razorpayOrderId'] ?? '') as String;
      final razorpayConfig = orderResult['razorpayConfig'] as Map<String, dynamic>?;
      final razorpayKey = (orderResult['razorpayKey'] ??
              orderResult['razorpayKeyId'] ??
              orderResult['key'] ??
              razorpayConfig?['key'] ??
              '')
          as String;

      if (orderId.isEmpty || razorpayOrderId.isEmpty) {
        setState(() {
          _isProcessing = false;
          _errorMessage = isHindi
              ? 'ऑर्डर बनाने में समस्या हुई। कृपया पुनः प्रयास करें।'
              : 'Could not initialize payment order. Please try again.';
        });
        return;
      }

      if (razorpayKey.isEmpty) {
        setState(() {
          _isProcessing = false;
          _errorMessage = isHindi
              ? 'भुगतान गेटवे कुंजी उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।'
              : 'Payment gateway key is missing. Please try again later.';
        });
        return;
      }

      final rawAmount = orderResult['amount'] ??
          nestedOrder?['amount'] ??
          cartState.calculation?.totalAmountPaise ??
          cartState.localSubtotalPaise;
      final amount = rawAmount is int ? rawAmount : int.tryParse(rawAmount.toString()) ?? 0;
      final rawSubtotal = orderResult['subtotal'] ?? nestedOrder?['subtotal'] ?? amount;
      final subtotal = rawSubtotal is int ? rawSubtotal : int.tryParse(rawSubtotal.toString()) ?? amount;
      final rawTax = orderResult['taxAmount'] ?? nestedOrder?['taxAmount'] ?? 0;
      final taxAmount = rawTax is int ? rawTax : int.tryParse(rawTax.toString()) ?? 0;
      final currency = (orderResult['currency'] ?? nestedOrder?['currency'] ?? 'INR') as String;

      final user = ref.read(authStateProvider).user;
      final IRazorpayCheckoutService razorpay = _razorpay ?? ref.read(razorpayCheckoutServiceProvider);
      _razorpay = razorpay;

      razorpay.init(
        onSuccess: ({
          required String razorpayOrderId,
          required String razorpayPaymentId,
          required String razorpaySignature,
        }) {
          if (!mounted) return;
          _verifyShopPayment(
            orderResult: orderResult,
            orderId: orderId,
            razorpayOrderId: razorpayOrderId.isNotEmpty ? razorpayOrderId : (orderResult['razorpayOrderId'] as String? ?? ''),
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature,
          );
        },
        onFailure: ({required String errorCode, required String errorMessage}) {
          if (!mounted) return;
          setState(() {
            _isProcessing = false;
            _errorMessage = errorMessage.isNotEmpty
                ? errorMessage
                : (isHindi ? 'भुगतान विफल रहा। कृपया पुनः प्रयास करें।' : 'Payment failed. Please try again.');
          });
        },
        onCancel: () {
          if (!mounted) return;
          setState(() {
            _isProcessing = false;
            _errorMessage = isHindi
                ? 'भुगतान रद्द कर दिया गया। आप पुनः प्रयास कर सकते हैं।'
                : 'Payment was cancelled. You can try again.';
          });
        },
      );

      razorpay.openCheckout(
        order: ReportPaymentOrder(
          orderId: orderId,
          razorpayOrderId: razorpayOrderId,
          amount: amount,
          subtotal: subtotal,
          taxAmount: taxAmount,
          currency: currency,
          status: (orderResult['status'] ?? 'PENDING') as String,
          paymentStatus: (orderResult['paymentStatus'] ?? 'PENDING') as String,
          razorpayKey: razorpayKey,
        ),
        reportTitle: isHindi ? 'एस्ट्रो सुशील शॉप ऑर्डर' : 'Astro Sushil Shop Order',
        userEmail: user?.email,
        userContact: user?.phoneNumber,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _verifyShopPayment({
    required Map<String, dynamic> orderResult,
    required String orderId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    try {
      final shopService = ref.read(shopServiceProvider);
      final verifyResult = await shopService.verifyPayment(
        orderId: orderId,
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
      );

      // Clear cart and navigate to confirmation
      ref.read(cartProvider.notifier).clearCart();
      ref.invalidate(customerOrdersProvider);
      ref.invalidate(digitalDownloadsProvider);
      ref.invalidate(accountSummaryProvider);
      // Generate a fresh key for any future checkout session.
      _idempotencyKey = 'mob_shop_${DateTime.now().millisecondsSinceEpoch}';

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => OrderConfirmationScreen(
              orderData: verifyResult['order'] ?? orderResult,
              digitalEntitlements: verifyResult['digitalEntitlements'],
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final cartState = ref.watch(cartProvider);
    final calc = cartState.calculation;
    final total = calc != null ? calc.formattedTotal : cartState.formattedLocalSubtotal;

    return AstroPage(
      title: isHindi ? 'सुरक्षित चेकआउट' : 'Secure Checkout',
      bottomBar: ShopBottomBar(
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
              label: isHindi ? 'सुरक्षित भुगतान करें (Razorpay)' : 'Pay via Razorpay Secure',
              icon: Icons.lock_outline,
              isLoading: _isProcessing,
              onPressed: _placeOrder,
            ),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShopStepIndicator(
            current: cartState.requiresShipping ? 3 : 2,
            isHindi: isHindi,
            includeAddress: cartState.requiresShipping,
          ),
          const SizedBox(height: 20),

          if (_errorMessage != null) ...[
            AstroSurfaceCard(
              color: AppColors.errorBg,
              borderColor: AppColors.errorBorder,
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.error_outline, color: AppColors.tintRoseText, size: 24),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: AppColors.tintRoseText, fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 1. Delivery address (required for physical products)
          if (cartState.requiresShipping) ...[
            AstroSectionHeading(l10n.deliveryAddress),
            AstroSurfaceCard(
              borderColor: cartState.selectedAddress == null ? AppColors.errorBorder : null,
              child: cartState.selectedAddress != null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const AstroIconSquare(icon: Icons.location_on_outlined, tint: AstroTint.coral),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cartState.selectedAddress!.fullName,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    cartState.selectedAddress!.formattedAddress,
                                    style: const TextStyle(fontSize: 16, color: AppColors.textPrimary, height: 1.4),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Phone: ${cartState.selectedAddress!.phoneNumber}',
                                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AstroSecondaryButton(
                          key: const ValueKey('checkout-change-address'),
                          label: context.l10n.commonChange,
                          icon: Icons.edit_location_alt_outlined,
                          onPressed: () => _openAddressStep(context),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.selectAddressPrompt,
                          style: const TextStyle(
                              color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 16, height: 1.4),
                        ),
                        const SizedBox(height: 12),
                        AstroSecondaryButton(
                          label: isHindi ? 'पता जोड़ें या चुनें' : 'Select or Add Address',
                          icon: Icons.add_location_alt_outlined,
                          onPressed: () => _openAddressStep(context),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 24),
          ] else ...[
            // Digital delivery reassurance
            AstroSurfaceCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AstroIconSquare(icon: Icons.download_done_rounded, tint: AstroTint.sage),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l10n.digitalDeliveryReassurance,
                      style: const TextStyle(fontSize: 16, color: AppColors.textPrimary, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // 2. Items
          AstroSectionHeading('${isHindi ? "आइटम समीक्षा" : "Order Items"} (${cartState.itemCount})'),
          AstroSurfaceCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Column(
              children: [
                for (var idx = 0; idx < cartState.items.length; idx++) ...[
                  if (idx > 0) const Divider(height: 1, color: AppColors.cardBorder),
                  Builder(builder: (ctx) {
                    final item = cartState.items[idx];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: SizedBox(
                              width: 48,
                              height: 48,
                              child: ShopProductImage(
                                assetKey: item.product.slug.isNotEmpty ? item.product.slug : item.product.catalogId,
                                isPhysical: item.product.isPhysical,
                                iconSize: 22,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.product.displayTitle(locale.languageCode),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.primary, height: 1.3),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Qty: ${item.quantity} ${item.variant != null ? "(${item.variant!.value})" : ""}',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            item.formattedTotal,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 3. Payment summary
          AstroSectionHeading(isHindi ? 'भुगतान विवरण' : 'Payment Breakdown'),
          AstroSurfaceCard(
            child: Column(
              children: [
                ShopPriceRow(
                  label: isHindi ? 'मूल मूल्य (Base Subtotal)' : 'Base Subtotal',
                  value: calc != null ? calc.formattedSubtotal : cartState.formattedLocalSubtotal,
                ),
                ShopPriceRow(
                  label: isHindi ? 'जीएसटी (18% सम्मिलित)' : 'GST (18% Inclusive)',
                  value: calc != null ? calc.formattedTax : 'Included',
                ),
                ShopPriceRow(
                  label: isHindi ? 'शिपिंग शुल्क' : 'Shipping Charges',
                  value: calc != null ? calc.formattedShipping : (cartState.requiresShipping ? '₹99' : 'FREE'),
                  valueColor: calc?.shippingAmountPaise == 0 ? kShopSuccessText : null,
                ),
                const Divider(height: 24, color: AppColors.cardBorder),
                ShopTotalRow(label: l10n.totalAmount, value: total),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Back to the address step (step 2). When this screen was pushed by that
  /// step, pop to it so the back stack stays Cart → Address → Pay. Otherwise
  /// replace this screen with the address step, which pushes a fresh
  /// Review & Pay screen once an address is chosen.
  void _openAddressStep(BuildContext context) {
    final navigator = Navigator.of(context);
    if (widget.openedFromAddressStep && navigator.canPop()) {
      navigator.pop();
      return;
    }
    navigator.pushReplacement(
      MaterialPageRoute(
        builder: (_) => const ShippingAddressesScreen(isSelectionMode: true),
      ),
    );
  }
}
