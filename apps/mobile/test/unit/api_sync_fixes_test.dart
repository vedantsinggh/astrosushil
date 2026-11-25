import 'dart:typed_data';

import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/courses/services/courses_service.dart';
import 'package:astro_mobile/features/notifications/providers/notifications_provider.dart';
import 'package:astro_mobile/features/reports/models/report_purchase_models.dart';
import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/services/shop_service.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingApiClient implements ApiClient {
  final Map<String, dynamic> getResponses = {};
  final Map<String, dynamic> postResponses = {};
  final Map<String, dynamic> patchResponses = {};
  final Map<String, Uint8List> bytesResponses = {};

  final List<String> getPaths = [];
  Map<String, dynamic>? lastGetQuery;
  String? lastPostPath;
  dynamic lastPostData;
  String? lastPatchPath;
  String? lastBytesPath;

  @override
  dynamic noSuchMethod(Invocation invocation) => null;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    getPaths.add(path);
    lastGetQuery = queryParameters;
    return getResponses[path] ?? {'data': {}};
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
    return postResponses[path] ?? {'data': {}};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastPatchPath = path;
    return patchResponses[path] ?? {'data': {}};
  }

  @override
  Future<Uint8List> getBytes(
    String path, {
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastBytesPath = path;
    return bytesResponses[path] ?? Uint8List.fromList([1, 2, 3]);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('API Sync Fixes Unit Tests', () {
    late _RecordingApiClient api;

    setUp(() {
      api = _RecordingApiClient();
    });

    test('ProductModel and ProductVariantModel parse extended backend fields', () {
      final product = ProductModel.fromJson({
        'id': 'prod-1',
        'slug': 'yantra-1',
        'title': 'Shri Yantra',
        'shortDescription': 'Sacred copper yantra',
        'categoryInfo': {'id': 'cat-1', 'name': 'Yantras', 'slug': 'yantras'},
        'productType': 'PHYSICAL',
        'mrp': 50000,
        'price': 40000,
        'priceWithGst': 47200,
        'gst': 7200,
        'discount': 20,
        'isFeatured': true,
        'isTrending': true,
        'isBestSeller': false,
        'rating': 4.8,
        'reviewsCount': 42,
        'isInCart': true,
        'isInWishlist': true,
        'variants': [
          {
            'id': 'var-1',
            'name': 'Size',
            'value': 'Large',
            'price': 40000,
            'mrp': 50000,
            'priceWithGst': 47200,
            'gst': 7200,
            'discount': 20,
            'isInCart': true,
            'isInWishlist': false,
            'stock': 5,
          },
        ],
      });

      expect(product.shortDescription, 'Sacred copper yantra');
      expect(product.categoryInfo?['name'], 'Yantras');
      expect(product.category, 'Yantras');
      expect(product.priceWithGst, 47200);
      expect(product.gst, 7200);
      expect(product.discount, 20);
      expect(product.isFeatured, isTrue);
      expect(product.isTrending, isTrue);
      expect(product.isBestSeller, isFalse);
      expect(product.rating, 4.8);
      expect(product.reviewsCount, 42);
      expect(product.isInCart, isTrue);
      expect(product.isInWishlist, isTrue);

      final v = product.variants.single;
      expect(v.priceWithGst, 47200);
      expect(v.gst, 7200);
      expect(v.discount, 20);
      expect(v.isInCart, isTrue);
      expect(v.isInWishlist, isFalse);
    });

    test('ShopService.fetchProductsPage passes pagination params and parses pagination', () async {
      api.getResponses['/products'] = {
        'data': {
          'products': [
            {
              'id': 'p1',
              'slug': 'p1',
              'title': 'Item 1',
              'category': 'GENERAL',
              'productType': 'PHYSICAL',
              'mrp': 1000,
              'price': 900,
            },
          ],
          'pagination': {
            'page': 2,
            'limit': 10,
            'offset': 10,
            'total': 25,
            'totalPages': 3,
            'hasMore': true,
          },
        },
      };

      final shop = ShopService(apiClient: api);
      final result = await shop.fetchProductsPage(page: 2, limit: 10, offset: 10);

      expect(api.lastGetQuery?['page'], 2);
      expect(api.lastGetQuery?['limit'], 10);
      expect(api.lastGetQuery?['offset'], 10);
      expect(result.products.length, 1);
      expect(result.pagination.page, 2);
      expect(result.pagination.total, 25);
      expect(result.pagination.totalPages, 3);
      expect(result.pagination.hasMore, isTrue);
    });

    test('ShopService.setDefaultShippingAddress calls PATCH /account/addresses/:id/default', () async {
      api.patchResponses['/account/addresses/addr_42/default'] = {
        'data': {
          'id': 'addr_42',
          'fullName': 'Sushil',
          'phoneNumber': '+919876543210',
          'addressLine1': '123 Street',
          'city': 'Jaipur',
          'state': 'RJ',
          'postalCode': '302001',
          'isDefault': true,
        },
      };

      final shop = ShopService(apiClient: api);
      final updated = await shop.setDefaultShippingAddress('addr_42');

      expect(api.lastPatchPath, '/account/addresses/addr_42/default');
      expect(updated.id, 'addr_42');
      expect(updated.isDefault, isTrue);
    });

    test('ShopService.downloadOrderInvoicePdf calls GET /invoices/orders/:orderId/pdf', () async {
      api.bytesResponses['/invoices/orders/ord_99/pdf'] = Uint8List.fromList([37, 80, 68, 70]);
      final shop = ShopService(apiClient: api);

      final bytes = await shop.downloadOrderInvoicePdf('ord_99');

      expect(api.lastBytesPath, '/invoices/orders/ord_99/pdf');
      expect(bytes, [37, 80, 68, 70]);
    });

    test('CoursesService.fetchCourseLinks and registerCourseLinkClick hit /course-links endpoints', () async {
      api.getResponses['/course-links'] = {
        'data': {
          'items': [
            {
              'id': 'cl-1',
              'title': 'BNN Mastery',
              'slug': 'bnn-mastery',
              'platformName': 'Teachable',
              'redirectUrl': 'https://courses.example.com/bnn',
              'pricePaise': 49900,
            },
          ],
        },
      };
      api.postResponses['/course-links/bnn-mastery/click'] = {
        'data': {'redirectUrl': 'https://courses.example.com/bnn'},
      };

      final courses = CoursesService(apiClient: api);
      final links = await courses.fetchCourseLinks(search: 'BNN');
      expect(api.getPaths, contains('/course-links'));
      expect(links.length, 1);
      expect(links.first.title, 'BNN Mastery');

      final redirect = await courses.registerCourseLinkClick('bnn-mastery');
      expect(api.lastPostPath, '/course-links/bnn-mastery/click');
      expect(redirect, 'https://courses.example.com/bnn');
    });

    test('AuthRepository supports Email OTP and linkEmail; UserModel parses email verification', () async {
      final storage = InMemorySecureStorageService();
      final repo = AuthRepository(apiClient: api, storageService: storage);

      api.postResponses['/auth/email/send-otp'] = {'message': 'OTP sent'};
      await repo.sendEmailOtp('user@example.com');
      expect(api.lastPostPath, '/auth/email/send-otp');
      expect(api.lastPostData, {'email': 'user@example.com'});

      api.postResponses['/auth/email/verify-otp'] = {
        'user': {
          'id': 'u-1',
          'email': 'user@example.com',
          'isEmailVerified': true,
          'emailVerifiedAt': '2026-11-25T10:00:00.000Z',
          'role': 'USER',
          'createdAt': '2026-11-25T10:00:00.000Z',
        },
        'tokens': {'accessToken': 'acc', 'refreshToken': 'ref'},
      };
      final authResp = await repo.verifyEmailOtp(email: 'user@example.com', otp: '123456');
      expect(api.lastPostPath, '/auth/email/verify-otp');
      expect(authResp.user.isEmailVerified, isTrue);
      expect(authResp.user.emailVerifiedAt, isNotNull);

      api.postResponses['/auth/link-email'] = {
        'user': {
          'id': 'u-1',
          'email': 'linked@example.com',
          'emailVerifiedAt': '2026-11-25T11:00:00.000Z',
          'role': 'USER',
          'createdAt': '2026-11-25T10:00:00.000Z',
        },
      };
      final linked = await repo.linkEmail(email: 'linked@example.com', otp: '654321');
      expect(api.lastPostPath, '/auth/link-email');
      expect(linked.email, 'linked@example.com');
      expect(linked.isEmailVerified, isTrue);

      final parsedUser = UserModel.fromJson({
        'id': 'u-2',
        'email': 'a@b.com',
        'role': 'USER',
        'createdAt': '2026-11-25T10:00:00.000Z',
      });
      expect(parsedUser.isEmailVerified, isFalse);
      expect(parsedUser.emailVerifiedAt, isNull);
    });

    test('NotificationsNotifier fetches /notifications/unread-count', () async {
      api.getResponses['/notifications'] = {
        'notifications': [
          {
            'id': 'n-1',
            'type': 'SYSTEM',
            'title': 'Welcome',
            'body': 'Hello',
            'readAt': null,
            'createdAt': '2026-11-25T10:00:00.000Z',
          },
        ],
        'total': 1,
      };
      api.getResponses['/notifications/unread-count'] = {'unreadCount': 7};

      final notifier = NotificationsNotifier(api);
      await Future<void>.delayed(Duration.zero);

      expect(api.getPaths, contains('/notifications'));
      expect(api.getPaths, contains('/notifications/unread-count'));
      expect(notifier.state.unreadCount, 7);
      expect(notifier.state.hasMore, isFalse);
    });

    test('NativeRazorpayCheckoutService throws StateError if razorpayKey is empty', () {
      final service = NativeRazorpayCheckoutService();
      service.init(
        onSuccess: ({required razorpayOrderId, required razorpayPaymentId, required razorpaySignature}) {},
        onFailure: ({required errorCode, required errorMessage}) {},
        onCancel: () {},
      );
      addTearDown(service.dispose);

      expect(
        () => service.openCheckout(
          order: const ReportPaymentOrder(
            orderId: 'ord_1',
            razorpayOrderId: 'rzp_1',
            amount: 1000,
            subtotal: 1000,
            taxAmount: 0,
            currency: 'INR',
            status: 'PENDING',
            paymentStatus: 'PENDING',
            razorpayKey: '',
          ),
          reportTitle: 'Test',
        ),
        throwsStateError,
      );
    });
  });
}
