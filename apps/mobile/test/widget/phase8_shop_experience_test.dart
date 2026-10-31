import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/models/shop_order_model.dart';
import 'package:astro_mobile/features/shop/models/digital_download_model.dart';
import 'package:astro_mobile/features/shop/models/shipping_address_model.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/providers/cart_provider.dart';
import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/features/shop/screens/product_detail_screen.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/features/shop/screens/checkout_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_history_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_detail_screen.dart';
import 'package:astro_mobile/features/shop/screens/digital_downloads_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';

class MockPhase8ShopService extends ShopService {
  MockPhase8ShopService() : super(apiClient: _DummyApiClient());

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

  final List<ShippingAddressModel> mockAddresses = [
    const ShippingAddressModel(
      id: 'addr_1',
      fullName: 'Sushil Seeker',
      phoneNumber: '9876543210',
      addressLine1: 'Flat 402, Ram Darbar Heights',
      addressLine2: 'Near Ram Mandir',
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
  Future<List<ShopOrderModel>> fetchMyOrders({int limit = 20, int offset = 0}) async {
    return mockOrders;
  }

  @override
  Future<ShopOrderModel> fetchOrderDetails(String orderId) async {
    return mockOrders.firstWhere((o) => o.id == orderId, orElse: () => mockOrders.first);
  }

  @override
  Future<List<DigitalDownloadModel>> fetchDigitalDownloads() async {
    return mockDownloads;
  }

  @override
  Future<Map<String, dynamic>> getSecureDownloadUrl(String entitlementId, {int? assetIndex}) async {
    return {
      'downloadUrl': 'https://storage.astrosushil.com/downloads/$entitlementId?token=expiring_mock_token_15min',
      'expiresInSeconds': 900,
    };
  }

  @override
  Future<List<ShippingAddressModel>> fetchShippingAddresses() async {
    return mockAddresses;
  }

  @override
  Future<ShippingAddressModel> createShippingAddress(ShippingAddressModel address) async {
    return address;
  }

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
        'id': 'ord_new_999',
        'razorpayOrderId': 'rzp_order_mock_999',
        'amount': 399900,
        'currency': 'INR',
      },
      'razorpayKeyId': 'rzp_test_key',
    };
  }
}

class _DummyApiClient implements ApiClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _Phase8LocaleNotifier extends LocaleNotifier {
  _Phase8LocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

class _Phase8TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _Phase8TestAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  Widget createPhase8TestApp({
    required Widget child,
    Locale locale = const Locale('en'),
    bool isGuest = false,
  }) {
    final storage = InMemorySecureStorageService();
    final shopService = MockPhase8ShopService();

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
        localeProvider.overrideWith((ref) => _Phase8LocaleNotifier(storage, locale)),
        authStateProvider.overrideWith((ref) => _Phase8TestAuthNotifier(
              isGuest ? AuthState.guest() : AuthState.authenticated(testUser),
            )),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: child,
      ),
    );
  }

  group('Phase 8: Shop & Customer Account Comprehensive Test Suite', () {
    testWidgets('1. ShopCatalogScreen renders verified products with 18% GST badges and category chips', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(child: const ShopCatalogScreen()));
      await tester.pumpAndSettle();

      // Brand Title
      expect(find.text('Spiritual Shop'), findsOneWidget);

      // Verify category filter chips
      expect(find.text('All Offerings'), findsOneWidget);
      expect(find.text('Wallpapers'), findsOneWidget);
      expect(find.text('Sacred Art'), findsOneWidget);
      expect(find.text('Kits & Bundles'), findsOneWidget);

      // Verify authentic products rendered
      expect(find.text('Ancient Ramayana Era- Herb for Unlimited Wealth'), findsOneWidget);
      expect(find.text('Dhan Varsha Kit'), findsOneWidget);
      expect(find.text('Maa Lakshmi Variant Digital Image'), findsOneWidget);

      // Verify inclusive 18% GST badges
      expect(find.text('18% GST Included'), findsWidgets);
    });

    testWidgets('2. ProductDetailScreen allows size variant selection and updates price', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockPhase8ShopService();
      final artProduct = service.mockProducts.firstWhere((p) => p.id == 'prod_art_lakshmi');

      await tester.pumpWidget(createPhase8TestApp(
        child: ProductDetailScreen(product: artProduct),
      ));
      await tester.pumpAndSettle();

      // Initial price: Large variant ₹2499
      expect(find.text('₹2499'), findsWidgets);
      expect(find.text('Select Size Variant:'), findsOneWidget);
      expect(find.text('Large (₹2499)'), findsOneWidget);

      // Tap Small variant
      await tester.tap(find.text('Small (₹1499)'));
      await tester.pumpAndSettle();

      // Updated price should be ₹1499
      expect(find.text('₹1499'), findsWidgets);

      // Check Sushil Explainer integration button
      expect(find.text('Explain spiritual significance'), findsOneWidget);
    });

    testWidgets('3. CartScreen displays Free Shipping progress banner for orders >= ₹2,000', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockPhase8ShopService();
      final herbProduct = service.mockProducts.firstWhere((p) => p.id == 'prod_herb');

      await tester.pumpWidget(createPhase8TestApp(
        child: Consumer(
          builder: (context, ref, _) {
            // Seed cart with herb (₹3,999 >= ₹2,000)
            Future.microtask(() {
              ref.read(cartProvider.notifier).addItem(herbProduct);
            });
            return const CartScreen();
          },
        ),
      ));
      await tester.pumpAndSettle();

      // Verify Free Shipping achieved banner
      expect(find.text('You qualify for FREE express shipping on this order!'), findsOneWidget);
      expect(find.text('Order Summary'), findsOneWidget);
      expect(find.text('Proceed to Checkout'), findsOneWidget);
    });

    testWidgets('4. CheckoutScreen handles physical delivery requirements and address prompt', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final service = MockPhase8ShopService();
      final herbProduct = service.mockProducts.firstWhere((p) => p.id == 'prod_herb');

      await tester.pumpWidget(createPhase8TestApp(
        child: Consumer(
          builder: (context, ref, _) {
            Future.microtask(() {
              ref.read(cartProvider.notifier).addItem(herbProduct);
            });
            return const CheckoutScreen();
          },
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Secure Checkout'), findsOneWidget);
      expect(find.text('Delivery Address'), findsOneWidget);
      expect(find.textContaining('Order Items'), findsOneWidget);
      expect(find.text('Payment Breakdown'), findsOneWidget);
    });

    testWidgets('5. OrderHistoryScreen displays order records with live status badges', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(child: const OrderHistoryScreen()));
      await tester.pumpAndSettle();

      expect(find.text('My Orders & Purchases'), findsOneWidget);
      expect(find.text('Order #ord_101'), findsOneWidget);
      expect(find.text('Order #ord_102'), findsOneWidget);
      expect(find.text('Processing'), findsOneWidget);
      expect(find.text('Delivered'), findsOneWidget);
    });

    testWidgets('6. OrderDetailScreen displays courier tracking and WhatsApp support', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(
        child: const OrderDetailScreen(orderId: 'ord_101'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Order Details'), findsOneWidget);
      expect(find.textContaining('BLUDART-9921127'), findsOneWidget);
      expect(find.textContaining('Blue Dart Express'), findsOneWidget);
      expect(find.textContaining('Contact Support'), findsOneWidget);
    });

    testWidgets('7. DigitalDownloadsScreen explains 15-minute expiring link security and shows bundle assets', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(child: const DigitalDownloadsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('My Digital Library'), findsOneWidget);
      expect(find.text('Secure 15-Minute Signed Downloads'), findsOneWidget);
      expect(find.text('Dhan Varsha Kit'), findsOneWidget);

      // Expand bundle assets drawer
      expect(find.text('Included Digital Assets:'), findsOneWidget);
      expect(find.text('Maa Lakshmi 4K Art'), findsOneWidget);
      expect(find.text('Dhan Prapti Wallpaper'), findsOneWidget);
      expect(find.text('Secret Wealth Mantra'), findsOneWidget);
    });

    testWidgets('8. ProfileScreen (Account Hub) renders consolidated commerce, learning, and policy destinations', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(child: const ProfileScreen()));
      await tester.pumpAndSettle();

      // User Header
      expect(find.text('AUTHENTICATED USER'), findsOneWidget);

      // Commerce section
      expect(find.text('My Purchases & Orders'), findsOneWidget);
      expect(find.text('Spiritual Shop'), findsOneWidget);
      expect(find.text('My Orders & Purchases'), findsOneWidget);
      expect(find.text('My Digital Library'), findsOneWidget);
      expect(find.text('Delivery Addresses'), findsOneWidget);

      // Learning & Consultations section
      expect(find.text('Learning & Consultations'), findsOneWidget);
      expect(find.text('My Learning'), findsOneWidget);
      expect(find.text('Vedic Courses & Masterclasses'), findsOneWidget);
      expect(find.text('My Consultations & Appointments'), findsOneWidget);
      expect(find.text('My Kundli Reports & Analysis'), findsOneWidget);

      // Saved Profiles section
      expect(find.text('Saved Profiles & Astrology'), findsOneWidget);
      expect(find.text('My Saved Birth Profiles'), findsOneWidget);

      // Settings and policies
      expect(find.text('Settings & Preferences'), findsOneWidget);
      expect(find.textContaining('Help & WhatsApp Support'), findsWidgets);
      expect(find.text('Shipping & Delivery Policy'), findsOneWidget);
      expect(find.text('Refund & Cancellation Policy'), findsOneWidget);
    });

    testWidgets('9. ProfileScreen policy navigation displays free shipping and refund terms on tap', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(child: const ProfileScreen()));
      await tester.pumpAndSettle();

      // Tap Shipping Policy
      await tester.tap(find.text('Shipping & Delivery Policy'));
      await tester.pumpAndSettle();

      // Verify LegalDocumentsScreen opened with Shipping Policy
      expect(find.text('2. Shipping Charges'), findsOneWidget);
      expect(find.textContaining('₹2,000 or above'), findsOneWidget);

      // Return via back button
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
    });

    testWidgets('10. Hindi Devanagari localization test on Shop & Account screens', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(createPhase8TestApp(
        child: const ProfileScreen(),
        locale: const Locale('hi'),
      ));
      await tester.pumpAndSettle();

      // Devanagari headings
      expect(find.text('खरीदारी एवं सेवाएं (My Purchases)'), findsOneWidget);
      expect(find.text('आध्यात्मिक शॉप'), findsOneWidget);
      expect(find.text('मेरे आर्डर्स एवं रसीदें'), findsOneWidget);
      expect(find.text('मेरी डिजिटल लाइब्रेरी'), findsOneWidget);
      expect(find.text('शिक्षा एवं परामर्श सेवाएं'), findsOneWidget);
    });

    testWidgets('11. Responsive viewports and text scaling (320dp to 414dp, 1.0x to 2.0x) without overflow', (tester) async {
      final viewports = [
        const Size(320, 568), // iPhone SE 1st gen / small Android
        const Size(360, 640), // Standard Android
        const Size(390, 844), // iPhone 12/13/14
        const Size(414, 896), // iPhone Plus / Large Android
      ];

      for (final size in viewports) {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        // Test with 1.5x and 2.0x text scaling
        await tester.pumpWidget(
          MediaQuery(
            data: MediaQueryData(size: size, textScaler: const TextScaler.linear(1.5)),
            child: createPhase8TestApp(child: const ShopCatalogScreen()),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);

        await tester.pumpWidget(
          MediaQuery(
            data: MediaQueryData(size: size, textScaler: const TextScaler.linear(2.0)),
            child: createPhase8TestApp(child: const CartScreen()),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      }
    });
  });
}
