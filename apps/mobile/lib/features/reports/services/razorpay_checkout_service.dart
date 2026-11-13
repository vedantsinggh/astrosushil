import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../models/report_purchase_models.dart';

typedef RazorpaySuccessCallback = void Function({
  required String razorpayOrderId,
  required String razorpayPaymentId,
  required String razorpaySignature,
});

typedef RazorpayFailureCallback = void Function({
  required String errorCode,
  required String errorMessage,
});

typedef RazorpayCancelCallback = void Function();

typedef RazorpayExternalWalletCallback = void Function({
  required String walletName,
});

abstract class IRazorpayCheckoutService {
  void init({
    required RazorpaySuccessCallback onSuccess,
    required RazorpayFailureCallback onFailure,
    required RazorpayCancelCallback onCancel,
    RazorpayExternalWalletCallback? onExternalWallet,
  });

  void openCheckout({
    required ReportPaymentOrder order,
    required String reportTitle,
    String? userEmail,
    String? userContact,
  });

  void dispose();
}

class NativeRazorpayCheckoutService implements IRazorpayCheckoutService {
  Razorpay? _razorpay;
  bool _isInitialized = false;
  bool _isCheckoutActive = false;
  bool _hasHandledCallback = false;

  RazorpaySuccessCallback? _onSuccess;
  RazorpayFailureCallback? _onFailure;
  RazorpayCancelCallback? _onCancel;
  RazorpayExternalWalletCallback? _onExternalWallet;

  @override
  void init({
    required RazorpaySuccessCallback onSuccess,
    required RazorpayFailureCallback onFailure,
    required RazorpayCancelCallback onCancel,
    RazorpayExternalWalletCallback? onExternalWallet,
  }) {
    dispose();
    _onSuccess = onSuccess;
    _onFailure = onFailure;
    _onCancel = onCancel;
    _onExternalWallet = onExternalWallet;
    _hasHandledCallback = false;

    _razorpay = Razorpay();
    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    _isInitialized = true;
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    if (!_isCheckoutActive || _hasHandledCallback) return;
    _hasHandledCallback = true;
    _isCheckoutActive = false;

    _onSuccess?.call(
      razorpayOrderId: response.orderId ?? '',
      razorpayPaymentId: response.paymentId ?? '',
      razorpaySignature: response.signature ?? '',
    );
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (!_isCheckoutActive || _hasHandledCallback) return;
    _hasHandledCallback = true;
    _isCheckoutActive = false;

    // Check if error represents user cancellation
    final isCancelled = response.code == Razorpay.PAYMENT_CANCELLED ||
        (response.message?.toLowerCase().contains('cancelled') ?? false) ||
        (response.message?.toLowerCase().contains('canceled') ?? false);

    if (isCancelled) {
      _onCancel?.call();
    } else {
      _onFailure?.call(
        errorCode: response.code.toString(),
        errorMessage: response.message ?? 'Payment failed or declined',
      );
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (!_isCheckoutActive) return;
    _onExternalWallet?.call(walletName: response.walletName ?? '');
  }

  @override
  void openCheckout({
    required ReportPaymentOrder order,
    required String reportTitle,
    String? userEmail,
    String? userContact,
  }) {
    if (_isCheckoutActive) {
      debugPrint('[RAZORPAY_CHECKOUT] Checkout already active. Ignoring duplicate open request.');
      return;
    }
    if (!_isInitialized || _razorpay == null) {
      throw StateError('Razorpay is not initialized. Call init() before openCheckout().');
    }

    _isCheckoutActive = true;
    _hasHandledCallback = false;

    final key = order.razorpayKey.isNotEmpty
        ? order.razorpayKey
        : 'rzp_test_TzKn7xm9pztKyo';

    final options = {
      'key': key,
      'amount': order.amount, // in paise
      'name': 'Astro Sushil',
      'description': reportTitle,
      'order_id': order.razorpayOrderId,
      'currency': order.currency,
      'timeout': 300,
      'prefill': {
        if (userContact != null && userContact.isNotEmpty) 'contact': userContact,
        if (userEmail != null && userEmail.isNotEmpty) 'email': userEmail,
      },
      'theme': {
        'color': '#0F172A',
      },
      'retry': {
        'enabled': true,
        'max_count': 1,
      },
    };

    _razorpay!.open(options);
  }

  @override
  void dispose() {
    _isCheckoutActive = false;
    _hasHandledCallback = false;
    _isInitialized = false;
    try {
      _razorpay?.clear();
    } catch (_) {}
    _razorpay = null;
    _onSuccess = null;
    _onFailure = null;
    _onCancel = null;
    _onExternalWallet = null;
  }
}

final razorpayCheckoutServiceProvider = Provider<IRazorpayCheckoutService>((ref) {
  final service = NativeRazorpayCheckoutService();
  ref.onDispose(() => service.dispose());
  return service;
});
