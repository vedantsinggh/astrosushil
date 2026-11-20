// Shop checkout steps: Cart → Address → Review & Pay for physical carts
// (the address step is always shown, with the last-used / default address
// pre-selected), and Cart → Pay for digital-only carts. Runs on iOS and
// Android.
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/models/shipping_address_model.dart';
import 'package:astro_mobile/features/shop/providers/cart_provider.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/features/shop/screens/checkout_screen.dart';
import 'package:astro_mobile/features/shop/screens/shipping_addresses_screen.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/widgets/astro_design_system.dart';

import '../ui_audit/audit_fixtures.dart';
import 'phase8_screens_capture_test.dart' as p8 show MockCaptureShopService;

final _platforms = TargetPlatformVariant.only(TargetPlatform.iOS)..values.add(TargetPlatform.android);

const _home = ShippingAddressModel(
  id: 'addr_home',
  fullName: 'Sushil Seeker',
  phoneNumber: '9876543210',
  addressLine1: 'Flat 402, Ram Darbar Heights',
  city: 'Ayodhya',
  state: 'Uttar Pradesh',
  postalCode: '224123',
  isDefault: true,
);

const _office = ShippingAddressModel(
  id: 'addr_office',
  fullName: 'Office Desk',
  phoneNumber: '9123456780',
  addressLine1: '12 MG Road, Tower B',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  postalCode: '226001',
);

/// The shared capture fake, with a mutable address book and a record of
/// the address id sent to order creation.
class _CheckoutShop extends p8.MockCaptureShopService {
  _CheckoutShop(List<ShippingAddressModel> initial) : addresses = [...initial];

  final List<ShippingAddressModel> addresses;
  final List<String?> orderAddressIds = [];
  int _created = 0;

  @override
  Future<List<ShippingAddressModel>> fetchShippingAddresses() async => List.of(addresses);

  @override
  Future<ShippingAddressModel> createShippingAddress(ShippingAddressModel a) async {
    _created++;
    final saved = ShippingAddressModel(
      id: 'addr_new_$_created',
      fullName: a.fullName,
      phoneNumber: a.phoneNumber,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault,
    );
    addresses.add(saved);
    return saved;
  }

  @override
  Future<Map<String, dynamic>> createShopOrder(
    List<CartItemModel> items, {
    String? shippingAddressId,
    String? idempotencyKey,
    String? notes,
  }) async {
    orderAddressIds.add(shippingAddressId);
    return {'orderId': 'ord_steps_1', 'razorpayOrderId': 'rzp_steps_1'};
  }

  @override
  Future<Map<String, dynamic>> verifyPayment({
    required String orderId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    return {
      'order': {'id': orderId, 'amount': 399900},
    };
  }
}

class _Cart extends CartNotifier {
  _Cart(super.ref, CartState s) {
    state = s;
  }
}

List<Override> _overrides(_CheckoutShop shop, {required bool physical}) {
  final products = shop.mockProducts;
  final item = CartItemModel(product: physical ? products[0] : products[1], quantity: 1);
  // Later overrides win, so these replace the base shop service / cart.
  return baseOverrides(extra: [
    shopServiceProvider.overrideWithValue(shop),
    cartProvider.overrideWith((ref) => _Cart(ref, CartState(items: [item]))),
  ]);
}

Future<void> _pumpCart(WidgetTester tester, _CheckoutShop shop, {required bool physical}) async {
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final platform = debugDefaultTargetPlatformOverride ?? TargetPlatform.android;
  await tester.pumpWidget(ProviderScope(
    overrides: _overrides(shop, physical: physical),
    child: MaterialApp(
      theme: AppTheme.lightTheme.copyWith(platform: platform),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      onGenerateRoute: (_) => MaterialPageRoute<void>(builder: (_) => const CartScreen()),
      onGenerateInitialRoutes: (_) => [
        MaterialPageRoute<void>(builder: (_) => const Scaffold(body: SizedBox())),
        MaterialPageRoute<void>(builder: (_) => const CartScreen()),
      ],
    ),
  ));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.pumpAndSettle();
  await tester.tap(f);
  await tester.pumpAndSettle();
}

/// Taps the on-screen back button of the top page.
Future<void> _back(WidgetTester tester) async {
  final top = find.byType(AstroPage).last;
  final icon = find.descendant(of: top, matching: find.byIcon(AstroIcons.back(tester.element(top))));
  await tester.tap(icon);
  await tester.pumpAndSettle();
}

Finder get _deliverHere => find.byKey(const ValueKey('address-step-continue'));

bool _radioSelected(WidgetTester tester, String id) {
  final card = find.byKey(ValueKey('address-option-$id'));
  return find.descendant(of: card, matching: find.byIcon(Icons.radio_button_checked)).evaluate().isNotEmpty;
}

void main() {
  testWidgets('physical cart with a saved default: Cart 1/3 → Address 2/3 → Pay 3/3, back retraces', (tester) async {
    final shop = _CheckoutShop([_office, _home]);
    await _pumpCart(tester, shop, physical: true);
    expect(find.text('Step 1 of 3'), findsOneWidget);

    await _tap(tester, find.text('Proceed to Checkout'));
    expect(find.byType(ShippingAddressesScreen), findsOneWidget);
    expect(find.text('Step 2 of 3'), findsOneWidget);
    expect(find.text('Step 3 of 3'), findsNothing);
    // Default is pre-selected even though it is not first in the list.
    expect(_radioSelected(tester, 'addr_home'), isTrue);
    expect(_radioSelected(tester, 'addr_office'), isFalse);
    expect(find.text('Add new address'), findsOneWidget);
    expect(find.byKey(const ValueKey('address-edit-addr_home')), findsOneWidget);

    await _tap(tester, _deliverHere);
    expect(find.byType(CheckoutScreen), findsOneWidget);
    expect(find.text('Step 3 of 3'), findsOneWidget);
    expect(find.text('Sushil Seeker'), findsOneWidget);
    expect(find.text('Pay via Razorpay Secure'), findsOneWidget);

    await _back(tester);
    expect(find.byType(CheckoutScreen), findsNothing);
    expect(find.text('Step 2 of 3'), findsOneWidget);
    expect(_radioSelected(tester, 'addr_home'), isTrue);

    await _back(tester);
    expect(find.byType(ShippingAddressesScreen), findsNothing);
    expect(find.text('Step 1 of 3'), findsOneWidget);
    expect(tester.takeException(), isNull);
  }, variant: _platforms);

  testWidgets('physical cart with no addresses: inline form on step 2, save continues to 3/3', (tester) async {
    final shop = _CheckoutShop([]);
    await _pumpCart(tester, shop, physical: true);
    await _tap(tester, find.text('Proceed to Checkout'));

    expect(find.text('Step 2 of 3'), findsOneWidget);
    expect(find.byKey(const ValueKey('address-step-inline-form')), findsOneWidget);
    expect(_deliverHere, findsNothing);

    await tester.enterText(find.byKey(const ValueKey('address-form-fullName')), 'Asha Verma');
    await tester.enterText(find.byKey(const ValueKey('address-form-phone')), '9988776655');
    await tester.enterText(find.byKey(const ValueKey('address-form-line1')), '7 Lake View Road');
    await tester.enterText(find.byKey(const ValueKey('address-form-city')), 'Bhopal');
    await tester.enterText(find.byKey(const ValueKey('address-form-postal')), '462001');
    await tester.enterText(find.byKey(const ValueKey('address-form-state')), 'Madhya Pradesh');
    await _tap(tester, find.byKey(const ValueKey('address-form-save')));

    expect(shop.addresses.single.id, 'addr_new_1');
    expect(find.byType(CheckoutScreen), findsOneWidget);
    expect(find.text('Step 3 of 3'), findsOneWidget);
    expect(find.text('Asha Verma'), findsOneWidget);

    await _tap(tester, find.text('Pay via Razorpay Secure'));
    expect(shop.orderAddressIds, ['addr_new_1']);

    expect(tester.takeException(), isNull);
  }, variant: _platforms);

  testWidgets('"Change" on step 3 returns to step 2 and the new choice reaches order creation', (tester) async {
    final shop = _CheckoutShop([_home, _office]);
    await _pumpCart(tester, shop, physical: true);
    await _tap(tester, find.text('Proceed to Checkout'));
    await _tap(tester, _deliverHere);
    expect(find.text('Step 3 of 3'), findsOneWidget);

    await _tap(tester, find.byKey(const ValueKey('checkout-change-address')));
    expect(find.byType(CheckoutScreen), findsNothing);
    expect(find.text('Step 2 of 3'), findsOneWidget);

    await _tap(tester, find.byKey(const ValueKey('address-option-addr_office')));
    expect(_radioSelected(tester, 'addr_office'), isTrue);
    expect(_radioSelected(tester, 'addr_home'), isFalse);

    await _tap(tester, _deliverHere);
    expect(find.text('Step 3 of 3'), findsOneWidget);
    expect(find.text('Office Desk'), findsOneWidget);
    expect(find.text('Sushil Seeker'), findsNothing);

    await _tap(tester, find.text('Pay via Razorpay Secure'));
    expect(shop.orderAddressIds, ['addr_office']);
    expect(tester.takeException(), isNull);
  }, variant: _platforms);

  testWidgets('digital-only cart: Cart 1/2 → Pay 2/2 with no address step', (tester) async {
    final shop = _CheckoutShop([_home]);
    await _pumpCart(tester, shop, physical: false);
    expect(find.text('Step 1 of 2'), findsOneWidget);
    expect(find.text('Step 1 of 3'), findsNothing);

    await _tap(tester, find.text('Proceed to Checkout'));
    expect(find.byType(ShippingAddressesScreen), findsNothing);
    expect(find.byType(CheckoutScreen), findsOneWidget);
    expect(find.text('Step 2 of 2'), findsOneWidget);
    expect(find.text('Step 3 of 3'), findsNothing);
    expect(find.text('Delivery Address'), findsNothing);

    await _tap(tester, find.text('Pay via Razorpay Secure'));
    expect(shop.orderAddressIds, [null]);
    expect(tester.takeException(), isNull);
  }, variant: _platforms);
}
