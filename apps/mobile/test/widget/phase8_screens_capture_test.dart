import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/models/shipping_address_model.dart';
import 'package:astro_mobile/features/shop/models/shop_order_model.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/models/digital_download_model.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/providers/cart_provider.dart';
import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/features/shop/screens/product_detail_screen.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/features/shop/screens/checkout_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_history_screen.dart';
import 'package:astro_mobile/features/shop/screens/digital_downloads_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';

class _CaptureDummyApiClient implements ApiClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockCaptureShopService extends ShopService {
  MockCaptureShopService() : super(apiClient: _CaptureDummyApiClient());

  final List<ProductModel> mockProducts = const [
    ProductModel(
      id: 'prod_herb',
      slug: 'ancient-ramayana-era-herb-for-unlimited-wealth',
      catalogId: 'ancient-herb',
      title: 'Ancient Ramayana Era- Herb for Unlimited Wealth',
      hindiTitle: 'प्राचीन रामायण कालीन दुर्लभ जड़ी-बूटी',
      category: 'PHYSICAL_HERB',
      productType: 'PHYSICAL',
      mrp: 799900,
      price: 399900,
      stock: 9995,
      requiresShipping: true,
      description: 'Sacred consecrated herb for unlimited wealth blessed during Ravi Pushya Nakshatra in Ayodhya.',
    ),
    ProductModel(
      id: 'prod_dhan_varsha',
      slug: 'dhan-varsha-kit',
      catalogId: 'dhan-varsha-kit',
      title: 'Dhan Varsha Kit',
      hindiTitle: 'धन वर्षा संपूर्ण किट',
      category: 'KITS_BUNDLES',
      productType: 'BUNDLE',
      mrp: 499900,
      price: 219900,
      requiresShipping: false,
      description: 'Complete digital wealth invocation bundle with Maa Lakshmi 4K art, wallpaper, and secret mantra.',
    ),
    ProductModel(
      id: 'prod_wp_vivah',
      slug: 'vivah-siddh-wallpaper-for-getting-married',
      catalogId: 'vivah-siddh',
      title: 'Vivah Siddh Wallpaper For Getting Married',
      hindiTitle: 'विवाह सिद्ध वॉलपेपर',
      category: 'WALLPAPER',
      productType: 'DIGITAL_WALLPAPER',
      mrp: 189900,
      price: 89900,
      requiresShipping: false,
      description: 'Energized digital wallpaper for marriage harmony.',
    ),
    ProductModel(
      id: 'prod_wp_dhan',
      slug: 'dhan-prapti-wallpaper-for-money-abundance',
      catalogId: 'dhan-prapti',
      title: 'Dhan Prapti Wallpaper For Money Abundance',
      hindiTitle: 'धन प्राप्ति वॉलपेपर',
      category: 'WALLPAPER',
      productType: 'DIGITAL_WALLPAPER',
      mrp: 189900,
      price: 89900,
      requiresShipping: false,
      description: 'Sacred geometric wallpaper attracting prosperity and removing financial debts.',
    ),
    ProductModel(
      id: 'prod_art_lakshmi',
      slug: 'maa-lakshmi-large-variant-digital-image',
      catalogId: 'maa-lakshmi-art',
      title: 'Maa Lakshmi Variant Digital Image',
      hindiTitle: 'माँ लक्ष्मी पावन डिजिटल कला',
      category: 'DIGITAL_ART',
      productType: 'DIGITAL_ART',
      mrp: 249900,
      price: 249900,
      requiresShipping: false,
      description: 'Fine art devotional portrait of Kamla Devi Maa Lakshmi.',
      variants: [
        ProductVariantModel(id: 'v_lg', name: 'Size', value: 'Large', price: 249900, mrp: 249900),
        ProductVariantModel(id: 'v_md', name: 'Size', value: 'Medium', price: 199900, mrp: 199900),
        ProductVariantModel(id: 'v_sm', name: 'Size', value: 'Small', price: 149900, mrp: 149900),
      ],
    ),
  ];

  final List<ShippingAddressModel> mockAddresses = const [
    ShippingAddressModel(
      id: 'addr_1',
      fullName: 'Sushil Seeker',
      phoneNumber: '9876543210',
      addressLine1: 'Flat 402, Ram Darbar Heights',
      addressLine2: 'Near Ram Janmabhoomi Temple',
      city: 'Ayodhya',
      state: 'Uttar Pradesh',
      postalCode: '224123',
      country: 'India',
      isDefault: true,
    ),
  ];

  final List<ShopOrderModel> mockOrders = [
    ShopOrderModel(
      id: 'ord_101',
      razorpayOrderId: 'order_rzp_101',
      status: 'PAID',
      paymentStatus: 'CAPTURED',
      fulfillmentStatus: 'PROCESSING',
      amount: 399900,
      subtotal: 399900,
      taxAmount: 0,
      shippingAmount: 0,
      trackingNumber: 'BLUDART-9921127',
      courierPartner: 'Blue Dart Express',
      items: const [
        ShopOrderItemModel(
          id: 'item_1',
          catalogId: 'prod_herb',
          title: 'Ancient Ramayana Era- Herb for Unlimited Wealth',
          quantity: 1,
          unitPrice: 399900,
          totalAmount: 399900,
          fulfillmentType: 'PHYSICAL',
        ),
      ],
      shippingAddress: const ShippingAddressModel(
        id: 'addr_1',
        fullName: 'Sushil Seeker',
        phoneNumber: '9876543210',
        addressLine1: 'Flat 402, Ram Darbar Heights',
        city: 'Ayodhya',
        state: 'Uttar Pradesh',
        postalCode: '224123',
      ),
      createdAt: DateTime.now().subtract(const Duration(hours: 12)),
    ),
    ShopOrderModel(
      id: 'ord_102',
      razorpayOrderId: 'order_rzp_102',
      status: 'PAID',
      paymentStatus: 'CAPTURED',
      fulfillmentStatus: 'DELIVERED',
      amount: 89900,
      subtotal: 89900,
      taxAmount: 0,
      shippingAmount: 0,
      items: const [
        ShopOrderItemModel(
          id: 'item_2',
          catalogId: 'prod_wp_vivah',
          title: 'Vivah Siddh Wallpaper For Getting Married',
          quantity: 1,
          unitPrice: 89900,
          totalAmount: 89900,
          fulfillmentType: 'DIGITAL',
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
  ];

  final List<DigitalDownloadModel> mockDownloads = [
    DigitalDownloadModel(
      id: 'dl_1',
      productId: 'prod_dhan_varsha',
      orderId: 'ord_103',
      productTitle: 'Dhan Varsha Kit',
      productHindiTitle: 'धन वर्षा संपूर्ण किट',
      productType: 'BUNDLE',
      category: 'KITS_BUNDLES',
      status: 'ACTIVE',
      downloadCount: 2,
      grantedAt: DateTime.now().subtract(const Duration(hours: 2)),
      hasBundleAssets: true,
      bundleAssets: const [
        BundleAssetModel(name: 'Maa Lakshmi 4K Art', key: 'art_lakshmi_4k', type: 'IMAGE'),
        BundleAssetModel(name: 'Dhan Prapti Wallpaper', key: 'wp_dhan_prapti', type: 'IMAGE'),
        BundleAssetModel(name: 'Secret Wealth Mantra', key: 'mantra_audio_mp3', type: 'AUDIO'),
      ],
    ),
    DigitalDownloadModel(
      id: 'dl_2',
      productId: 'prod_wp_vivah',
      orderId: 'ord_102',
      productTitle: 'Vivah Siddh Wallpaper For Getting Married',
      productHindiTitle: 'विवाह सिद्ध वॉलपेपर',
      productType: 'DIGITAL_WALLPAPER',
      category: 'WALLPAPER',
      status: 'ACTIVE',
      downloadCount: 1,
      grantedAt: DateTime.now().subtract(const Duration(days: 1)),
      hasBundleAssets: false,
    ),
  ];

  @override
  Future<List<ProductModel>> fetchProducts({
    String? category,
    String? productType,
    String? search,
  }) async {
    var list = mockProducts;
    if (category != null && category != 'ALL') {
      list = list.where((p) => p.category == category).toList();
    }
    if (search != null && search.isNotEmpty) {
      list = list.where((p) => p.title.toLowerCase().contains(search.toLowerCase())).toList();
    }
    return list;
  }

  @override
  Future<ProductModel> fetchProductDetails(String idOrSlug) async {
    return mockProducts.firstWhere((p) => p.id == idOrSlug || p.catalogId == idOrSlug);
  }

  @override
  Future<CartCalculationResult> calculateCart(
    List<CartItemModel> items, {
    String? shippingAddressId,
  }) async {
    int total = items.fold(0, (sum, i) => sum + i.totalPaise);
    bool reqShip = items.any((i) => i.requiresShipping);
    int shipFee = reqShip && total < 200000 ? 9900 : 0;

    return CartCalculationResult(
      items: items.map((i) => CartItemCalculated(
        productId: i.product.id,
        title: i.product.title,
        quantity: i.quantity,
        unitPrice: i.unitPricePaise,
        totalAmount: i.totalPaise,
      )).toList(),
      subtotalPaise: total,
      taxAmountPaise: 0,
      shippingAmountPaise: shipFee,
      totalAmountPaise: total + shipFee,
      requiresShipping: reqShip,
      eligibleForFreeShipping: reqShip && total >= 200000,
    );
  }

  @override
  Future<List<ShopOrderModel>> fetchMyOrders({int limit = 20, int offset = 0}) async => mockOrders;

  @override
  Future<ShopOrderModel> fetchOrderDetails(String orderId) async {
    return mockOrders.firstWhere((o) => o.id == orderId, orElse: () => mockOrders.first);
  }

  @override
  Future<List<DigitalDownloadModel>> fetchDigitalDownloads() async => mockDownloads;

  @override
  Future<Map<String, dynamic>> getSecureDownloadUrl(String entitlementId, {int? assetIndex}) async {
    return {
      'downloadUrl': 'https://storage.astrosushil.com/downloads/$entitlementId?token=mock_15min_signed',
      'expiresInSeconds': 900,
    };
  }

  @override
  Future<List<ShippingAddressModel>> fetchShippingAddresses() async => mockAddresses;

  @override
  Future<ShippingAddressModel> createShippingAddress(ShippingAddressModel address) async => address;

  @override
  Future<void> deleteShippingAddress(String addressId) async {}

  @override
  Future<Map<String, dynamic>> createShopOrder(
    List<CartItemModel> items, {
    String? shippingAddressId,
    String? idempotencyKey,
    String? notes,
  }) async {
    return {
      'order': {
        'id': 'ord_new_101',
        'razorpayOrderId': 'rzp_order_capture',
        'amount': 399900,
      },
      'razorpayKeyId': 'rzp_test_key',
    };
  }

  @override
  Future<Map<String, dynamic>> fetchAccountSummary() async {
    return {
      'activeOrdersCount': 1,
      'digitalDownloadsCount': 2,
    };
  }
}

class _CaptureLocaleNotifier extends LocaleNotifier {
  _CaptureLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

class _CaptureAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _CaptureAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _CaptureCartNotifier extends CartNotifier {
  _CaptureCartNotifier(super.ref, [CartState? initial]) {
    if (initial != null) state = initial;
  }
}

void main() {
  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_8');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  Widget buildCaptureApp({
    required GlobalKey boundaryKey,
    required Widget child,
    List<CartItemModel>? initialCartItems,
  }) {
    final storage = InMemorySecureStorageService();
    final shopService = MockCaptureShopService();

    final testUser = UserModel(
      id: 'test_user_phase8',
      email: 'seeker@astrosushil.com',
      phoneNumber: '+919876543210',
      role: 'USER',
      createdAt: DateTime(2026, 1, 1),
    );

    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        shopServiceProvider.overrideWithValue(shopService),
        localeProvider.overrideWith((ref) => _CaptureLocaleNotifier(storage, const Locale('en'))),
        authStateProvider.overrideWith((ref) => _CaptureAuthNotifier(
              AuthState.authenticated(testUser),
            )),
        cartProvider.overrideWith((ref) {
          CartState? initial;
          if (initialCartItems != null && initialCartItems.isNotEmpty) {
            final total = initialCartItems.fold(0, (sum, i) => sum + i.totalPaise);
            final reqShip = initialCartItems.any((i) => i.requiresShipping);
            final shipFee = reqShip && total < 200000 ? 9900 : 0;

            initial = CartState(
              items: initialCartItems,
              calculation: CartCalculationResult(
                items: initialCartItems.map((i) => CartItemCalculated(
                  productId: i.product.id,
                  title: i.product.title,
                  quantity: i.quantity,
                  unitPrice: i.unitPricePaise,
                  totalAmount: i.totalPaise,
                )).toList(),
                subtotalPaise: total,
                taxAmountPaise: 0,
                shippingAmountPaise: shipFee,
                totalAmountPaise: total + shipFee,
                requiresShipping: reqShip,
                eligibleForFreeShipping: reqShip && total >= 200000,
              ),
            );
          }
          return _CaptureCartNotifier(ref, initial);
        }),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: const Locale('en'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: RepaintBoundary(
          key: boundaryKey,
          child: child,
        ),
      ),
    );
  }

  Future<void> captureToFile(
    WidgetTester tester,
    GlobalKey boundaryKey,
    String filename,
  ) async {
    await tester.runAsync(() async {
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  group('Phase 8 Shop & Customer Account Screens Capture Suite', () {
    testWidgets('Capture 01_shop_catalog_discovery', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const ShopCatalogScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '01_shop_catalog_discovery.png');
    });

    testWidgets('Capture 02_shop_product_detail_art_variants', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockCaptureShopService();
      final artProduct = service.mockProducts.firstWhere((p) => p.id == 'prod_art_lakshmi');

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: ProductDetailScreen(product: artProduct),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '02_shop_product_detail_art_variants.png');
    });

    testWidgets('Capture 03_shop_product_detail_herb_shipping', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockCaptureShopService();
      final herbProduct = service.mockProducts.firstWhere((p) => p.id == 'prod_herb');

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: ProductDetailScreen(product: herbProduct),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '03_shop_product_detail_herb_shipping.png');
    });

    testWidgets('Capture 04_shop_cart_summary', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockCaptureShopService();
      final herb = service.mockProducts.firstWhere((p) => p.id == 'prod_herb');

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const CartScreen(),
        initialCartItems: [
          CartItemModel(product: herb, quantity: 1),
        ],
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '04_shop_cart_summary.png');
    });

    testWidgets('Capture 05_shop_checkout_address', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockCaptureShopService();
      final herb = service.mockProducts.firstWhere((p) => p.id == 'prod_herb');

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const CheckoutScreen(),
        initialCartItems: [
          CartItemModel(product: herb, quantity: 1),
        ],
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '05_shop_checkout_address.png');
    });

    testWidgets('Capture 06_shop_order_history', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const OrderHistoryScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '06_shop_order_history.png');
    });

    testWidgets('Capture 07_shop_digital_downloads', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const DigitalDownloadsScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '07_shop_digital_downloads.png');
    });

    testWidgets('Capture 08_account_hub_profile', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureApp(
        boundaryKey: boundaryKey,
        child: const ProfileScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '08_account_hub_profile.png');
    });
  });
}
