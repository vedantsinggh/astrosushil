import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/config/app_config.dart';

/// Raised when Google sign-in cannot produce an ID token. [message] is safe to
/// show to the user; it never contains token material.
class GoogleSignInFailure implements Exception {
  final String message;
  final bool isConfigurationProblem;

  const GoogleSignInFailure(this.message, {this.isConfigurationProblem = false});

  @override
  String toString() => message;
}

/// Obtains a Google **ID token** (not an access token) for the backend's
/// `POST /auth/google`, which verifies it server-side.
abstract class GoogleIdTokenSource {
  /// Returns the ID token, or `null` when the user closed the Google picker.
  /// Throws [GoogleSignInFailure] for any other problem.
  Future<String?> getIdToken();
}

/// Production implementation backed by the `google_sign_in` plugin.
class PlatformGoogleIdTokenSource implements GoogleIdTokenSource {
  final String serverClientId;
  final String iosClientId;

  Future<void>? _initialization;

  PlatformGoogleIdTokenSource({
    this.serverClientId = AppConfig.googleServerClientId,
    this.iosClientId = AppConfig.googleIosClientId,
  });

  static const String _notSetUpMessage =
      'Google sign-in is not set up in this version of the app yet. Please sign in with your phone number.';

  Future<void> _ensureInitialized() {
    return _initialization ??= GoogleSignIn.instance
        .initialize(
          clientId: _isIos && iosClientId.isNotEmpty ? iosClientId : null,
          serverClientId: serverClientId,
        )
        .catchError((Object error) {
      // Allow a later retry instead of caching the failure forever.
      _initialization = null;
      throw error;
    });
  }

  bool get _isIos {
    if (kIsWeb) return false;
    try {
      return Platform.isIOS;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<String?> getIdToken() async {
    if (serverClientId.isEmpty) {
      throw const GoogleSignInFailure(_notSetUpMessage, isConfigurationProblem: true);
    }

    try {
      await _ensureInitialized();
      if (!GoogleSignIn.instance.supportsAuthenticate()) {
        throw const GoogleSignInFailure(_notSetUpMessage, isConfigurationProblem: true);
      }

      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const GoogleSignInFailure(
          'Google did not confirm your account. Please try again.',
        );
      }
      return idToken;
    } on GoogleSignInException catch (e) {
      switch (e.code) {
        case GoogleSignInExceptionCode.canceled:
          return null;
        case GoogleSignInExceptionCode.clientConfigurationError:
        case GoogleSignInExceptionCode.providerConfigurationError:
          debugPrint('[GoogleSignIn] configuration error: ${e.code.name}');
          throw const GoogleSignInFailure(_notSetUpMessage, isConfigurationProblem: true);
        default:
          debugPrint('[GoogleSignIn] sign-in failed: ${e.code.name}');
          throw const GoogleSignInFailure(
            'Google sign-in did not finish. Please try again.',
          );
      }
    }
  }
}

/// Provider so widget tests can replace the native SDK with a fake.
final googleIdTokenSourceProvider = Provider<GoogleIdTokenSource>((ref) {
  return PlatformGoogleIdTokenSource();
});
