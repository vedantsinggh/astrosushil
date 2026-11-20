import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/complete_profile_screen.dart';
import '../../onboarding/screens/onboarding_screen.dart';
import '../../../home/screens/home_screen.dart';

/// Native launch background colour (#0D0E2B, [AppColors.midnight]).
///
/// Must stay in sync with `android/app/src/main/res/values/colors.xml`
/// (`splash_background`) and `ios/Runner/Base.lproj/LaunchScreen.storyboard`
/// so there is no colour flash between the native launch screen and this one.
const Color kSplashBaseColor = AppColors.midnight;

/// Diameter (logical px) of the logo medallion on phones. The native iOS
/// launch image (`LaunchImage.imageset`) is rendered at exactly this size and
/// centred, so the hand-off from the native launch screen is seamless.
const double kSplashMedallionSize = 128;

/// Official Animated Splash Screen for Astro Platform
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  late Animation<double> _textAnimation;
  late Animation<double> _shimmerAnimation;
  late AnimationController _glowController;
  Timer? _timer;

  /// Presentation only: true while the splash is waiting on session
  /// validation after the minimum display time, to reveal a progress hint.
  bool _awaitingInit = false;
  bool _reducedMotion = false;

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

    // Backdrop glow + halo fade in (the logo itself is visible from the first
    // frame so it continues seamlessly from the native launch screen).
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
    );

    _scaleAnimation = Tween<double>(begin: 0.94, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOutCubic),
      ),
    );

    _textAnimation = CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.3, 0.8, curve: Curves.easeOutCubic),
    );

    _shimmerAnimation = CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.55, 1.0, curve: Curves.easeInOut),
    );

    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    _animationController.forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reducedMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (_reducedMotion) {
      _animationController.value = 1.0;
      _glowController.value = 0.5;
      _glowController.stop();
    } else if (!_glowController.isAnimating) {
      _glowController.repeat(reverse: true);
    }
  }

  void _startNavigationTimer() {
    _timer = Timer(const Duration(milliseconds: 2500), _checkAuthAndNavigate);
  }

  void _checkAuthAndNavigate() async {
    if (!mounted) return;

    var authState = ref.read(authStateProvider);

    // Wait until session validation finishes loading
    while (authState.isLoading && mounted) {
      if (!_awaitingInit) setState(() => _awaitingInit = true);
      await Future.delayed(const Duration(milliseconds: 100));
      authState = ref.read(authStateProvider);
    }

    if (!mounted) return;

    final user = authState.user;
    if (authState.isAuthenticated && user != null && user.requiresGoogleProfileCompletion) {
      // Google account still missing required details (backend flag): finish
      // them before Home, even if the app was closed mid-way last time.
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => CompleteProfileScreen(
            onCompleted: (ctx) => Navigator.of(ctx).pushReplacement(
              MaterialPageRoute(builder: (_) => const HomeScreen()),
            ),
          ),
        ),
      );
    } else if (authState.isGuestOrAuthenticated) {
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
    _glowController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  double _medallionSize(BoxConstraints c, Size screen) {
    final shortest = screen.shortestSide;
    final double base;
    if (shortest >= 600) {
      base = 168;
    } else if (shortest >= 360) {
      base = kSplashMedallionSize;
    } else {
      base = math.max(96, shortest * 0.34);
    }
    // In short landscape viewports keep room for the wordmark beneath.
    return math.min(base, c.maxHeight * 0.36);
  }

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.premiumAccent;
    final screen = MediaQuery.sizeOf(context);
    final insets = MediaQuery.paddingOf(context);
    // Symmetric vertical insets keep the logo at the exact screen centre (as
    // on the native launch screen) while still clearing notches/home bars.
    final vInset = math.max(insets.top, insets.bottom);

    return Scaffold(
      backgroundColor: kSplashBaseColor,
      body: Stack(
        children: [
          // Soft indigo bloom behind the logo, fading in over the native colour.
          Positioned.fill(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment(0, -0.08),
                    radius: 0.95,
                    colors: [
                      Color(0xFF2B2F6B),
                      AppColors.tertiary,
                      AppColors.primary,
                      kSplashBaseColor,
                    ],
                    stops: [0.0, 0.3, 0.62, 1.0],
                  ),
                ),
              ),
            ),
          ),

          // Sparse, static star field.
          Positioned.fill(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: const ExcludeSemantics(
                child: CustomPaint(painter: _SplashStarsPainter()),
              ),
            ),
          ),

          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.fromLTRB(insets.left, vInset, insets.right, vInset),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final size = _medallionSize(constraints, screen);
                  final gap = (size * 0.22).clamp(14.0, 32.0);

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      children: [
                        const Expanded(child: SizedBox.shrink()),
                        // Logo sits exactly at the vertical centre, matching the
                        // native launch screen.
                        ScaleTransition(
                          scale: _scaleAnimation,
                          child: _LogoMedallion(
                            size: size,
                            gold: gold,
                            glow: _glowController,
                            haloOpacity: _fadeAnimation,
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(top: gap),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.topCenter,
                              child: SizedBox(
                                width: math.min(constraints.maxWidth - 48, 420),
                                child: _buildBrandText(gold, size),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrandText(Color gold, double medallionSize) {
    final wordmarkSize = (medallionSize * 0.21).clamp(22.0, 32.0);

    return AnimatedBuilder(
      animation: _textAnimation,
      builder: (context, child) => Opacity(
        opacity: _textAnimation.value,
        child: Transform.translate(
          offset: Offset(0, 10 * (1 - _textAnimation.value)),
          child: child,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Wordmark with a single slow gold shimmer pass.
          AnimatedBuilder(
            animation: _shimmerAnimation,
            builder: (context, child) {
              final t = _shimmerAnimation.value;
              if (_reducedMotion || t <= 0 || t >= 1) return child!;
              return ShaderMask(
                blendMode: BlendMode.srcIn,
                shaderCallback: (bounds) => LinearGradient(
                  begin: Alignment(-1.0 + 3.0 * t - 0.6, -0.3),
                  end: Alignment(-1.0 + 3.0 * t + 0.6, 0.3),
                  colors: [gold, AppColors.goldLight, gold],
                  stops: const [0.0, 0.5, 1.0],
                ).createShader(bounds),
                child: child,
              );
            },
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'ASTRO SUSHIL',
                textAlign: TextAlign.center,
                maxLines: 1,
                softWrap: false,
                style: AppTypography.displayLarge.copyWith(
                  fontSize: wordmarkSize,
                  letterSpacing: wordmarkSize * 0.2,
                  height: 1.2,
                  color: gold,
                ),
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Decorative divider with central sparkle
          SizedBox(
            width: 168,
            child: Row(
              children: [
                Expanded(child: _goldRule(gold, reversed: false)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: Icon(Icons.auto_awesome, size: 12, color: gold),
                ),
                Expanded(child: _goldRule(gold, reversed: true)),
              ],
            ),
          ),

          const SizedBox(height: 12),

          Text(
            'Your Journey. Written in the Stars.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium.copyWith(
              fontSize: 13,
              letterSpacing: 0.6,
              height: 1.4,
              color: Colors.white.withValues(alpha: 0.72),
            ),
          ),

          const SizedBox(height: 28),

          // Minimal progress hint, only shown if initialisation outlasts the
          // minimum splash time. Space is reserved so nothing shifts.
          SizedBox(
            height: 2,
            width: 56,
            child: AnimatedOpacity(
              opacity: _awaitingInit ? 1 : 0,
              duration: const Duration(milliseconds: 300),
              child: _awaitingInit
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(1),
                      child: LinearProgressIndicator(
                        minHeight: 2,
                        backgroundColor: gold.withValues(alpha: 0.15),
                        valueColor: AlwaysStoppedAnimation<Color>(gold.withValues(alpha: 0.8)),
                        semanticsLabel: 'Loading',
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _goldRule(Color gold, {required bool reversed}) {
    final colors = [Colors.transparent, gold.withValues(alpha: 0.7)];
    return Container(
      height: 1,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: reversed ? colors.reversed.toList() : colors),
      ),
    );
  }
}

/// Ivory medallion carrying the brand logo, ringed in gold with a slow,
/// breathing glow. The disc keeps the logo's dark-navy strokes legible on the
/// midnight background.
class _LogoMedallion extends StatelessWidget {
  final double size;
  final Color gold;
  final Animation<double> glow;
  final Animation<double> haloOpacity;

  const _LogoMedallion({
    required this.size,
    required this.gold,
    required this.glow,
    required this.haloOpacity,
  });

  @override
  Widget build(BuildContext context) {
    final orbit = size * 1.32;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          // Breathing gold glow + thin orbit ring (decorative, fades in).
          Positioned(
            left: (size - orbit) / 2,
            top: (size - orbit) / 2,
            width: orbit,
            height: orbit,
            child: FadeTransition(
              opacity: haloOpacity,
              child: AnimatedBuilder(
                animation: glow,
                builder: (context, _) {
                  final g = Curves.easeInOut.transform(glow.value);
                  return DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: gold.withValues(alpha: 0.12 + 0.1 * g), width: 1),
                    ),
                    child: Center(
                      child: Container(
                        width: size,
                        height: size,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: gold.withValues(alpha: 0.16 + 0.14 * g),
                              blurRadius: size * (0.22 + 0.1 * g),
                              spreadRadius: size * 0.02,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Medallion (matches native launch image).
          Container(
            width: size,
            height: size,
            padding: EdgeInsets.all(size * 0.09),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const RadialGradient(
                center: Alignment(-0.25, -0.3),
                radius: 0.9,
                colors: [Color(0xFFFFFDF8), AppColors.canvas, AppColors.canvasSecondary],
                stops: [0.0, 0.6, 1.0],
              ),
              border: Border.all(color: gold, width: math.max(1.5, size * 0.016)),
            ),
            child: const AstroImage(
              assetPath: AppAssets.logoAs,
              fit: BoxFit.contain,
              fallback: AstroImageFallback.icon,
              semanticLabel: 'Astro Sushil logo',
            ),
          ),
        ],
      ),
    );
  }
}

/// Deterministic, sparse star dots for a calm night-sky texture.
class _SplashStarsPainter extends CustomPainter {
  const _SplashStarsPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rnd = math.Random(108);
    final paint = Paint()..style = PaintingStyle.fill;
    final count = (size.width * size.height / 9000).clamp(24, 120).toInt();
    for (var i = 0; i < count; i++) {
      final dx = rnd.nextDouble() * size.width;
      final dy = rnd.nextDouble() * size.height;
      final r = 0.4 + rnd.nextDouble() * 0.9;
      final a = 0.15 + rnd.nextDouble() * 0.35;
      final isGold = rnd.nextDouble() < 0.18;
      paint.color = (isGold ? AppColors.goldLight : Colors.white).withValues(alpha: a);
      canvas.drawCircle(Offset(dx, dy), r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SplashStarsPainter oldDelegate) => false;
}
