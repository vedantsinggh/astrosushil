import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/product_model.dart';
import '../models/shipping_address_model.dart';
import '../models/shop_order_model.dart';
import '../models/digital_download_model.dart';
import '../services/shop_service.dart';

/// Provider for ShopService
final shopServiceProvider = Provider<ShopService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ShopService(apiClient: apiClient);
});

/// Filter & search state providers
final shopSearchQueryProvider = StateProvider<String>((ref) => '');
final selectedShopCategoryProvider = StateProvider<String>((ref) => 'ALL');
final selectedShopProductTypeProvider = StateProvider<String>((ref) => 'ALL');

/// Async provider for product catalogue
final shopProductsProvider = FutureProvider<List<ProductModel>>((ref) async {
  final service = ref.watch(shopServiceProvider);
  final search = ref.watch(shopSearchQueryProvider);
  final category = ref.watch(selectedShopCategoryProvider);
  final productType = ref.watch(selectedShopProductTypeProvider);

  return service.fetchProducts(
    search: search.isNotEmpty ? search : null,
    category: category != 'ALL' ? category : null,
    productType: productType != 'ALL' ? productType : null,
  );
});

/// Family provider for product details by ID or slug
final productDetailProvider =
    FutureProvider.family<ProductModel, String>((ref, idOrSlug) async {
  final service = ref.watch(shopServiceProvider);
  return service.fetchProductDetails(idOrSlug);
});

/// Async provider for user's shipping addresses
final shippingAddressesProvider =
    FutureProvider<List<ShippingAddressModel>>((ref) async {
  final service = ref.watch(shopServiceProvider);
  return service.fetchShippingAddresses();
});

/// Async provider for user's order history
final customerOrdersProvider =
    FutureProvider<List<ShopOrderModel>>((ref) async {
  final service = ref.watch(shopServiceProvider);
  return service.fetchMyOrders();
});

/// Family provider for specific order details
final orderDetailProvider =
    FutureProvider.family<ShopOrderModel, String>((ref, orderId) async {
  final service = ref.watch(shopServiceProvider);
  return service.fetchOrderDetails(orderId);
});

/// Async provider for user's digital downloads library
final digitalDownloadsProvider =
    FutureProvider<List<DigitalDownloadModel>>((ref) async {
  final service = ref.watch(shopServiceProvider);
  return service.fetchDigitalDownloads();
});

/// Async provider for Customer Account Hub summary
final accountSummaryProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final service = ref.watch(shopServiceProvider);
  return service.fetchAccountSummary();
});
