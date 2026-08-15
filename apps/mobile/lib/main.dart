import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

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
