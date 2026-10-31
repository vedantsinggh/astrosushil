import 'package:flutter/foundation.dart';

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
  });

  int get priceRupees => pricePaise ~/ 100;

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
      durationMinutes: json['durationMinutes'] as int? ?? 30,
      pricePaise: json['pricePaise'] as int? ?? 0,
      responseDaysNotice: json['responseDaysNotice'] as int? ??
          json['responseDays'] as int? ??
          7,
      category: json['category'] as String? ?? 'General',
      isAvailable: json['isAvailable'] as bool? ?? true,
      practitioners: practitionersList,
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

  factory AppointmentSlotModel.fromJson(Map<String, dynamic> json) {
    return AppointmentSlotModel(
      id: json['id'] as String? ?? '',
      practitionerId: json['practitionerId'] as String? ?? '',
      practitionerName: json['practitionerName'] as String? ?? 'Astro Sushil',
      date: json['date'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      mode: json['mode'] as String? ?? 'ONLINE_VIDEO',
      status: json['status'] as String? ?? 'AVAILABLE',
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
  });

  int get priceRupees => (pricePaise ?? 0) ~/ 100;

  bool get isConfirmed => status == 'CONFIRMED';
  bool get isPendingPayment => status == 'PENDING_PAYMENT' || status == 'RESERVED';
  bool get isRescheduled => status == 'RESCHEDULED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isCompleted => status == 'COMPLETED';

  factory ConsultationBookingModel.fromJson(Map<String, dynamic> json) {
    return ConsultationBookingModel(
      id: json['id'] as String? ?? '',
      bookingReference: json['bookingReference'] as String? ?? '',
      serviceTitle: json['serviceTitle'] as String? ?? 'Astrological Consultation',
      consultationMode: json['consultationMode'] as String? ?? 'ONLINE_VIDEO',
      appointmentDate: json['appointmentDate'] as String? ?? '',
      startTime: json['startTime'] as String? ?? '',
      endTime: json['endTime'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING_PAYMENT',
      meetingLink: json['meetingLink'] as String?,
      dialInNumber: json['dialInNumber'] as String?,
      notes: json['notes'] as String?,
      query: json['query'] as String?,
      orderId: json['orderId'] as String?,
      orderNumber: json['orderNumber'] as String?,
      pricePaise: json['pricePaise'] as int?,
      birthProfileName: json['birthProfileName'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}
