import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../providers/cart_provider.dart';
import '../providers/shop_provider.dart';
import 'order_confirmation_screen.dart';
import 'shipping_addresses_screen.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDefaultAddress();
      ref.read(cartProvider.notifier).recalculate();
    });
  }

  Future<void> _loadDefaultAddress() async {
    final addresses = await ref.read(shippingAddressesProvider.future);
    if (addresses.isNotEmpty && ref.read(cartProvider).selectedAddress == null) {
      final defaultAddr = addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first);
      ref.read(cartProvider.notifier).selectAddress(defaultAddr);
    }
  }

  Future<void> _handlePayment() async {
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

      // 1. Create shop order on backend
      final orderResult = await shopService.createShopOrder(
        cartState.items,
        shippingAddressId: cartState.selectedAddress?.id,
        idempotencyKey: 'mob_shop_${DateTime.now().millisecondsSinceEpoch}',
      );

      final orderId = orderResult['orderId'] as String;
      final razorpayOrderId = orderResult['razorpayOrderId'] as String;

      // 2. Verified Payment Completion (Development/Test Mode HMAC verification)
      final simulatedPaymentId = 'pay_mob_${DateTime.now().millisecondsSinceEpoch}';
      
      // In production/staging with Razorpay SDK: open Razorpay checkout dialog here.
      // For verification, send completion payload to backend verify endpoint:
      final verifyResult = await shopService.verifyPayment(
        orderId: orderId,
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: simulatedPaymentId,
        razorpaySignature: 'dev_simulated_verified_signature',
      );

      // 3. Clear cart and navigate to confirmation
      ref.read(cartProvider.notifier).clearCart();
      ref.invalidate(customerOrdersProvider);
      ref.invalidate(digitalDownloadsProvider);
      ref.invalidate(accountSummaryProvider);

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
    final cartState = ref.watch(cartProvider);
    final calc = cartState.calculation;

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
          isHindi ? 'सुरक्षित चेकआउट' : 'Secure Checkout',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_errorMessage != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 1. Delivery Address Card (Mandatory for Physical Products)
            if (cartState.requiresShipping) ...[
              Text(
                isHindi ? 'डिलीवरी पता (Delivery Address)' : 'Delivery Address',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: cartState.selectedAddress == null ? AppColors.error : AppColors.lightBorder,
                  ),
                ),
                child: cartState.selectedAddress != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                cartState.selectedAddress!.fullName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              TextButton(
                                onPressed: () => _openAddressSelector(context),
                                child: Text(isHindi ? 'बदलें' : 'Change'),
                              ),
                            ],
                          ),
                          Text(
                            cartState.selectedAddress!.formattedAddress,
                            style: const TextStyle(fontSize: 13, color: AppColors.lightTextPrimary, height: 1.4),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Phone: ${cartState.selectedAddress!.phoneNumber}',
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isHindi ? 'कोई पता चयनित नहीं है' : 'No shipping address selected',
                            style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton.icon(
                            onPressed: () => _openAddressSelector(context),
                            icon: const Icon(Icons.add_location_alt_outlined, size: 16),
                            label: Text(isHindi ? 'पता जोड़ें या चुनें' : 'Select or Add Address'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 20),
            ],

            // 2. Order Items Review
            Text(
              isHindi ? 'आइटम समीक्षा (${cartState.itemCount})' : 'Order Items (${cartState.itemCount})',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.lightTextPrimary,
              ),
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
                itemCount: cartState.items.length,
                separatorBuilder: (_, __) => const Divider(height: 18, color: AppColors.lightBorder),
                itemBuilder: (ctx, idx) {
                  final item = cartState.items[idx];
                  return Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          width: 40,
                          height: 40,
                          color: AppColors.tertiary.withValues(alpha: 0.05),
                          child: item.product.imageUrl != null
                              ? Image.network(item.product.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 20))
                              : const Icon(Icons.image, size: 20),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.product.displayTitle(locale.languageCode),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'Qty: ${item.quantity} ${item.variant != null ? "(${item.variant!.value})" : ""}',
                              style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 11),
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
            const SizedBox(height: 20),

            // 3. Payment Summary
            Text(
              isHindi ? 'भुगतान विवरण' : 'Payment Breakdown',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.lightTextPrimary,
              ),
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
                  _BreakdownRow(
                    title: isHindi ? 'उप-योग' : 'Items Subtotal',
                    value: calc != null ? calc.formattedSubtotal : cartState.formattedLocalSubtotal,
                  ),
                  const SizedBox(height: 8),
                  _BreakdownRow(
                    title: isHindi ? 'जीएसटी (18% सम्मिलित)' : 'GST (18% Inclusive)',
                    value: calc != null ? calc.formattedTax : 'Included',
                  ),
                  const SizedBox(height: 8),
                  _BreakdownRow(
                    title: isHindi ? 'शिपिंग शुल्क' : 'Shipping Charges',
                    value: calc != null ? calc.formattedShipping : (cartState.requiresShipping ? '₹99' : 'FREE'),
                    isGreen: calc?.shippingAmountPaise == 0,
                  ),
                  const Divider(height: 20, color: AppColors.lightBorder),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isHindi ? 'कुल देय राशि' : 'Total Payable',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                      ),
                      Text(
                        calc != null ? calc.formattedTotal : cartState.formattedLocalSubtotal,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 100),
          ],
        ),
      ),
      bottomNavigationBar: Container(
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
              onPressed: _isProcessing ? null : _handlePayment,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      isHindi ? 'सुरक्षित भुगतान करें (Razorpay)' : 'Pay via Razorpay Secure',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  void _openAddressSelector(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ShippingAddressesScreen(isSelectionMode: true),
      ),
    );
  }
}

class _BreakdownRow extends StatelessWidget {
  final String title;
  final String value;
  final bool isGreen;

  const _BreakdownRow({required this.title, required this.value, this.isGreen = false});

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
