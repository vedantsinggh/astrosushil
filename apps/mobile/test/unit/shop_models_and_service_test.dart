import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/models/shipping_address_model.dart';
import 'package:astro_mobile/features/shop/models/shop_order_model.dart';
import 'package:astro_mobile/features/shop/models/digital_download_model.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';

class MockShopApiClient implements ApiClient {
  final Map<String, dynamic> responses = {};
  String? lastGetPath;
  Map<String, dynamic>? lastGetQueryParams;
  String? lastPostPath;
  dynamic lastPostData;
  String? lastPutPath;
  String? lastDeletePath;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastGetPath = path;
    lastGetQueryParams = queryParameters;
    return responses[path] ?? {'data': {}};
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastPostPath = path;
    lastPostData = data;
    return responses[path] ?? {'data': {}};
  }

  @override
  Future<Map<String, dynamic>> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastPutPath = path;
    return responses[path] ?? {'data': {}};
  }

  @override
  Future<Map<String, dynamic>> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastDeletePath = path;
    return responses[path] ?? {'data': {}};
  }
}

void main() {
  group('Phase 7: Product & Shop Models Suite', () {
    test('ProductModel parses verified physical herb with accurate price & shipping flag', () {
      final json = {
        'id': 'prod_herb_1',
        'slug': 'ancient-ramayana-era-herb-for-unlimited-wealth-consecrated-during-ravi-pushya-nakshatra-in-ayodhya-by-astro-sushil',
        'title': 'Ancient Ramayana Era- Herb for Unlimited Wealth',
        'hindiTitle': 'प्राचीन रामायण कालीन दुर्लभ जड़ी-बूटी',
        'category': 'PHYSICAL_HERB',
        'productType': 'PHYSICAL',
        'mrp': 799900,
        'price': 399900,
        'stock': 9995,
        'requiresShipping': true,
        'isAvailable': true,
        'imageUrl': 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/herb.webp',
      };

      final product = ProductModel.fromJson(json);

      expect(product.id, 'prod_herb_1');
      expect(product.isPhysical, true);
      expect(product.isDigital, false);
      expect(product.formattedPrice, '₹3999');
      expect(product.formattedMrp, '₹7999');
      expect(product.discountPercent, 50);
      expect(product.stock, 9995);
      expect(product.displayTitle('en'), 'Ancient Ramayana Era- Herb for Unlimited Wealth');
      expect(product.displayTitle('hi'), 'प्राचीन रामायण कालीन दुर्लभ जड़ी-बूटी');
    });

    test('ProductModel parses digital wallpaper and variant artwork', () {
      final json = {
        'id': 'prod_art_1',
        'slug': 'maa-lakshmi-large-variant-digital-image',
        'title': 'Maa Lakshmi Variant Digital Image',
        'hindiTitle': 'माँ लक्ष्मी डिजिटल कला',
        'category': 'DIGITAL_ART',
        'productType': 'DIGITAL_ART',
        'mrp': 249900,
        'price': 249900,
        'requiresShipping': false,
        'variants': [
          {'id': 'v_lg', 'name': 'Size', 'value': 'Large', 'price': 249900, 'mrp': 249900, 'stock': 100},
          {'id': 'v_md', 'name': 'Size', 'value': 'Medium', 'price': 199900, 'mrp': 199900, 'stock': 100},
          {'id': 'v_sm', 'name': 'Size', 'value': 'Small', 'price': 149900, 'mrp': 149900, 'stock': 100},
        ],
      };

      final product = ProductModel.fromJson(json);

      expect(product.isDigital, true);
      expect(product.isPhysical, false);
      expect(product.variants.length, 3);
      expect(product.variants[0].value, 'Large');
      expect(product.variants[0].price, 249900);
      expect(product.variants[2].value, 'Small');
      expect(product.variants[2].price, 149900);
    });

    test('ProductModel identifies Dhan Varsha Kit bundle correctly', () {
      final json = {
        'id': 'prod_bundle_1',
        'slug': 'dhan-varsha-kit',
        'title': 'Dhan Varsha Kit',
        'category': 'DIGITAL_BUNDLE',
        'productType': 'DIGITAL_BUNDLE',
        'price': 219900,
        'mrp': 439700,
        'requiresShipping': false,
      };

      final product = ProductModel.fromJson(json);
      expect(product.isBundle, true);
      expect(product.isDigital, true);
      expect(product.discountPercent, 50);
    });

    test('CartItemModel computes line totals and formatted values accurately', () {
      final product = ProductModel.fromJson({
        'id': 'prod_wp_1',
        'title': 'Vivah Siddh Wallpaper',
        'category': 'WALLPAPER',
        'productType': 'DIGITAL_WALLPAPER',
        'price': 89900,
        'mrp': 189900,
      });

      final cartItem = CartItemModel(product: product, quantity: 2);

      expect(cartItem.key, 'prod_wp_1');
      expect(cartItem.unitPricePaise, 89900);
      expect(cartItem.totalPaise, 179800);
      expect(cartItem.formattedUnitPrice, '₹899');
      expect(cartItem.formattedTotal, '₹1798');
      expect(cartItem.requiresShipping, false);
    });

    test('CartCalculationResult parses server-authoritative numbers with inclusive GST', () {
      final json = {
        'subtotal': 338898,
        'taxAmount': 61002,
        'shippingAmount': 0,
        'totalAmount': 399900,
        'currency': 'INR',
        'requiresShipping': true,
        'eligibleForFreeShipping': true,
        'items': [
          {
            'productId': 'prod_herb_1',
            'title': 'Herb for Unlimited Wealth',
            'quantity': 1,
            'unitPrice': 399900,
            'totalAmount': 399900,
          }
        ],
      };

      final calc = CartCalculationResult.fromJson(json);

      expect(calc.formattedSubtotal, '₹3389');
      expect(calc.formattedTax, '₹610');
      expect(calc.formattedShipping, 'FREE');
      expect(calc.formattedTotal, '₹3999');
      expect(calc.eligibleForFreeShipping, true);
    });

    test('ShippingAddressModel validates and formats Indian postal address', () {
      final json = {
        'id': 'addr_1',
        'fullName': 'Aarav Gupta',
        'phoneNumber': '+919876543210',
        'addressLine1': '108 Ram Path',
        'addressLine2': 'Opposite Kanak Bhawan',
        'city': 'Ayodhya',
        'state': 'Uttar Pradesh',
        'postalCode': '224123',
        'country': 'India',
        'isDefault': true,
      };

      final address = ShippingAddressModel.fromJson(json);

      expect(address.id, 'addr_1');
      expect(address.isDefault, true);
      expect(address.formattedAddress, '108 Ram Path, Opposite Kanak Bhawan, Ayodhya, Uttar Pradesh - 224123, India');
    });

    test('ShopOrderModel parses order and item fulfillment statuses', () {
      final json = {
        'id': 'ord_test_1',
        'razorpayOrderId': 'order_rzp_123',
        'amount': 399900,
        'subtotal': 338898,
        'taxAmount': 61002,
        'shippingAmount': 0,
        'status': 'PAID',
        'paymentStatus': 'CAPTURED',
        'fulfillmentStatus': 'DISPATCHED',
        'trackingNumber': 'DELHIVERY_987654321',
        'courierPartner': 'Delhivery Surface',
        'createdAt': '2026-10-11T10:00:00Z',
        'items': [
          {
            'id': 'item_1',
            'catalogId': 'ancient-herb',
            'title': 'Herb for Wealth',
            'quantity': 1,
            'unitPrice': 399900,
            'totalAmount': 399900,
            'fulfillmentType': 'PHYSICAL',
          }
        ],
      };

      final order = ShopOrderModel.fromJson(json);

      expect(order.isPaid, true);
      expect(order.isDispatched, true);
      expect(order.hasPhysicalItems, true);
      expect(order.trackingNumber, 'DELHIVERY_987654321');
      expect(order.formattedAmount, '₹3999');
    });

    test('DigitalDownloadModel handles single and bundle downloads', () {
      final json = {
        'id': 'ent_bundle_1',
        'productId': 'prod_bundle_1',
        'productTitle': 'Dhan Varsha Kit',
        'productType': 'DIGITAL_BUNDLE',
        'category': 'DIGITAL_BUNDLE',
        'status': 'ACTIVE',
        'downloadCount': 2,
        'hasBundleAssets': true,
        'bundleAssets': [
          {'name': 'Maa Lakshmi 4K Art', 'key': 'art.webp', 'type': 'IMAGE'},
          {'name': 'Dhan Prapti Wallpaper', 'key': 'wp.webp', 'type': 'IMAGE'},
          {'name': 'Secret Mantra Audio', 'key': 'mantra.mp3', 'type': 'AUDIO'},
        ],
      };

      final download = DigitalDownloadModel.fromJson(json);

      expect(download.isActive, true);
      expect(download.downloadCount, 2);
      expect(download.hasBundleAssets, true);
      expect(download.bundleAssets.length, 3);
      expect(download.bundleAssets[2].name, 'Secret Mantra Audio');
    });
  });

  group('Phase 7: ShopService API Integration', () {
    late MockShopApiClient apiClient;
    late ShopService shopService;

    setUp(() {
      apiClient = MockShopApiClient();
      shopService = ShopService(apiClient: apiClient);
    });

    test('fetchProducts invokes /products with filter query parameters', () async {
      apiClient.responses['/products'] = {
        'data': {
          'products': [
            {
              'id': 'prod_wp_1',
              'slug': 'student-focus-wallpaper',
              'title': 'Student Focus Wallpaper',
              'category': 'WALLPAPER',
              'productType': 'DIGITAL_WALLPAPER',
              'price': 89900,
              'mrp': 189900,
            }
          ]
        }
      };

      final products = await shopService.fetchProducts(
        category: 'WALLPAPER',
        search: 'Focus',
      );

      expect(apiClient.lastGetPath, '/products');
      expect(apiClient.lastGetQueryParams?['category'], 'WALLPAPER');
      expect(apiClient.lastGetQueryParams?['search'], 'Focus');
      expect(products.length, 1);
      expect(products[0].title, 'Student Focus Wallpaper');
    });

    test('calculateCart calls /products/cart/calculate with items and address', () async {
      apiClient.responses['/products/cart/calculate'] = {
        'data': {
          'subtotal': 89900,
          'taxAmount': 0,
          'shippingAmount': 0,
          'totalAmount': 89900,
          'items': [],
        }
      };

      final item = CartItemModel(
        product: ProductModel.fromJson({
          'id': 'prod_1',
          'title': 'Wallpaper',
          'category': 'WALLPAPER',
          'productType': 'DIGITAL_WALLPAPER',
          'price': 89900,
          'mrp': 189900,
        }),
      );

      final result = await shopService.calculateCart([item], shippingAddressId: 'addr_1');

      expect(apiClient.lastPostPath, '/products/cart/calculate');
      expect(apiClient.lastPostData['items'].length, 1);
      expect(apiClient.lastPostData['shippingAddressId'], 'addr_1');
      expect(result.totalAmountPaise, 89900);
    });

    test('createShopOrder calls /products/orders and returns orderId', () async {
      apiClient.responses['/products/orders'] = {
        'data': {
          'orderId': 'order_new_1',
          'razorpayOrderId': 'rzp_order_new_1',
          'amount': 89900,
        }
      };

      final item = CartItemModel(
        product: ProductModel.fromJson({
          'id': 'prod_1',
          'title': 'Wallpaper',
          'category': 'WALLPAPER',
          'productType': 'DIGITAL_WALLPAPER',
          'price': 89900,
          'mrp': 189900,
        }),
      );

      final res = await shopService.createShopOrder([item]);

      expect(apiClient.lastPostPath, '/products/orders');
      expect(res['orderId'], 'order_new_1');
    });

    test('verifyPayment calls /products/orders/:id/verify-payment with HMAC signature', () async {
      apiClient.responses['/products/orders/order_1/verify-payment'] = {
        'data': {
          'message': 'Payment verified successfully',
          'order': {'id': 'order_1', 'status': 'PAID'},
        }
      };

      final res = await shopService.verifyPayment(
        orderId: 'order_1',
        razorpayOrderId: 'rzp_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'sig_1',
      );

      expect(apiClient.lastPostPath, '/products/orders/order_1/verify-payment');
      expect(res['order']['status'], 'PAID');
    });

    test('getSecureDownloadUrl retrieves signed expiring URL', () async {
      apiClient.responses['/account/downloads/ent_1'] = {
        'data': {
          'downloadUrl': 'https://downloads.astrosushil.com/secure/ent_1?token=abc',
          'downloadCount': 1,
        }
      };

      final res = await shopService.getSecureDownloadUrl('ent_1');

      expect(apiClient.lastGetPath, '/account/downloads/ent_1');
      expect(res['downloadUrl'], contains('token=abc'));
    });
  });
}
