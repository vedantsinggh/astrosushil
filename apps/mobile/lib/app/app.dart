import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/localization/locale_provider.dart';
import '../core/push/push_service.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/splash/screens/splash_screen.dart';
import '../shared/screens/not_found_screen.dart';
import '../shared/theme/app_theme.dart';

/// Root Application Widget for Astro Platform Mobile Client
class AstroMobileApp extends ConsumerWidget {
  const AstroMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeLocale = ref.watch(localeProvider);

    // Register this phone for push once the user is signed in (also after a restored session).
    ref.listen<AuthState>(authStateProvider, (previous, next) {
      if (next.isAuthenticated && !(previous?.isAuthenticated ?? false)) {
        ref.read(pushServiceProvider).register(ref.read(apiClientProvider));
      }
    });

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
      home: const SplashScreen(),
      onUnknownRoute: (settings) => MaterialPageRoute(
        builder: (_) => NotFoundScreen(routePath: settings.name),
      ),
    );
  }
}
