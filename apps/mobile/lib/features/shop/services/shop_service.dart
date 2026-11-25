import 'dart:typed_data';
import '../../../core/network/api_client.dart';
import '../models/product_model.dart';
import '../models/cart_item_model.dart';
import '../models/shipping_address_model.dart';
import '../models/shop_order_model.dart';
import '../models/digital_download_model.dart';

class ShopPagination {
  final int page;
  final int limit;
  final int offset;
  final int total;
  final int totalPages;
  final bool hasMore;

  const ShopPagination({
    this.page = 1,
    this.limit = 20,
    this.offset = 0,
    this.total = 0,
    this.totalPages = 1,
    this.hasMore = false,
  });

  factory ShopPagination.fromJson(Map<String, dynamic> json) {
    final page = json['page'] is int ? json['page'] as int : int.tryParse(json['page']?.toString() ?? '1') ?? 1;
    final limit = json['limit'] is int ? json['limit'] as int : int.tryParse(json['limit']?.toString() ?? '20') ?? 20;
    final offset = json['offset'] is int ? json['offset'] as int : int.tryParse(json['offset']?.toString() ?? '0') ?? 0;
    final total = json['total'] is int ? json['total'] as int : int.tryParse(json['total']?.toString() ?? '0') ?? 0;
    final totalPages = json['totalPages'] is int
        ? json['totalPages'] as int
        : int.tryParse(json['totalPages']?.toString() ?? '1') ?? 1;
    final hasMore = json['hasMore'] as bool? ?? (page < totalPages);
    return ShopPagination(
      page: page,
      limit: limit,
      offset: offset,
      total: total,
      totalPages: totalPages,
      hasMore: hasMore,
    );
  }
}

class PaginatedProductsResult {
  final List<ProductModel> products;
  final ShopPagination pagination;

  const PaginatedProductsResult({
    required this.products,
    required this.pagination,
  });
}

class ShopService {
  final ApiClient _apiClient;

  ShopService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch product catalogue with category/type filters, search, and pagination
  Future<PaginatedProductsResult> fetchProductsPage({
    String? category,
    String? productType,
    String? search,
    int? page,
    int? limit,
    int? offset,
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
    if (page != null) queryParams['page'] = page;
    if (limit != null) queryParams['limit'] = limit;
    if (offset != null) queryParams['offset'] = offset;

    final response = await _apiClient.get(
      '/products',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    final data = response['data'] as Map<String, dynamic>? ?? {};
    final products = (data['products'] as List<dynamic>? ?? [])
        .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
        .toList();
    final paginationJson = data['pagination'] as Map<String, dynamic>?;
    final pagination = paginationJson != null
        ? ShopPagination.fromJson(paginationJson)
        : ShopPagination(
            page: page ?? 1,
            limit: limit ?? (products.isEmpty ? 20 : products.length),
            offset: offset ?? 0,
            total: products.length,
          );

    return PaginatedProductsResult(products: products, pagination: pagination);
  }

  /// Fetch product catalogue with category/type filters and search
  Future<List<ProductModel>> fetchProducts({
    String? category,
    String? productType,
    String? search,
    int? page,
    int? limit,
    int? offset,
  }) async {
    final result = await fetchProductsPage(
      category: category,
      productType: productType,
      search: search,
      page: page,
      limit: limit,
      offset: offset,
    );
    return result.products;
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

  Future<ShippingAddressModel> setDefaultShippingAddress(String id) async {
    final response = await _apiClient.patch('/account/addresses/$id/default');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    if (data.isEmpty) {
      return ShippingAddressModel.fromJson({'id': id, 'isDefault': true});
    }
    return ShippingAddressModel.fromJson(data);
  }

  /// Download order invoice PDF bytes (`GET /invoices/orders/$orderId/pdf`)
  Future<Uint8List> downloadOrderInvoicePdf(String orderId) async {
    return await _apiClient.getBytes('/invoices/orders/$orderId/pdf');
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
