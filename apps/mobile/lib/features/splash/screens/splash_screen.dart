import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../auth/providers/auth_provider.dart';
import '../../onboarding/screens/onboarding_screen.dart';
import '../../../home/screens/home_screen.dart';

/// Official Animated Splash Screen for Astro Platform
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _setupAnimation();
    _startNavigationTimer();
  }

  void _setupAnimation() {
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    );

    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeOutCubic,
      ),
    );

    _animationController.forward();
  }

  void _startNavigationTimer() {
    _timer = Timer(const Duration(milliseconds: 2500), _checkAuthAndNavigate);
  }

  void _checkAuthAndNavigate() async {
    if (!mounted) return;

    var authState = ref.read(authStateProvider);

    // Wait until session validation finishes loading
    while (authState.isLoading && mounted) {
      await Future.delayed(const Duration(milliseconds: 100));
      authState = ref.read(authStateProvider);
    }

    if (!mounted) return;

    if (authState.isGuestOrAuthenticated) {
      // Authenticated or guest user goes directly to Home Screen
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const HomeScreen(),
          transitionsBuilder: (_, animation, __, child) => FadeTransition(
            opacity: animation,
            child: child,
          ),
          transitionDuration: const Duration(milliseconds: 500),
        ),
      );
    } else {
      // Unauthenticated user starts at Onboarding Screen
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const OnboardingScreen(),
          transitionsBuilder: (_, animation, __, child) => FadeTransition(
            opacity: animation,
            child: child,
          ),
          transitionDuration: const Duration(milliseconds: 500),
        ),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goldColor = theme.colorScheme.premiumAccent;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background 1: Image Asset or Custom Painted Celestial Night Sky Fallback
          const Positioned.fill(
            child: AstroImage(
              assetPath: AppAssets.splashBackground,
              fit: BoxFit.cover,
              fallback: AstroImageFallback.celestial,
              semanticLabel: 'Celestial night sky background',
            ),
          ),

          // Background 2: Subtle Zodiac Wheel Overlay
          const Positioned.fill(
            child: Opacity(
              opacity: 0.35,
              child: AstroImage(
                assetPath: AppAssets.zodiacWheelOverlay,
                fit: BoxFit.contain,
                fallback: AstroImageFallback.minimal,
                semanticLabel: 'Zodiac wheel overlay',
              ),
            ),
          ),

          // Background 3: Constellations Overlay
          const Positioned.fill(
            child: Opacity(
              opacity: 0.25,
              child: AstroImage(
                assetPath: AppAssets.constellationsOverlay,
                fit: BoxFit.cover,
                fallback: AstroImageFallback.minimal,
                semanticLabel: 'Constellation star map overlay',
              ),
            ),
          ),

          // Center Animated Content (Logo + App Title + Decorative Divider)
          Center(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App Logo with soft celestial glow
                    Container(
                      width: 130,
                      height: 130,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.secondary.withValues(alpha: 0.4),
                            blurRadius: 40,
                            spreadRadius: 10,
                          ),
                          BoxShadow(
                            color: goldColor.withValues(alpha: 0.2),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Center(
                        child: AstroImage(
                          assetPath: AppAssets.logoAs,
                          width: 85,
                          height: 85,
                          fit: BoxFit.contain,
                          fallback: AstroImageFallback.icon,
                          semanticLabel: 'Astro Sushil logo',
                        ),
                      ),
                    ),

                    const SizedBox(height: 36),

                    // App Name in Celestial Gold (#D9B13B)
                    Text(
                      'ASTRO SUSHIL',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 4.5,
                        color: goldColor,
                        shadows: [
                          Shadow(
                            color: Colors.black.withValues(alpha: 0.6),
                            offset: const Offset(0, 2),
                            blurRadius: 8,
                          ),
                          Shadow(
                            color: goldColor.withValues(alpha: 0.4),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Decorative Divider with central diamond star
                    SizedBox(
                      width: 180,
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 1,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.transparent,
                                    goldColor.withValues(alpha: 0.7),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8.0),
                            child: Icon(
                              Icons.auto_awesome,
                              size: 14,
                              color: goldColor,
                            ),
                          ),
                          Expanded(
                            child: Container(
                              height: 1,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    goldColor.withValues(alpha: 0.7),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
