import 'package:flutter/foundation.dart';

/// How long the server holds a slot after `POST /consultations/book` while the
/// customer pays (`RESERVATION_HOLD_MINUTES` on the backend). Display only:
/// the actual expiry always comes from the booking's `reservationExpiresAt`.
const int kConsultationHoldMinutes = 15;

int? _asInt(Object? v) {
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v);
  return null;
}

/// `1234500` paise -> `₹12,345`; `99982` -> `₹999.82` (Indian digit grouping,
/// paise shown only when the amount is not a whole number of rupees).
String formatInrPaise(int paise) {
  final negative = paise < 0;
  final abs = paise.abs();
  final rupees = (abs ~/ 100).toString();
  final rem = abs % 100;
  String grouped;
  if (rupees.length <= 3) {
    grouped = rupees;
  } else {
    final last3 = rupees.substring(rupees.length - 3);
    var rest = rupees.substring(0, rupees.length - 3);
    final parts = <String>[];
    while (rest.length > 2) {
      parts.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) parts.insert(0, rest);
    grouped = '${parts.join(',')},$last3';
  }
  final fraction = rem == 0 ? '' : '.${rem.toString().padLeft(2, '0')}';
  return '${negative ? '-' : ''}₹$grouped$fraction';
}

/// The mode value the booking API accepts (`AUDIO`, `VIDEO`, `IN_PERSON`),
/// from whatever the catalogue or an older client stored.
String consultationApiMode(String mode) {
  final m = mode.toUpperCase();
  if (m.contains('PERSON')) return 'IN_PERSON';
  if (m.contains('AUDIO') || m.contains('VOICE') || m.contains('PHONE')) return 'AUDIO';
  return 'VIDEO';
}

@immutable
class PractitionerModel {
  final String id;
  final String name;
  final String title;
  final String bio;

  const PractitionerModel({
    required this.id,
    required this.name,
    required this.title,
    required this.bio,
  });

  factory PractitionerModel.fromJson(Map<String, dynamic> json) {
    return PractitionerModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Astro Sushil Kumar Singh',
      title: json['title'] as String? ?? 'Principal Astrologer & Nadi Expert',
      bio: json['bio'] as String? ?? '',
    );
  }
}

@immutable
class ConsultationOfferingModel {
  final String sku;
  final String title;
  final String? hindiTitle;
  final String description;
  final String? hindiDescription;
  final String mode;
  final int durationMinutes;
  final int pricePaise;
  final int responseDaysNotice;
  final String category;
  final bool isAvailable;
  final List<PractitionerModel> practitioners;

  /// Listed price before GST handling (`basePricePaise`). For a type whose GST
  /// is exclusive, GST is added on top of this; [pricePaise] is always what
  /// the customer pays.
  final int? basePricePaise;

  /// GST part of [pricePaise] (included in the listed price, or added on top).
  final int? gstPaise;

  /// True: GST is inside the listed price. False: GST is added on top.
  final bool taxIncluded;

  /// 1800 = 18%.
  final int? taxRateBasisPoints;

  /// IST dates (`yyyy-MM-dd`) on which this consultation cannot be booked.
  final List<String> unavailableDates;

  const ConsultationOfferingModel({
    required this.sku,
    required this.title,
    this.hindiTitle,
    required this.description,
    this.hindiDescription,
    required this.mode,
    required this.durationMinutes,
    required this.pricePaise,
    required this.responseDaysNotice,
    required this.category,
    this.isAvailable = true,
    this.practitioners = const [],
    this.basePricePaise,
    this.gstPaise,
    this.taxIncluded = true,
    this.taxRateBasisPoints,
    this.unavailableDates = const [],
  });

  int get priceRupees => pricePaise ~/ 100;

  /// GST is charged on top of the listed price (and there is some).
  bool get gstAddedOnTop => !taxIncluded && (gstPaise ?? 0) > 0;

  bool get hasGst => (gstPaise ?? 0) > 0;

  /// The amount shown before GST: the listed price when GST is added on top,
  /// otherwise the total minus the GST it contains.
  int get amountBeforeGstPaise =>
      gstAddedOnTop ? (basePricePaise ?? (pricePaise - (gstPaise ?? 0))) : pricePaise - (gstPaise ?? 0);

  /// "18" or "12.5" for the GST rate, null when unknown or zero.
  String? get gstPercentLabel {
    final bp = taxRateBasisPoints;
    if (bp == null || bp <= 0) return null;
    return bp % 100 == 0 ? '${bp ~/ 100}' : (bp / 100).toString();
  }

  factory ConsultationOfferingModel.fromJson(Map<String, dynamic> json) {
    final practitionersList = (json['practitioners'] as List<dynamic>?)
            ?.map((p) => PractitionerModel.fromJson(p as Map<String, dynamic>))
            .toList() ??
        const [];

    return ConsultationOfferingModel(
      sku: json['sku'] as String? ?? json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      description: json['description'] as String? ?? '',
      hindiDescription: json['hindiDescription'] as String?,
      mode: json['mode'] as String? ?? 'ONLINE_VIDEO',
      durationMinutes: _asInt(json['durationMinutes']) ?? 0,
      pricePaise: _asInt(json['pricePaise']) ?? 0,
      responseDaysNotice: _asInt(json['responseDaysNotice']) ?? _asInt(json['responseDays']) ?? 7,
      category: json['category'] as String? ?? 'General',
      isAvailable: json['isAvailable'] as bool? ?? true,
      practitioners: practitionersList,
      basePricePaise: _asInt(json['basePricePaise']),
      gstPaise: _asInt(json['gstPaise']),
      taxIncluded: json['taxIncluded'] as bool? ?? true,
      taxRateBasisPoints: _asInt(json['taxRateBasisPoints']),
      unavailableDates: (json['unavailableDates'] as List<dynamic>?)?.map((d) => d.toString()).toList() ?? const [],
    );
  }
}

@immutable
class AppointmentSlotModel {
  final String id;
  final String practitionerId;
  final String practitionerName;
  final String date;
  final String startTime;
  final String endTime;
  final String mode;
  final String status;
  final bool isBookable;

  const AppointmentSlotModel({
    required this.id,
    required this.practitionerId,
    required this.practitionerName,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.mode,
    required this.status,
    this.isBookable = true,
  });

  /// Two slots are the same choice when they cover the same time of the same
  /// day (the slot API has no ids: a slot is `{startTime, endTime}`).
  bool sameTimeAs(AppointmentSlotModel? other) =>
      other != null && other.date == date && other.startTime == startTime && other.endTime == endTime;

  /// A slot as `GET /consultations/slots` returns it: only free slots are
  /// listed, each as `{startTime, endTime}` (IST, `HH:mm`) of [date].
  factory AppointmentSlotModel.fromApi(Map<String, dynamic> json, {required String date}) {
    final start = json['startTime'] as String? ?? '';
    final end = json['endTime'] as String? ?? '';
    return AppointmentSlotModel(
      id: '$date $start-$end',
      practitionerId: '',
      practitionerName: '',
      date: date,
      startTime: start,
      endTime: end,
      mode: '',
      status: 'AVAILABLE',
      isBookable: true,
    );
  }

  factory AppointmentSlotModel.fromJson(Map<String, dynamic> json) {
    return AppointmentSlotModel(
      id: json['id'] as String? ?? '',
      practitionerId: json['practitionerId'] as String? ?? '',
      practitionerName: json['practitionerName'] as String? ?? 'Astro Sushil',
      date: json['date'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      mode: json['mode'] as String? ?? 'ONLINE_VIDEO',
      status: json['status'] as String? ?? 'UNKNOWN',
      isBookable: json['isBookable'] as bool? ?? (json['status'] == 'AVAILABLE'),
    );
  }
}

@immutable
class ConsultationBookingModel {
  final String id;
  final String bookingReference;
  final String serviceTitle;
  final String consultationMode;
  final String appointmentDate;
  final String startTime;
  final String endTime;
  final String status;
  final String? meetingLink;
  final String? dialInNumber;
  final String? notes;
  final String? query;
  final String? orderId;
  final String? orderNumber;
  final int? pricePaise;
  final String? birthProfileName;
  final String? createdAt;

  /// Catalog id of the booked consultation (needed to list slots when
  /// rescheduling).
  final String? consultationId;
  final int? durationMinutes;

  /// What the customer pays or paid, GST included (`amountPaise`, else the
  /// linked order's amount).
  final int? amountPaise;
  final int? gstPaise;

  /// `INCLUSIVE` or `EXCLUSIVE`.
  final String? gstType;

  /// Until when an unpaid booking's slot is held (UTC instant).
  final DateTime? reservationExpiresAt;
  final String? locationAddress;
  final String? invoiceNumber;
  final String? cancellationReason;

  const ConsultationBookingModel({
    required this.id,
    required this.bookingReference,
    required this.serviceTitle,
    required this.consultationMode,
    required this.appointmentDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.meetingLink,
    this.dialInNumber,
    this.notes,
    this.query,
    this.orderId,
    this.orderNumber,
    this.pricePaise,
    this.birthProfileName,
    this.createdAt,
    this.consultationId,
    this.durationMinutes,
    this.amountPaise,
    this.gstPaise,
    this.gstType,
    this.reservationExpiresAt,
    this.locationAddress,
    this.invoiceNumber,
    this.cancellationReason,
  });

  int get priceRupees => (pricePaise ?? 0) ~/ 100;

  /// The reference a customer can quote to support: the server's booking
  /// reference when it has one, else the first 8 characters of the booking id
  /// (the API has no separate reference number).
  String get displayReference {
    if (bookingReference.isNotEmpty) return bookingReference;
    return id.length > 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();
  }

  /// Total to show for this booking, or null when the server sent none.
  int? get totalPaise => amountPaise ?? pricePaise;

  /// True when this unpaid booking's hold has run out (the slot is no longer
  /// kept). A booking without an expiry is never treated as expired here.
  bool isHoldExpired([DateTime? now]) {
    final until = reservationExpiresAt;
    if (!isPendingPayment || until == null) return false;
    return !(now ?? DateTime.now()).toUtc().isBefore(until.toUtc());
  }

  /// Cancelled by the server because payment did not arrive within the hold.
  bool get isReservationExpired => isCancelled && cancellationReason == 'RESERVATION_EXPIRED';

  bool get isConfirmed => status == 'CONFIRMED';
  bool get isPendingPayment => status == 'PENDING_PAYMENT' || status == 'RESERVED';
  bool get isRescheduled => status == 'RESCHEDULED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isCompleted => status == 'COMPLETED';

  /// Accepts both the legacy client field names and the field names the API
  /// actually returns for a `ConsultationBooking` row (`title`, `mode`,
  /// `date`, `primaryQuestion`, nested `birthProfile`).
  factory ConsultationBookingModel.fromJson(Map<String, dynamic> json) {
    final birthProfile = json['birthProfile'];
    final order = json['order'];
    final expires = json['reservationExpiresAt'];
    return ConsultationBookingModel(
      id: json['id'] as String? ?? '',
      bookingReference: json['bookingReference'] as String? ?? '',
      serviceTitle: json['serviceTitle'] as String? ?? json['title'] as String? ?? 'Astrological Consultation',
      consultationMode: json['consultationMode'] as String? ?? json['mode'] as String? ?? 'ONLINE_VIDEO',
      appointmentDate: json['appointmentDate'] as String? ?? json['date'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING_PAYMENT',
      meetingLink: json['meetingLink'] as String?,
      dialInNumber: json['dialInNumber'] as String?,
      notes: json['notes'] as String?,
      query: json['query'] as String? ?? json['primaryQuestion'] as String?,
      orderId: json['orderId'] as String?,
      orderNumber: json['orderNumber'] as String?,
      pricePaise: _asInt(json['pricePaise']),
      birthProfileName:
          json['birthProfileName'] as String? ?? (birthProfile is Map ? birthProfile['name'] as String? : null),
      createdAt: json['createdAt'] as String?,
      consultationId: json['consultationId'] as String?,
      durationMinutes: _asInt(json['durationMinutes']),
      amountPaise: _asInt(json['amountPaise']) ?? (order is Map ? _asInt(order['amount']) : null),
      gstPaise: _asInt(json['gstPaise']),
      gstType: json['gstType'] as String?,
      reservationExpiresAt: expires is String ? DateTime.tryParse(expires)?.toUtc() : null,
      locationAddress: json['locationAddress'] as String?,
      invoiceNumber: json['invoiceNumber'] as String?,
      cancellationReason: json['cancellationReason'] as String?,
    );
  }
}

/// What `POST /consultations/book` returns: the unpaid booking whose slot is
/// now held, and what the payment gateway needs to collect the amount.
@immutable
class ConsultationReservation {
  final ConsultationBookingModel booking;

  /// Our order id (`order.orderId`).
  final String orderId;

  /// `razorpayConfig.key`.
  final String razorpayKey;

  /// `razorpayConfig.orderId`: the gateway order the payment must be made on.
  final String razorpayOrderId;

  /// `razorpayConfig.amount`, in the minor unit of [currency].
  final int amount;
  final String currency;

  const ConsultationReservation({
    required this.booking,
    required this.orderId,
    required this.razorpayKey,
    required this.razorpayOrderId,
    required this.amount,
    required this.currency,
  });

  /// The server's total for this booking in paise (INR).
  int get totalPaise => booking.amountPaise ?? amount;

  bool isExpired([DateTime? now]) => booking.isHoldExpired(now);

  factory ConsultationReservation.fromJson(Map<String, dynamic> json) {
    final booking = json['booking'];
    final order = json['order'];
    final config = json['razorpayConfig'];
    if (booking is! Map || config is! Map) {
      throw const FormatException('Booking response has no booking or payment details');
    }
    final orderMap = order is Map ? order : const <String, dynamic>{};
    final razorpayOrderId = (config['orderId'] ?? orderMap['razorpayOrderId'] ?? '') as String;
    final amount = _asInt(config['amount']) ?? _asInt(orderMap['amount']) ?? 0;
    if (razorpayOrderId.isEmpty || amount <= 0) {
      throw const FormatException('Booking response has no payable order');
    }
    return ConsultationReservation(
      booking: ConsultationBookingModel.fromJson(Map<String, dynamic>.from(booking)),
      orderId: (orderMap['orderId'] ?? orderMap['id'] ?? '') as String,
      razorpayKey: (config['key'] ?? '') as String,
      razorpayOrderId: razorpayOrderId,
      amount: amount,
      currency: (config['currency'] ?? orderMap['currency'] ?? 'INR') as String,
    );
  }
}

/// `GET /consultations/my-bookings/:id/invoice` (paid bookings only).
@immutable
class ConsultationInvoiceModel {
  final String bookingId;
  final String? invoiceNumber;
  final int? taxablePaise;
  final int? gstPaise;
  final int? totalPaise;
  final int? gstRateBasisPoints;
  final String? gstType;

  const ConsultationInvoiceModel({
    required this.bookingId,
    this.invoiceNumber,
    this.taxablePaise,
    this.gstPaise,
    this.totalPaise,
    this.gstRateBasisPoints,
    this.gstType,
  });

  factory ConsultationInvoiceModel.fromJson(Map<String, dynamic> json) {
    final amounts = json['amounts'];
    final a = amounts is Map ? amounts : const <String, dynamic>{};
    return ConsultationInvoiceModel(
      bookingId: json['bookingId'] as String? ?? '',
      invoiceNumber: json['invoiceNumber'] as String?,
      taxablePaise: _asInt(a['taxablePaise']),
      gstPaise: _asInt(a['gstPaise']),
      totalPaise: _asInt(a['totalPaise']),
      gstRateBasisPoints: _asInt(a['gstRateBasisPoints']),
      gstType: a['gstType'] as String?,
    );
  }
}
