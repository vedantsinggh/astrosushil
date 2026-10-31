import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/consultations/models/consultation_models.dart';

void main() {
  group('Phase 5 Consultation Models Unit Tests', () {
    test('ConsultationOfferingModel parses JSON with verified price and notice days', () {
      final json = {
        'sku': 'consult-general-video',
        'title': 'General Video Consultation',
        'description': '30-minute 1-on-1 video reading analyzing your birth chart',
        'mode': 'ONLINE_VIDEO',
        'durationMinutes': 30,
        'pricePaise': 1500000,
        'responseDaysNotice': 15,
        'category': 'Video Consultation',
        'isAvailable': true,
        'practitioners': [
          {
            'id': 'practitioner-sushil-1',
            'name': 'Astro Sushil Kumar Singh',
            'title': 'Principal Astrologer & Nadi Expert',
            'bio': 'Over 25 years of experience in Vedic astrology and Gupta Nadi system',
          }
        ],
      };

      final offering = ConsultationOfferingModel.fromJson(json);

      expect(offering.sku, 'consult-general-video');
      expect(offering.title, 'General Video Consultation');
      expect(offering.mode, 'ONLINE_VIDEO');
      expect(offering.durationMinutes, 30);
      expect(offering.pricePaise, 1500000);
      expect(offering.priceRupees, 15000);
      expect(offering.responseDaysNotice, 15);
      expect(offering.practitioners.length, 1);
      expect(offering.practitioners.first.name, 'Astro Sushil Kumar Singh');
    });

    test('AppointmentSlotModel parses slot timing and booking availability correctly', () {
      final json = {
        'id': 'slot-test-123',
        'practitionerId': 'practitioner-sushil-1',
        'practitionerName': 'Astro Sushil Kumar Singh',
        'date': '2026-10-26',
        'startTime': '11:00',
        'endTime': '11:30',
        'mode': 'ONLINE_VIDEO',
        'status': 'AVAILABLE',
        'isBookable': true,
      };

      final slot = AppointmentSlotModel.fromJson(json);

      expect(slot.id, 'slot-test-123');
      expect(slot.date, '2026-10-26');
      expect(slot.startTime, '11:00');
      expect(slot.endTime, '11:30');
      expect(slot.status, 'AVAILABLE');
      expect(slot.isBookable, true);
    });

    test('ConsultationBookingModel parses status transitions and helper getters', () {
      final json = {
        'id': 'booking-abc-456',
        'bookingReference': 'BK-789012',
        'serviceTitle': 'General Audio Consultation',
        'consultationMode': 'ONLINE_VOICE',
        'appointmentDate': '2026-10-27',
        'startTime': '15:00',
        'endTime': '15:30',
        'status': 'CONFIRMED',
        'meetingLink': 'https://meet.jit.si/astrosushil-BK-789012-secret',
        'pricePaise': 1000000,
        'orderId': 'order-123',
        'orderNumber': 'ORD-2026-0001',
      };

      final booking = ConsultationBookingModel.fromJson(json);

      expect(booking.id, 'booking-abc-456');
      expect(booking.bookingReference, 'BK-789012');
      expect(booking.isConfirmed, true);
      expect(booking.isPendingPayment, false);
      expect(booking.isCancelled, false);
      expect(booking.meetingLink, 'https://meet.jit.si/astrosushil-BK-789012-secret');
      expect(booking.priceRupees, 10000);
    });
  });
}
