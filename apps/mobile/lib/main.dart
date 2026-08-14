import 'package:flutter/material.dart';

void main() {
  runApp(const AstroMobileApp());
}

class AstroMobileApp extends StatelessWidget {
  const AstroMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Astro Sushil',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.auto_awesome,
                size: 64,
                color: Color(0xFF818CF8),
              ),
              SizedBox(height: 16),
              Text(
                'Astro Sushil',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Vedic Astrology & Gupta Nadi Platform',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
              SizedBox(height: 24),
              Chip(
                label: Text('Phase: Initial Scaffolding'),
                backgroundColor: Color(0xFF1E1B4B),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
