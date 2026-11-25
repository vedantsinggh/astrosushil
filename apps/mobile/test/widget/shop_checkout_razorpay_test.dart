import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/providers/cart_provider.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/screens/checkout_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_confirmation_screen.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/consultation_fakes.dart';
import '../ui_audit/audit_fixtures.dart';

class _CheckoutFakeShopService extends Fake implements ShopService {
  final List<String?> idempotencyKeys = [];
  final List<Map<String, dynamic>> verifyCalls = [];

  @override
  Future<CartCalculationResult> calculateCart(
    List<CartItemModel> items, {
    String? shippingAddressId,
  }) async {
    return const CartCalculationResult(
      items: [],
      subtotalPaise: 99900,
      taxAmountPaise: 0,
      shippingAmountPaise: 0,
      totalAmountPaise: 99900,
    );
  }

  @override
  Future<Map<String, dynamic>> createShopOrder(
    List<CartItemModel> items, {
    String? shippingAddressId,
    String? idempotencyKey,
    String? notes,
  }) async {
    idempotencyKeys.add(idempotencyKey);
    return {
      'orderId': 'ord_shop_1',
      'razorpayOrderId': 'rzp_shop_1',
      'amount': 99900,
      'subtotal': 99900,
      'taxAmount': 0,
      'currency': 'INR',
      'razorpayKey': 'rzp_live_from_backend',
    };
  }

  @override
  Future<Map<String, dynamic>> verifyPayment({
    required String orderId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    verifyCalls.add({
      'orderId': orderId,
      'razorpayOrderId': razorpayOrderId,
      'razorpayPaymentId': razorpayPaymentId,
      'razorpaySignature': razorpaySignature,
    });
    return {
      'order': {
        'id': orderId,
        'status': 'PAID',
        'amount': 99900,
      },
    };
  }
}

class _TestCartNotifier extends CartNotifier {
  _TestCartNotifier(super.ref, CartState initial) {
    state = initial;
  }
}

void main() {
  testWidgets('CheckoutScreen wires IRazorpayCheckoutService and reuses idempotencyKey on retry',
      (tester) async {
    final shop = _CheckoutFakeShopService();
    final razorpay = FakeRazorpayCheckoutService();
    const product = ProductModel(
      id: 'prod_1',
      slug: 'wallpaper-1',
      catalogId: 'wallpaper-1',
      title: 'Ganesha Wallpaper',
      category: 'WALLPAPER',
      productType: 'DIGITAL_WALLPAPER',
      mrp: 99900,
      price: 99900,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: baseOverrides(extra: [
          shopServiceProvider.overrideWithValue(shop),
          razorpayCheckoutServiceProvider.overrideWithValue(razorpay),
          cartProvider.overrideWith(
            (ref) => _TestCartNotifier(
              ref,
              CartState(items: [const CartItemModel(product: product, quantity: 1)]),
            ),
          ),
        ]),
        child: const MaterialApp(
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: CheckoutScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // First tap: creates order and opens Razorpay with backend key
    await tester.tap(find.text('Pay via Razorpay Secure'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(razorpay.openCalls, 1);
    expect(razorpay.lastOrder?.razorpayKey, 'rzp_live_from_backend');
    expect(razorpay.lastOrder?.razorpayOrderId, 'rzp_shop_1');
    expect(shop.idempotencyKeys.length, 1);

    // User cancels Razorpay
    razorpay.cancel();
    await tester.pumpAndSettle();
    expect(find.textContaining('cancelled'), findsOneWidget);

    // Retry tap: reuses the SAME idempotencyKey
    await tester.tap(find.text('Pay via Razorpay Secure'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(shop.idempotencyKeys.length, 2);
    expect(shop.idempotencyKeys[1], shop.idempotencyKeys[0]);

    // Gateway succeeds -> verifyPayment called with real gateway response (not hardcoded dev strings)
    razorpay.succeed(paymentId: 'pay_real_123', signature: 'sig_real_456');
    await tester.pumpAndSettle();

    expect(shop.verifyCalls.length, 1);
    expect(shop.verifyCalls.single['razorpayPaymentId'], 'pay_real_123');
    expect(shop.verifyCalls.single['razorpaySignature'], 'sig_real_456');
    expect(find.byType(OrderConfirmationScreen), findsOneWidget);
  });
}
