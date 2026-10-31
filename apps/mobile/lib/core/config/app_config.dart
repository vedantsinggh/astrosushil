import 'dart:io';
import 'package:flutter/foundation.dart';

/// Central Configuration for the Astro Sushil Mobile Application.
///
/// Handles environment settings, API base URLs, timeouts, and network flags.
/// Supports both physical device Wi-Fi connectivity and ADB reverse port forwarding.
class AppConfig {
  AppConfig._();

  /// Default API port for local development backend
  static const int apiPort = 3000;

  /// Default API version path prefix
  static const String apiPrefix = '/api/v1';

  /// Default local development laptop Wi-Fi IP address (wlo1)
  static const String defaultDevHost = '192.168.1.10';

  /// Production API base URL
  static const String productionApiUrl = 'https://backend.astrosushil.com/api/v1';

  /// Custom base URL override (if provided at runtime e.g. in tests)
  static String? _baseUrlOverride;

  /// Override the API base URL programmatically
  static void setBaseUrl(String url) {
    _baseUrlOverride = url;
  }

  /// Reset any programmatic override
  static void resetBaseUrl() {
    _baseUrlOverride = null;
  }

  /// Normalizes any base URL string by trimming whitespace, stripping trailing slashes,
  /// and ensuring the `/api/v1` path prefix is attached without duplication.
  static String normalizeApiUrl(String rawUrl) {
    var clean = rawUrl.trim();
    while (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (clean.endsWith(apiPrefix)) {
      return clean;
    }
    return '$clean$apiPrefix';
  }

  /// Get the appropriate API base URL depending on platform, environment flags, and build mode:
  ///
  /// Resolution Precedence:
  /// 1. Programmatic override (`setBaseUrl`) - used primarily in test fixtures
  /// 2. Explicit `--dart-define=API_BASE_URL=...` (or `TEST_API_URL`)
  /// 3. ADB Reverse mode `--dart-define=USE_ADB_REVERSE=true` -> `http://127.0.0.1:3000/api/v1`
  /// 4. Android Emulator mode `--dart-define=USE_EMULATOR=true` -> `http://10.0.2.2:3000/api/v1`
  /// 5. Host override `--dart-define=API_HOST=...` -> `http://<API_HOST>:3000/api/v1`
  /// 6. Release mode (`kReleaseMode`) -> `https://backend.astrosushil.com/api/v1`
  /// 7. Development default on local Wi-Fi -> `http://192.168.1.10:3000/api/v1`
  static String get baseUrl {
    // 1. Programmatic runtime override
    if (_baseUrlOverride != null && _baseUrlOverride!.isNotEmpty) {
      return normalizeApiUrl(_baseUrlOverride!);
    }

    // 2. Explicit `--dart-define=API_BASE_URL=...`
    const String envApiUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: String.fromEnvironment('TEST_API_URL', defaultValue: ''),
    );
    if (envApiUrl.isNotEmpty) {
      return normalizeApiUrl(envApiUrl);
    }

    // 3. ADB Reverse mode for physical Android device via USB (`adb reverse tcp:3000 tcp:3000`)
    const bool useAdbReverse = bool.fromEnvironment('USE_ADB_REVERSE', defaultValue: false);
    if (useAdbReverse) {
      return 'http://127.0.0.1:$apiPort$apiPrefix';
    }

    // 4. Android Emulator compatibility flag
    const bool useEmulator = bool.fromEnvironment('USE_EMULATOR', defaultValue: false);
    if (useEmulator) {
      try {
        if (Platform.isAndroid) {
          return 'http://10.0.2.2:$apiPort$apiPrefix';
        }
      } catch (_) {}
    }

    // 5. Hostname/IP override (`--dart-define=API_HOST=192.168.1.10`)
    const String envHost = String.fromEnvironment('API_HOST', defaultValue: '');
    if (envHost.isNotEmpty) {
      return 'http://$envHost:$apiPort$apiPrefix';
    }

    // 6. Production release build
    if (kReleaseMode) {
      return productionApiUrl;
    }

    // 7. Default development configuration for physical Android phone over local Wi-Fi
    return 'http://$defaultDevHost:$apiPort$apiPrefix';
  }

  /// Network request timeout (JSON)
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);

  /// Extended timeout for large binary downloads (PDF reports ~350KB)
  static const Duration binaryReceiveTimeout = Duration(seconds: 90);
}
