import 'dart:async';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

/// Supported allowlisted route actions for push notification tap handling
enum NotificationRouteAction {
  openReport,
  openPayments,
  openBirthProfile,
  openSettings,
  openHome,
  unknown,
}

class PushNotificationService {
  final ApiClient _apiClient;
  String? _currentFcmToken;

  PushNotificationService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Map string route payload to allowlisted action enum
  static NotificationRouteAction parseRoute(String? routeStr) {
    if (routeStr == null) return NotificationRouteAction.openHome;

    switch (routeStr.toUpperCase()) {
      case 'OPEN_REPORT':
      case 'REPORT_READY':
        return NotificationRouteAction.openReport;
      case 'OPEN_PAYMENTS':
      case 'PAYMENT_SUCCESS':
        return NotificationRouteAction.openPayments;
      case 'OPEN_BIRTH_PROFILE':
      case 'BIRTH_PROFILE_REMINDER':
        return NotificationRouteAction.openBirthProfile;
      case 'OPEN_SETTINGS':
      case 'SECURITY_ALERT':
        return NotificationRouteAction.openSettings;
      case 'OPEN_HOME':
        return NotificationRouteAction.openHome;
      default:
        return NotificationRouteAction.unknown;
    }
  }

  /// Register device token with backend API upon user authentication
  Future<void> registerToken(String fcmToken, {String deviceType = 'ANDROID'}) async {
    _currentFcmToken = fcmToken;
    try {
      await _apiClient.post(
        '/api/v1/notifications/device-token',
        data: {
          'fcmToken': fcmToken,
          'deviceType': deviceType,
        },
      );
      if (kDebugMode) {
        print('[PushNotificationService] FCM device token registered cleanly with backend');
      }
    } catch (e) {
      if (kDebugMode) {
        print('[PushNotificationService] Failed to register device token: $e');
      }
    }
  }

  /// Unregister device token with backend API upon user logout to prevent cross-user leakage
  Future<void> unregisterToken() async {
    try {
      await _apiClient.delete(
        '/api/v1/notifications/device-token',
        data: _currentFcmToken != null ? {'fcmToken': _currentFcmToken} : null,
      );
      _currentFcmToken = null;
      if (kDebugMode) {
        print('[PushNotificationService] FCM device token unregistered cleanly on logout');
      }
    } catch (e) {
      if (kDebugMode) {
        print('[PushNotificationService] Failed to unregister device token on logout: $e');
      }
    }
  }

  /// Safe route navigation handler adhering to allowlisted routes
  void handleNotificationTap(Map<String, dynamic> data, Function(NotificationRouteAction action, String? entityId) onNavigate) {
    final routeStr = data['route'] as String? ?? data['type'] as String?;
    final entityId = data['entityId'] as String?;
    final action = parseRoute(routeStr);

    if (action != NotificationRouteAction.unknown) {
      onNavigate(action, entityId);
    } else {
      if (kDebugMode) {
        print('[PushNotificationService] Ignored non-allowlisted notification route: $routeStr');
      }
      onNavigate(NotificationRouteAction.openHome, null);
    }
  }
}
