import 'shipping_address_model.dart';

class ShopOrderItemModel {
  final String id;
  final String catalogId;
  final String title;
  final String? description;
  final int quantity;
  final int unitPrice; // in paise
  final int totalAmount; // in paise
  final String fulfillmentType; // DIGITAL, PHYSICAL, SERVICE
  final Map<String, dynamic>? metadata;

  const ShopOrderItemModel({
    required this.id,
    required this.catalogId,
    required this.title,
    this.description,
    required this.quantity,
    required this.unitPrice,
    required this.totalAmount,
    required this.fulfillmentType,
    this.metadata,
  });

  factory ShopOrderItemModel.fromJson(Map<String, dynamic> json) {
    return ShopOrderItemModel(
      id: json['id'] as String? ?? '',
      catalogId: json['catalogId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      quantity: json['quantity'] is int ? json['quantity'] as int : 1,
      unitPrice: json['unitPrice'] is int ? json['unitPrice'] as int : 0,
      totalAmount: json['totalAmount'] is int ? json['totalAmount'] as int : 0,
      fulfillmentType: json['fulfillmentType'] as String? ?? 'DIGITAL',
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  String get formattedUnitPrice => '₹${(unitPrice / 100).round()}';
  String get formattedTotal => '₹${(totalAmount / 100).round()}';
  bool get isPhysical => fulfillmentType == 'PHYSICAL';
  bool get isDigital => fulfillmentType == 'DIGITAL';
}

class ShopOrderModel {
  final String id;
  final String razorpayOrderId;
  final String? razorpayPaymentId;
  final int amount; // Total in paise
  final int subtotal;
  final int taxAmount;
  final int shippingAmount;
  final String currency;
  final String status; // PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED, CANCELLED
  final String paymentStatus; // PENDING, CAPTURED, FAILED, REFUNDED
  final String fulfillmentStatus; // UNFULFILLED, PROCESSING, DISPATCHED, DELIVERED, FULFILLED, CANCELLED
  final String? trackingNumber;
  final String? courierPartner;
  final DateTime? dispatchedAt;
  final DateTime? deliveredAt;
  final DateTime createdAt;
  final List<ShopOrderItemModel> items;
  final ShippingAddressModel? shippingAddress;

  const ShopOrderModel({
    required this.id,
    required this.razorpayOrderId,
    this.razorpayPaymentId,
    required this.amount,
    required this.subtotal,
    required this.taxAmount,
    this.shippingAmount = 0,
    this.currency = 'INR',
    required this.status,
    required this.paymentStatus,
    required this.fulfillmentStatus,
    this.trackingNumber,
    this.courierPartner,
    this.dispatchedAt,
    this.deliveredAt,
    required this.createdAt,
    this.items = const [],
    this.shippingAddress,
  });

  factory ShopOrderModel.fromJson(Map<String, dynamic> json) {
    List<ShopOrderItemModel> parsedItems = [];
    if (json['items'] is List) {
      parsedItems = (json['items'] as List)
          .map((i) => ShopOrderItemModel.fromJson(i as Map<String, dynamic>))
          .toList();
    }

    ShippingAddressModel? parsedAddress;
    if (json['shippingAddress'] is Map<String, dynamic>) {
      parsedAddress = ShippingAddressModel.fromJson(json['shippingAddress'] as Map<String, dynamic>);
    }

    return ShopOrderModel(
      id: json['id'] as String? ?? '',
      razorpayOrderId: json['razorpayOrderId'] as String? ?? '',
      razorpayPaymentId: json['razorpayPaymentId'] as String?,
      amount: json['amount'] is int ? json['amount'] as int : 0,
      subtotal: json['subtotal'] is int ? json['subtotal'] as int : 0,
      taxAmount: json['taxAmount'] is int ? json['taxAmount'] as int : 0,
      shippingAmount: json['shippingAmount'] is int ? json['shippingAmount'] as int : 0,
      currency: json['currency'] as String? ?? 'INR',
      status: json['status'] as String? ?? 'PENDING',
      paymentStatus: json['paymentStatus'] as String? ?? 'PENDING',
      fulfillmentStatus: json['fulfillmentStatus'] as String? ?? 'UNFULFILLED',
      trackingNumber: json['trackingNumber'] as String?,
      courierPartner: json['courierPartner'] as String?,
      dispatchedAt: json['dispatchedAt'] != null ? DateTime.tryParse(json['dispatchedAt'].toString()) : null,
      deliveredAt: json['deliveredAt'] != null ? DateTime.tryParse(json['deliveredAt'].toString()) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      items: parsedItems,
      shippingAddress: parsedAddress,
    );
  }

  String get formattedAmount => '₹${(amount / 100).round()}';
  String get formattedSubtotal => '₹${(subtotal / 100).round()}';
  String get formattedTax => '₹${(taxAmount / 100).round()}';
  String get formattedShipping => shippingAmount == 0 ? 'FREE' : '₹${(shippingAmount / 100).round()}';

  bool get isPaid => status == 'PAID' || paymentStatus == 'CAPTURED';
  bool get isPending => status == 'PENDING';
  bool get isFailed => status == 'FAILED';
  bool get isDispatched => fulfillmentStatus == 'DISPATCHED';
  bool get isDelivered => fulfillmentStatus == 'DELIVERED';
  bool get isProcessing => fulfillmentStatus == 'PROCESSING';

  bool get hasPhysicalItems => items.any((i) => i.isPhysical);
}
