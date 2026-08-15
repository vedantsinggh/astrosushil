import 'package:flutter/material.dart';
import '../shared/theme/app_theme.dart';
import 'router.dart';

/// Root Application Widget for Astro Platform Mobile Client
class AstroMobileApp extends StatelessWidget {
  const AstroMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Astro Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AppRouter(),
    );
  }
}
