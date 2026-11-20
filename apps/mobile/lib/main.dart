import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge with transparent system bars (Android); the shared nav bar
  // sets the status / navigation bar icon brightness per screen.
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarContrastEnforced: false,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));

  // Handle and suppress known Linux Desktop HardwareKeyboard assertion glitches
  final originalOnError = FlutterError.onError;
  FlutterError.onError = (FlutterErrorDetails details) {
    if (details.exceptionAsString().contains('hardware_keyboard.dart') ||
        details.exceptionAsString().contains('!_pressedKeys.containsKey')) {
      // Ignore spurious Linux desktop physical keyboard toggle events (e.g. Num Lock)
      return;
    }
    originalOnError?.call(details);
  };

  runApp(
    const ProviderScope(
      child: AstroMobileApp(),
    ),
  );
}
