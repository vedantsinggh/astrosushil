import '../../../core/network/api_client.dart';
import '../models/product_model.dart';
import '../models/cart_item_model.dart';
import '../models/shipping_address_model.dart';
import '../models/shop_order_model.dart';
import '../models/digital_download_model.dart';

class ShopService {
  final ApiClient _apiClient;

  ShopService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch product catalogue with category/type filters and search
  Future<List<ProductModel>> fetchProducts({
    String? category,
    String? productType,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{};
    if (category != null && category.isNotEmpty && category != 'ALL') {
      queryParams['category'] = category;
    }
    if (productType != null && productType.isNotEmpty && productType != 'ALL') {
      queryParams['productType'] = productType;
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }

    final response = await _apiClient.get(
      '/products',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    final data = response['data'] as Map<String, dynamic>? ?? {};
    final products = data['products'] as List<dynamic>? ?? [];

    return products
        .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  /// Fetch full details for a product by slug or id
  Future<ProductModel> fetchProductDetails(String idOrSlug) async {
    final response = await _apiClient.get('/products/$idOrSlug');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return ProductModel.fromJson(data);
  }

  /// Authoritative server cart calculation
  Future<CartCalculationResult> calculateCart(
    List<CartItemModel> items, {
    String? shippingAddressId,
  }) async {
    final payload = {
      'items': items.map((i) => i.toCartPayload()).toList(),
      if (shippingAddressId != null) 'shippingAddressId': shippingAddressId,
    };

    final response = await _apiClient.post(
      '/products/cart/calculate',
      data: payload,
    );

    final data = response['data'] as Map<String, dynamic>? ?? {};
    return CartCalculationResult.fromJson(data);
  }

  /// Create unified shop order
  Future<Map<String, dynamic>> createShopOrder(
    List<CartItemModel> items, {
    String? shippingAddressId,
    String? idempotencyKey,
    String? notes,
  }) async {
    final payload = {
      'items': items.map((i) => i.toCartPayload()).toList(),
      if (shippingAddressId != null) 'shippingAddressId': shippingAddressId,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
      if (notes != null) 'notes': notes,
    };

    final response = await _apiClient.post(
      '/products/orders',
      data: payload,
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// Verify Razorpay payment and trigger idempotent fulfillment
  Future<Map<String, dynamic>> verifyPayment({
    required String orderId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final payload = {
      'orderId': orderId,
      'razorpayOrderId': razorpayOrderId,
      'razorpayPaymentId': razorpayPaymentId,
      'razorpaySignature': razorpaySignature,
    };

    final response = await _apiClient.post(
      '/products/orders/$orderId/verify-payment',
      data: payload,
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// Shipping Addresses CRUD
  Future<List<ShippingAddressModel>> fetchShippingAddresses() async {
    final response = await _apiClient.get('/account/addresses');
    final data = response['data'] as List<dynamic>? ?? [];
    return data
        .map((a) => ShippingAddressModel.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  Future<ShippingAddressModel> createShippingAddress(ShippingAddressModel address) async {
    final response = await _apiClient.post(
      '/account/addresses',
      data: address.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return ShippingAddressModel.fromJson(data);
  }

  Future<ShippingAddressModel> updateShippingAddress(
    String id,
    ShippingAddressModel address,
  ) async {
    final response = await _apiClient.put(
      '/account/addresses/$id',
      data: address.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return ShippingAddressModel.fromJson(data);
  }

  Future<void> deleteShippingAddress(String id) async {
    await _apiClient.delete('/account/addresses/$id');
  }

  /// Customer Account: Order history
  Future<List<ShopOrderModel>> fetchMyOrders({int limit = 20, int offset = 0}) async {
    final response = await _apiClient.get(
      '/account/orders',
      queryParameters: {'limit': limit, 'offset': offset},
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final orders = data['orders'] as List<dynamic>? ?? [];
    return orders
        .map((o) => ShopOrderModel.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  /// Customer Account: Order details
  Future<ShopOrderModel> fetchOrderDetails(String orderId) async {
    final response = await _apiClient.get('/account/orders/$orderId');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return ShopOrderModel.fromJson(data);
  }

  /// Customer Account: Digital Downloads Library
  Future<List<DigitalDownloadModel>> fetchDigitalDownloads() async {
    final response = await _apiClient.get('/account/downloads');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final items = data['items'] as List<dynamic>? ?? [];
    return items
        .map((d) => DigitalDownloadModel.fromJson(d as Map<String, dynamic>))
        .toList();
  }

  /// Customer Account: Generate expiring secure download link
  Future<Map<String, dynamic>> getSecureDownloadUrl(
    String entitlementId, {
    int? assetIndex,
  }) async {
    final query = assetIndex != null ? {'assetIndex': assetIndex} : null;
    final response = await _apiClient.get(
      '/account/downloads/$entitlementId',
      queryParameters: query,
    );
    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// Customer Account: Account Summary Hub
  Future<Map<String, dynamic>> fetchAccountSummary() async {
    final response = await _apiClient.get('/account/summary');
    return response['data'] as Map<String, dynamic>? ?? {};
  }
}
