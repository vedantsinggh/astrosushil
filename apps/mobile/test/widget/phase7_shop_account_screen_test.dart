import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/features/shop/screens/product_detail_screen.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';

class MockShopTestService extends ShopService {
  MockShopTestService() : super(apiClient: _DummyApiClient());

  final List<ProductModel> mockProducts = [
    const ProductModel(
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
    const ProductModel(
      id: 'prod_wp',
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
    const ProductModel(
      id: 'prod_art',
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
        ProductVariantModel(id: 'v_sm', name: 'Size', value: 'Small', price: 149900, mrp: 149900),
      ],
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
}

class _DummyApiClient implements ApiClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _TestLocaleNotifier extends LocaleNotifier {
  _TestLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

class _TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _TestAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

Widget createTestApp({
  required Widget child,
  Locale locale = const Locale('en'),
  List<Override> extraOverrides = const [],
}) {
  final mockService = MockShopTestService();
  final storage = InMemorySecureStorageService();

  return ProviderScope(
    overrides: [
      secureStorageProvider.overrideWithValue(storage),
      localeProvider.overrideWith((ref) => _TestLocaleNotifier(storage, locale)),
      shopServiceProvider.overrideWithValue(mockService),
      authStateProvider.overrideWith((ref) => _TestAuthNotifier(
            AuthState.authenticated(UserModel(
              id: 'user_test_1',
              email: 'test@astrosushil.com',
              role: 'USER',
              createdAt: DateTime(2026, 1, 1),
            )),
          )),
      ...extraOverrides,
    ],
    child: MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('hi')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: child,
    ),
  );
}

void main() {
  group('Phase 7: Flutter Shop & Customer Account Widget Suite', () {
    testWidgets('ShopCatalogScreen renders category filter chips and products', (tester) async {
      await tester.pumpWidget(createTestApp(child: const ShopCatalogScreen()));
      await tester.pumpAndSettle();

      // Check header and category chips
      expect(find.text('Spiritual Shop'), findsOneWidget);
      expect(find.text('All Offerings'), findsOneWidget);
      expect(find.text('Wallpapers'), findsOneWidget);
      expect(find.text('Sacred Art'), findsOneWidget);

      // Check product cards
      expect(find.text('Ancient Ramayana Era- Herb for Unlimited Wealth'), findsOneWidget);
      expect(find.text('Vivah Siddh Wallpaper For Getting Married'), findsOneWidget);
      expect(find.text('₹3999'), findsOneWidget);
      expect(find.text('₹899'), findsOneWidget);

      // Check digital vs physical badges
      expect(find.text('PHYSICAL'), findsOneWidget);
      expect(find.text('DIGITAL'), findsWidgets);
    });

    testWidgets('Category filtering updates product list in ShopCatalogScreen', (tester) async {
      await tester.pumpWidget(createTestApp(child: const ShopCatalogScreen()));
      await tester.pumpAndSettle();

      // Tap 'Wallpapers' chip
      await tester.tap(find.text('Wallpapers'));
      await tester.pumpAndSettle();

      expect(find.text('Vivah Siddh Wallpaper For Getting Married'), findsOneWidget);
      expect(find.text('Ancient Ramayana Era- Herb for Unlimited Wealth'), findsNothing);
    });

    testWidgets('ProductDetailScreen displays details, delivery terms, and bottom CTAs', (tester) async {
      final herbProduct = MockShopTestService().mockProducts.first;

      await tester.pumpWidget(createTestApp(child: ProductDetailScreen(product: herbProduct)));
      await tester.pumpAndSettle();

      // Check title & price
      expect(find.text(herbProduct.title), findsNWidgets(2)); // in appbar and body
      expect(find.text('₹3999'), findsOneWidget);
      expect(find.text('₹7999'), findsOneWidget);
      expect(find.text('50% OFF'), findsOneWidget);

      // Check physical terms
      expect(find.text('Shipping & Delivery Terms'), findsOneWidget);
      expect(find.text('Add to Cart'), findsOneWidget);
      expect(find.text('Buy Now'), findsOneWidget);
    });

    testWidgets('ProductDetailScreen allows size variant selection for digital art', (tester) async {
      final artProduct = MockShopTestService().mockProducts[2];

      await tester.pumpWidget(createTestApp(child: ProductDetailScreen(product: artProduct)));
      await tester.pumpAndSettle();

      expect(find.text('Select Size Variant:'), findsOneWidget);
      expect(find.text('Large (₹2499)'), findsOneWidget);
      expect(find.text('Small (₹1499)'), findsOneWidget);

      // Scroll and tap Small variant chip
      await tester.ensureVisible(find.text('Small (₹1499)'));
      await tester.tap(find.text('Small (₹1499)'));
      await tester.pumpAndSettle();

      // Price should update to ₹1499
      expect(find.text('₹1499'), findsWidgets);
    });

    testWidgets('CartScreen displays empty state when cart has no items', (tester) async {
      await tester.pumpWidget(createTestApp(child: const CartScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Your cart is empty'), findsOneWidget);
      expect(find.text('Explore Shop Offerings'), findsOneWidget);
    });

    testWidgets('Customer Account Hub (ProfileScreen) renders consolidated sections', (tester) async {
      await tester.pumpWidget(createTestApp(child: const ProfileScreen()));
      await tester.pumpAndSettle();

      // Profile Header
      expect(find.text('AUTHENTICATED USER'), findsOneWidget);

      // Commerce section
      expect(find.text('My Purchases & Orders'), findsOneWidget);
      expect(find.text('Spiritual Shop'), findsOneWidget);
      expect(find.text('My Orders & Purchases'), findsOneWidget);
      expect(find.text('My Digital Library'), findsOneWidget);
      expect(find.text('Delivery Addresses'), findsOneWidget);

      // Courses section
      expect(find.text('My Learning'), findsOneWidget);
      expect(find.text('Vedic Courses & Masterclasses'), findsOneWidget);

      // Scroll to view Astrology Profiles section
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -300));
      await tester.pumpAndSettle();
      expect(find.text('Saved Profiles & Astrology'), findsOneWidget);
      expect(find.text('My Saved Birth Profiles'), findsOneWidget);

      // Scroll to view Policies & Settings
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();
      expect(find.text('Shipping & Delivery Policy'), findsOneWidget);
      expect(find.text('Refund & Cancellation Policy'), findsOneWidget);
      expect(find.text('Sign Out'), findsOneWidget);
    });

    testWidgets('ProfileScreen renders Hindi translations when locale is hi', (tester) async {
      await tester.pumpWidget(createTestApp(
        child: const ProfileScreen(),
        locale: const Locale('hi'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('खरीदारी एवं सेवाएं (My Purchases)'), findsOneWidget);
      expect(find.text('आध्यात्मिक शॉप'), findsOneWidget);
      expect(find.text('मेरे आर्डर्स एवं रसीदें'), findsOneWidget);
      expect(find.text('मेरी डिजिटल लाइब्रेरी'), findsOneWidget);
      expect(find.text('सुरक्षित डिलीवरी पते'), findsOneWidget);

      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -500));
      await tester.pumpAndSettle();
      expect(find.text('शिपिंग एवं डिलीवरी नीति'), findsOneWidget);
      expect(find.text('रिफंड एवं वापसी नीति'), findsOneWidget);
    });
  });
}
