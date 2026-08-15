import 'dart:io';

/// Central Configuration for the Astro Sushil Mobile Application.
///
/// Handles environment settings, API base URLs, and environment specific flags.
class AppConfig {
  AppConfig._();

  /// Default API port
  static const int apiPort = 3000;

  /// Default API version path prefix
  static const String apiPrefix = '/api/v1';

  /// Custom base URL override (if provided at runtime or via environment)
  static String? _baseUrlOverride;

  /// Override the API base URL programmatically
  static void setBaseUrl(String url) {
    _baseUrlOverride = url;
  }

  /// Get the appropriate base URL depending on platform / environment:
  /// - Android Emulator: http://10.0.2.2:3000/api/v1
  /// - iOS Simulator: http://127.0.0.1:3000/api/v1
  /// - Default / Physical Device / Other: http://localhost:3000/api/v1
  static String get baseUrl {
    if (_baseUrlOverride != null && _baseUrlOverride!.isNotEmpty) {
      return _baseUrlOverride!;
    }

    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:$apiPort$apiPrefix';
      } else if (Platform.isIOS) {
        return 'http://127.0.0.1:$apiPort$apiPrefix';
      }
    } catch (_) {
      // Fallback for non-io environments (e.g. tests / web)
    }

    return 'http://127.0.0.1:$apiPort$apiPrefix';
  }

  /// Network request timeout
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
