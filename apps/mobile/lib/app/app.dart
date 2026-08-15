import 'package:flutter/material.dart';
import '../features/splash/screens/splash_screen.dart';
import '../shared/theme/app_theme.dart';

/// Root Application Widget for Astro Platform Mobile Client
class AstroMobileApp extends StatelessWidget {
  const AstroMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Astro Sushil',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      home: const SplashScreen(),
    );
  }
}

