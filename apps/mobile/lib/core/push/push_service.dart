import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/notifications/providers/notifications_provider.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../network/api_client.dart';

/// Navigator of the whole app, so a tapped notification can open a screen.
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

/// Phone push (Firebase Cloud Messaging).
///
/// After sign-in the phone's FCM token is registered with the server
/// (`POST /notifications/device-token`); on sign-out it is removed. A message
/// that arrives while the app is open refreshes the inbox; tapping one opens
/// its link or the notification list.
///
/// Without the Firebase config files (google-services.json /
/// GoogleService-Info.plist) Firebase cannot start: push is then simply off and
/// the in-app inbox keeps working.
class PushService {
  PushService(this._ref);

  final Ref _ref;
  bool _started = false;
  bool _available = false;
  String? _registeredToken;
  StreamSubscription<String>? _refreshSub;

  bool get isAvailable => _available;

  Future<void> _ensureFirebase() async {
    if (_started) return;
    _started = true;
    if (kIsWeb || !(Platform.isAndroid || Platform.isIOS)) return;
    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      _available = true;
    } catch (e) {
      debugPrint('[Push] Firebase is not configured; push is off ($e)');
      return;
    }

    FirebaseMessaging.onMessage.listen((message) {
      // In the foreground the OS shows no banner: refresh the inbox instead.
      _ref.read(notificationsNotifierProvider.notifier).load();
    });
    FirebaseMessaging.onMessageOpenedApp.listen(_open);
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _open(initial);
  }

  Future<void> _open(RemoteMessage message) async {
    final link = message.data['link'];
    if (link is String && link.startsWith('https://')) {
      await launchUrl(Uri.parse(link), mode: LaunchMode.externalApplication);
      return;
    }
    appNavigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
  }

  /// Called when the user is signed in.
  Future<void> register(ApiClient api) async {
    await _ensureFirebase();
    if (!_available) return;
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await _send(api, token);
      await _refreshSub?.cancel();
      _refreshSub = FirebaseMessaging.instance.onTokenRefresh.listen((t) => _send(api, t));
    } catch (e) {
      debugPrint('[Push] Could not register this phone for push: $e');
    }
  }

  Future<void> _send(ApiClient api, String token) async {
    await api.post('/notifications/device-token', data: {
      'fcmToken': token,
      'deviceType': Platform.isIOS ? 'IOS' : 'ANDROID',
    });
    _registeredToken = token;
  }

  /// Called on sign-out, while the session is still valid.
  Future<void> unregister(ApiClient api) async {
    final token = _registeredToken;
    await _refreshSub?.cancel();
    _refreshSub = null;
    _registeredToken = null;
    if (token == null) return;
    try {
      await api.delete('/notifications/device-token', data: {'fcmToken': token});
    } catch (_) {
      // The server also drops tokens that Firebase reports as no longer registered.
    }
  }
}

final pushServiceProvider = Provider<PushService>((ref) => PushService(ref));
