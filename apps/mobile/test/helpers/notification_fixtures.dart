import 'package:astro_mobile/features/notifications/models/notification_item_model.dart';
import 'package:astro_mobile/features/notifications/providers/notifications_provider.dart';

/// TEST-ONLY notification fixtures (formerly hard-coded in the app as demo
/// inbox content). The app now loads genuine notifications from the API.
List<NotificationItemModel> testNotificationFixtures() {
  final now = DateTime.now();
  return [
    NotificationItemModel(
      id: 'notif-1',
      title: 'Today\'s Panchang & Rahu Kaal Active',
      titleHi: 'आज का पंचांग एवं राहु काल सक्रिय',
      body: 'Auspicious Abhijit Muhurta begins at 11:45 AM. Rahu Kaal window is active between 01:30 PM - 03:00 PM IST.',
      bodyHi: 'शुभ अभिजित मुहूर्त पूर्वाह्न 11:45 से प्रारंभ होगा। राहु काल दोपहर 01:30 से 03:00 बजे तक रहेगा।',
      category: NotificationCategory.panchang,
      timestamp: now.subtract(const Duration(minutes: 45)),
      isRead: false,
      routeAction: 'OPEN_PANCHANG',
    ),
    NotificationItemModel(
      id: 'notif-2',
      title: 'Planetary Transit (Gochara) Update',
      titleHi: 'ग्रह गोचर (Gochara) अपडेट',
      body: 'Jupiter transit brings positive expansion to 9th and 5th house aspects for your Moon sign.',
      bodyHi: 'बृहस्पति का गोचर आपकी चंद्र राशि के 9वें एवं 5वें भाव पर सकारात्मक प्रभाव डाल रहा है।',
      category: NotificationCategory.transit,
      timestamp: now.subtract(const Duration(hours: 3)),
      isRead: false,
      routeAction: 'OPEN_GOCHARA',
    ),
    NotificationItemModel(
      id: 'notif-3',
      title: 'Sacred Herb Order Dispatched',
      titleHi: 'पवित्र जड़ी-बूटी ऑर्डर प्रेषित',
      body: 'Your Ayodhya Ravi Pushya consecrated herb has been dispatched via Blue Dart (AWB: BLUEDART-482910482).',
      bodyHi: 'आपकी अयोध्या रवि पुष्य अभिमंत्रित जड़ी-बूटी ब्लू डार्ट द्वारा भेज दी गई है (AWB: BLUEDART-482910482)।',
      category: NotificationCategory.order,
      timestamp: now.subtract(const Duration(hours: 18)),
      isRead: true,
      routeAction: 'OPEN_ORDERS',
      entityId: 'BLUEDART-482910482',
    ),
    NotificationItemModel(
      id: 'notif-4',
      title: 'Consultation Appointment Confirmed',
      titleHi: 'परामर्श सत्र सफलतापूर्वक पुष्ट',
      body: 'Your 1-on-1 audio consultation with Astro Sushil is confirmed. Join link will activate 15m prior in My Appointments.',
      bodyHi: 'एस्ट्रो सुशील के साथ आपका परामर्श सत्र पुष्ट हो चुका है। लिंक सत्र से 15 मिनट पूर्व सक्रिय होगा।',
      category: NotificationCategory.consultation,
      timestamp: now.subtract(const Duration(days: 1, hours: 2)),
      isRead: true,
      routeAction: 'OPEN_APPOINTMENTS',
    ),
    NotificationItemModel(
      id: 'notif-5',
      title: 'Welcome to Astro Sushil',
      titleHi: 'एस्ट्रो सुशील में आपका स्वागत है',
      body: 'Experience 100% deterministic Vedic calculations, Gupta Nadi interpretations, and personalized guidance.',
      bodyHi: '100% प्रामाणिक वैदिक गणनाओं, गुप्त नाड़ी व्याख्याओं एवं व्यक्तिगत मार्गदर्शन का अनुभव करें।',
      category: NotificationCategory.system,
      timestamp: now.subtract(const Duration(days: 3)),
      isRead: true,
      routeAction: 'OPEN_HOME',
    ),
  ];
}

class SeededNotificationsNotifier extends NotificationsNotifier {
  SeededNotificationsNotifier() : super() {
    state = NotificationsState(items: testNotificationFixtures());
  }
}
