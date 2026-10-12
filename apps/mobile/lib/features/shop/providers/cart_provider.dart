import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product_model.dart';
import '../models/cart_item_model.dart';
import '../models/shipping_address_model.dart';
import 'shop_provider.dart';

class CartState {
  final List<CartItemModel> items;
  final ShippingAddressModel? selectedAddress;
  final CartCalculationResult? calculation;
  final bool isLoading;
  final String? errorMessage;

  const CartState({
    this.items = const [],
    this.selectedAddress,
    this.calculation,
    this.isLoading = false,
    this.errorMessage,
  });

  bool get isEmpty => items.isEmpty;
  int get itemCount => items.fold(0, (sum, i) => sum + i.quantity);
  bool get requiresShipping => items.any((i) => i.requiresShipping);

  int get localSubtotalPaise => items.fold(0, (sum, i) => sum + i.totalPaise);
  String get formattedLocalSubtotal => '₹${(localSubtotalPaise / 100).round()}';

  CartState copyWith({
    List<CartItemModel>? items,
    ShippingAddressModel? selectedAddress,
    CartCalculationResult? calculation,
    bool? isLoading,
    String? errorMessage,
  }) {
    return CartState(
      items: items ?? this.items,
      selectedAddress: selectedAddress ?? this.selectedAddress,
      calculation: calculation ?? this.calculation,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  final Ref _ref;

  CartNotifier(this._ref) : super(const CartState());

  /// Add item to cart or increment quantity
  void addItem(
    ProductModel product, {
    ProductVariantModel? variant,
    int quantity = 1,
  }) {
    final existingIndex = state.items.indexWhere(
      (item) =>
          item.product.id == product.id &&
          ((variant == null && item.variant == null) ||
              (variant != null && item.variant?.id == variant.id)),
    );

    List<CartItemModel> updatedItems;
    if (existingIndex >= 0) {
      final existing = state.items[existingIndex];
      final updated = existing.copyWith(quantity: existing.quantity + quantity);
      updatedItems = List.from(state.items)..[existingIndex] = updated;
    } else {
      updatedItems = [
        ...state.items,
        CartItemModel(product: product, variant: variant, quantity: quantity),
      ];
    }

    state = state.copyWith(items: updatedItems);
    recalculate();
  }

  /// Remove item by key
  void removeItem(String key) {
    final updatedItems = state.items.where((i) => i.key != key).toList();
    state = state.copyWith(items: updatedItems);
    if (updatedItems.isNotEmpty) {
      recalculate();
    } else {
      state = state.copyWith(calculation: null);
    }
  }

  /// Update item quantity
  void updateQuantity(String key, int newQuantity) {
    if (newQuantity <= 0) {
      removeItem(key);
      return;
    }

    final updatedItems = state.items.map((i) {
      if (i.key == key) {
        return i.copyWith(quantity: newQuantity);
      }
      return i;
    }).toList();

    state = state.copyWith(items: updatedItems);
    recalculate();
  }

  /// Select shipping address for physical items
  void selectAddress(ShippingAddressModel address) {
    state = state.copyWith(selectedAddress: address);
    if (state.items.isNotEmpty) {
      recalculate();
    }
  }

  /// Clear cart
  void clearCart() {
    state = const CartState();
  }

  /// Recalculate totals server-authoritatively
  Future<void> recalculate() async {
    if (state.items.isEmpty) {
      state = state.copyWith(calculation: null);
      return;
    }

    try {
      state = state.copyWith(isLoading: true, errorMessage: null);
      final service = _ref.read(shopServiceProvider);
      final result = await service.calculateCart(
        state.items,
        shippingAddressId: state.selectedAddress?.id,
      );
      state = state.copyWith(calculation: result, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier(ref);
});
