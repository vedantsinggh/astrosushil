import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/screens/login_screen.dart';
import '../home/screens/home_screen.dart';
import '../shared/widgets/loading_indicator.dart';

/// Router widget that controls root view based on AuthState
class AppRouter extends ConsumerWidget {
  const AppRouter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    if (authState.isLoading) {
      return const Scaffold(
        body: LoadingIndicator(message: 'Checking session authentication...'),
      );
    }

    if (authState.isAuthenticated) {
      return const HomeScreen();
    }

    return const LoginScreen();
  }
}
