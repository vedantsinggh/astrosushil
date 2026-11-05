enum ReportPurchaseStep {
  idle,
  creatingOrder,
  orderCreated,
  openingCheckout,
  awaitingPayment,
  verifyingPayment,
  paymentSuccess,
  paymentCancelled,
  paymentFailed,
  orderCreationFailed,
  verificationFailed,
  generatingReport,
  completed,
}

class ReportPaymentOrder {
  final String orderId;
  final String razorpayOrderId;
  final int amount; // in paise
  final int subtotal;
  final int taxAmount;
  final String currency;
  final String status; // PENDING, PAID, FAILED, CANCELLED
  final String paymentStatus; // PENDING, CAPTURED, FAILED
  final String? reportType;
  final String razorpayKey;
  final List<dynamic> items;

  const ReportPaymentOrder({
    required this.orderId,
    required this.razorpayOrderId,
    required this.amount,
    required this.subtotal,
    required this.taxAmount,
    required this.currency,
    required this.status,
    required this.paymentStatus,
    this.reportType,
    this.razorpayKey = '',
    this.items = const [],
  });

  factory ReportPaymentOrder.fromJson(Map<String, dynamic> json) {
    return ReportPaymentOrder(
      orderId: (json['orderId'] ?? json['id'] ?? '') as String,
      razorpayOrderId: (json['razorpayOrderId'] ?? '') as String,
      amount: (json['amount'] is int)
          ? json['amount'] as int
          : (int.tryParse(json['amount']?.toString() ?? '0') ?? 0),
      subtotal: (json['subtotal'] is int)
          ? json['subtotal'] as int
          : (int.tryParse(json['subtotal']?.toString() ?? '0') ?? 0),
      taxAmount: (json['taxAmount'] is int)
          ? json['taxAmount'] as int
          : (int.tryParse(json['taxAmount']?.toString() ?? '0') ?? 0),
      currency: (json['currency'] ?? 'INR') as String,
      status: (json['status'] ?? 'PENDING') as String,
      paymentStatus: (json['paymentStatus'] ?? 'PENDING') as String,
      reportType: json['reportType'] as String?,
      razorpayKey: (json['razorpayKey'] ?? json['key'] ?? '') as String,
      items: (json['items'] is List) ? json['items'] as List<dynamic> : const [],
    );
  }

  String get formattedAmount => '₹${(amount / 100).toStringAsFixed(2)}';
  bool get isPaid => status == 'PAID' || paymentStatus == 'CAPTURED';
}

class ReportPaymentVerificationResult {
  final bool isSuccess;
  final String orderId;
  final String? message;
  final Map<String, dynamic>? order;

  const ReportPaymentVerificationResult({
    required this.isSuccess,
    required this.orderId,
    this.message,
    this.order,
  });

  factory ReportPaymentVerificationResult.fromJson(Map<String, dynamic> json) {
    final orderMap = json['order'] as Map<String, dynamic>?;
    final orderStatus = orderMap?['status'] as String?;
    final isSuccess = orderStatus == 'PAID' ||
        (json['message']?.toString().toLowerCase().contains('success') ?? false);

    return ReportPaymentVerificationResult(
      isSuccess: isSuccess,
      orderId: orderMap?['id'] as String? ?? '',
      message: json['message'] as String?,
      order: orderMap,
    );
  }
}
