import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/reports/models/report_purchase_models.dart';
import 'package:astro_mobile/features/reports/services/razorpay_checkout_service.dart';

/// What `POST /consultations/book` answers, for fake consultation services:
/// an unpaid booking whose slot is held for 15 minutes plus its payment order.
ConsultationReservation fakeConsultationReservation({
  required String consultationId,
  required String mode,
  required String date,
  required String startTime,
  required String endTime,
  String bookingId = 'bk-new',
  String bookingReference = 'BK-CONF-88',
  String title = 'General Consultation (Video)',
  int amountPaise = 1500000,
  int? gstPaise,
  String? gstType,
  Duration holdFor = const Duration(minutes: 15),
  List<ConsultationOfferingModel> catalog = const [],
}) {
  var amount = amountPaise;
  for (final o in catalog) {
    if (o.sku == consultationId) amount = o.pricePaise;
  }
  return ConsultationReservation(
    booking: ConsultationBookingModel(
      id: bookingId,
      bookingReference: bookingReference,
      serviceTitle: title,
      consultationMode: mode,
      appointmentDate: date,
      startTime: startTime,
      endTime: endTime,
      status: 'PENDING_PAYMENT',
      consultationId: consultationId,
      amountPaise: amount,
      gstPaise: gstPaise,
      gstType: gstType,
      reservationExpiresAt: DateTime.now().toUtc().add(holdFor),
    ),
    orderId: 'ord-new',
    razorpayKey: 'rzp_test_fake',
    razorpayOrderId: 'order_fake_1',
    amount: amount,
    currency: 'INR',
  );
}

/// Stand-in for the native Razorpay screen: records what was opened and lets
/// the test answer as the gateway would. No network, no real payment.
class FakeRazorpayCheckoutService implements IRazorpayCheckoutService {
  /// When true, [openCheckout] answers at once with a successful payment.
  final bool autoSucceed;

  FakeRazorpayCheckoutService({this.autoSucceed = false});

  RazorpaySuccessCallback? _onSuccess;
  RazorpayFailureCallback? _onFailure;
  RazorpayCancelCallback? _onCancel;

  ReportPaymentOrder? lastOrder;
  String? lastTitle;
  int openCalls = 0;

  @override
  void init({
    required RazorpaySuccessCallback onSuccess,
    required RazorpayFailureCallback onFailure,
    required RazorpayCancelCallback onCancel,
    RazorpayExternalWalletCallback? onExternalWallet,
  }) {
    _onSuccess = onSuccess;
    _onFailure = onFailure;
    _onCancel = onCancel;
  }

  @override
  void openCheckout({
    required ReportPaymentOrder order,
    required String reportTitle,
    String? userEmail,
    String? userContact,
  }) {
    openCalls++;
    lastOrder = order;
    lastTitle = reportTitle;
    if (autoSucceed) succeed();
  }

  void succeed({String paymentId = 'pay_fake_1', String signature = 'sig_fake_1', String? razorpayOrderId}) {
    _onSuccess?.call(
      razorpayOrderId: razorpayOrderId ?? lastOrder?.razorpayOrderId ?? '',
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    );
  }

  void cancel() => _onCancel?.call();

  void fail() => _onFailure?.call(errorCode: '2', errorMessage: 'Payment failed');

  @override
  void dispose() {}
}
