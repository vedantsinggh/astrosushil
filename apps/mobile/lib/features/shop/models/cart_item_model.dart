import 'product_model.dart';

class CartItemModel {
  final ProductModel product;
  final ProductVariantModel? variant;
  final int quantity;

  const CartItemModel({
    required this.product,
    this.variant,
    this.quantity = 1,
  });

  String get key => variant != null ? '${product.id}_${variant!.id}' : product.id;

  int get unitPricePaise => variant != null ? variant!.price : product.price;

  int get totalPaise => unitPricePaise * quantity;

  String get formattedUnitPrice {
    final rupees = (unitPricePaise / 100).round();
    return '₹$rupees';
  }

  String get formattedTotal {
    final rupees = (totalPaise / 100).round();
    return '₹$rupees';
  }

  bool get requiresShipping => product.requiresShipping;

  CartItemModel copyWith({
    ProductModel? product,
    ProductVariantModel? variant,
    int? quantity,
  }) {
    return CartItemModel(
      product: product ?? this.product,
      variant: variant ?? this.variant,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toCartPayload() {
    return {
      'productId': product.id,
      if (variant != null) 'variantId': variant!.id,
      'quantity': quantity,
    };
  }
}

class CartCalculationResult {
  final List<CartItemCalculated> items;
  final int subtotalPaise;
  final int taxAmountPaise;
  final int shippingAmountPaise;
  final int totalAmountPaise;
  final String currency;
  final bool requiresShipping;
  final bool eligibleForFreeShipping;

  const CartCalculationResult({
    required this.items,
    required this.subtotalPaise,
    required this.taxAmountPaise,
    required this.shippingAmountPaise,
    required this.totalAmountPaise,
    this.currency = 'INR',
    this.requiresShipping = false,
    this.eligibleForFreeShipping = false,
  });

  factory CartCalculationResult.fromJson(Map<String, dynamic> json) {
    List<CartItemCalculated> parsedItems = [];
    if (json['items'] is List) {
      parsedItems = (json['items'] as List)
          .map((i) => CartItemCalculated.fromJson(i as Map<String, dynamic>))
          .toList();
    }

    return CartCalculationResult(
      items: parsedItems,
      subtotalPaise: json['subtotal'] is int ? json['subtotal'] as int : 0,
      taxAmountPaise: json['taxAmount'] is int ? json['taxAmount'] as int : 0,
      shippingAmountPaise: json['shippingAmount'] is int ? json['shippingAmount'] as int : 0,
      totalAmountPaise: json['totalAmount'] is int ? json['totalAmount'] as int : 0,
      currency: json['currency'] as String? ?? 'INR',
      requiresShipping: json['requiresShipping'] as bool? ?? false,
      eligibleForFreeShipping: json['eligibleForFreeShipping'] as bool? ?? false,
    );
  }

  String get formattedSubtotal => '₹${(subtotalPaise / 100).round()}';
  String get formattedTax => '₹${(taxAmountPaise / 100).round()}';
  String get formattedShipping => shippingAmountPaise == 0 ? 'FREE' : '₹${(shippingAmountPaise / 100).round()}';
  String get formattedTotal => '₹${(totalAmountPaise / 100).round()}';
}

class CartItemCalculated {
  final String productId;
  final String title;
  final String? variantName;
  final int quantity;
  final int unitPrice;
  final int totalAmount;

  const CartItemCalculated({
    required this.productId,
    required this.title,
    this.variantName,
    required this.quantity,
    required this.unitPrice,
    required this.totalAmount,
  });

  factory CartItemCalculated.fromJson(Map<String, dynamic> json) {
    return CartItemCalculated(
      productId: json['productId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      variantName: json['variantName'] as String?,
      quantity: json['quantity'] is int ? json['quantity'] as int : 1,
      unitPrice: json['unitPrice'] is int ? json['unitPrice'] as int : 0,
      totalAmount: json['totalAmount'] is int ? json['totalAmount'] as int : 0,
    );
  }
}
