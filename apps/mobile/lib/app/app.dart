import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/localization/locale_provider.dart';
import '../core/network/network_state_manager.dart';
import '../core/push/push_service.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/splash/screens/splash_screen.dart';
import '../shared/screens/network_error_screen.dart';
import '../shared/screens/not_found_screen.dart';
import '../shared/theme/app_theme.dart';

/// Root Application Widget for Astro Platform Mobile Client
class AstroMobileApp extends ConsumerStatefulWidget {
  const AstroMobileApp({super.key});

  @override
  ConsumerState<AstroMobileApp> createState() => _AstroMobileAppState();
}

class _AstroMobileAppState extends ConsumerState<AstroMobileApp> {
  bool _offlineDismissed = false;

  @override
  Widget build(BuildContext context) {
    final activeLocale = ref.watch(localeProvider);
    final networkStatus = ref.watch(networkStateProvider);

    // Register this phone for push once the user is signed in (also after a restored session).
    ref.listen<AuthState>(authStateProvider, (previous, next) {
      if (next.isAuthenticated && !(previous?.isAuthenticated ?? false)) {
        ref.read(pushServiceProvider).register(ref.read(apiClientProvider));
      }
    });

    // Clear any manual "Continue offline" bypass once connectivity recovers,
    // on a fresh online->offline drop, or when transitioning into serverError.
    ref.listen<NetworkConnectivityStatus>(networkStateProvider, (previous, next) {
      final shouldClearBypass = next == NetworkConnectivityStatus.online ||
          (next == NetworkConnectivityStatus.offline &&
              previous != NetworkConnectivityStatus.offline) ||
          (next == NetworkConnectivityStatus.serverError &&
              previous != NetworkConnectivityStatus.serverError);
      if (shouldClearBypass && _offlineDismissed && mounted) {
        setState(() => _offlineDismissed = false);
      }
    });

    final showNetworkError = !_offlineDismissed &&
        (networkStatus == NetworkConnectivityStatus.offline ||
            networkStatus == NetworkConnectivityStatus.serverError);

    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'Astro Sushil',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      scrollBehavior: const AstroScrollBehavior(),
      locale: activeLocale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: SupportedLocales.all,
      builder: (context, child) {
        final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
        return Stack(
          children: [
            child ?? const SizedBox.shrink(),
            if (showNetworkError)
              Positioned.fill(
                child: NetworkErrorScreen(
                  type: networkStatus == NetworkConnectivityStatus.serverError
                      ? NetworkErrorType.serverError
                      : NetworkErrorType.offline,
                  showBackButton: false,
                  secondaryActionLabel:
                      networkStatus == NetworkConnectivityStatus.offline
                          ? (isHindi ? 'ऑफ़लाइन जारी रखें' : 'Continue offline')
                          : null,
                  onSecondaryAction: () {
                    setState(() => _offlineDismissed = true);
                  },
                  onRetry: () async {
                    final ok = await ref
                        .read(networkStateProvider.notifier)
                        .checkServerReachability();
                    if (ok && mounted) {
                      setState(() => _offlineDismissed = false);
                    }
                  },
                ),
              ),
          ],
        );
      },
      home: const SplashScreen(),
      onUnknownRoute: (settings) => MaterialPageRoute(
        builder: (_) => NotFoundScreen(routePath: settings.name),
      ),
    );
  }
}
