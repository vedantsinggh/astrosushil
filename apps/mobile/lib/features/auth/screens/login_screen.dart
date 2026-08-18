import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/screens/home_screen.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_text_field.dart';
import 'register_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _checkAndPromptMigration() async {
    final repo = ref.read(birthProfileRepositoryProvider);
    final guestProfile = await repo.getGuestProfile();
    if (guestProfile != null && mounted) {
      final shouldMigrate = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Save Guest Birth Details?'),
          content: Text(
            'We found birth details for "${guestProfile.name}" created during your guest session. Would you like to save this birth profile to your new account?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Start Fresh'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
              ),
              child: const Text('Save to Account'),
            ),
          ],
        ),
      );

      if (shouldMigrate == true) {
        final dto = CreateBirthProfileDto(
          name: guestProfile.name,
          dateOfBirth: guestProfile.dateOfBirth,
          timeOfBirth: guestProfile.timeOfBirth,
          latitude: guestProfile.latitude,
          longitude: guestProfile.longitude,
          timezone: guestProfile.timezone,
          placeName: guestProfile.placeName,
        );
        await ref.read(birthProfilesListNotifierProvider.notifier).migrateGuestProfile(dto);
      } else {
        await repo.clearGuestProfile();
      }
    }
  }

  void _submit() async {
    if (_formKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final success = await ref.read(authStateProvider.notifier).login(email, password);
      if (success && mounted) {
        await _checkAndPromptMigration();
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => const HomeScreen(),
          ),
        );
      }
    }
  }

  void _continueAsGuest() async {
    await ref.read(authStateProvider.notifier).continueAsGuest();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => const HomeScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                const Text(
                  'Welcome to Astro Sushil',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in to access birth profiles and astrology charts',
                  style: TextStyle(
                    fontSize: 14,
                    color: theme.colorScheme.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                if (authState.errorMessage != null) ...[
                  ErrorBanner(
                    message: authState.errorMessage!,
                    onRetry: () => ref.read(authStateProvider.notifier).clearError(),
                  ),
                  const SizedBox(height: 20),
                ],
                AuthTextField(
                  controller: _emailController,
                  labelText: 'Email Address',
                  hintText: 'user@example.com',
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: const Icon(Icons.email_outlined),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Email is required';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val.trim())) {
                      return 'Enter a valid email address';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                AuthTextField(
                  controller: _passwordController,
                  labelText: 'Password',
                  isPassword: _obscurePassword,
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty) {
                      return 'Password is required';
                    }
                    if (val.length < 6) {
                      return 'Password must be at least 6 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                CustomButton(
                  text: 'Sign In',
                  isLoading: authState.isLoading,
                  onPressed: _submit,
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account?",
                      style: TextStyle(color: theme.colorScheme.textSecondary),
                    ),
                    TextButton(
                      onPressed: () {
                        ref.read(authStateProvider.notifier).clearError();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const RegisterScreen(),
                          ),
                        );
                      },
                      child: const Text('Register'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: Divider(color: theme.colorScheme.outline.withOpacity(0.3))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'OR',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(child: Divider(color: theme.colorScheme.outline.withOpacity(0.3))),
                  ],
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: _continueAsGuest,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: BorderSide(color: theme.colorScheme.primary.withOpacity(0.5)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Continue as Guest',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Explore free astrology tools without creating an account',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.normal),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
