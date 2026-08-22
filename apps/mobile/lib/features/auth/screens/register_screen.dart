import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_loader/astro_loader_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_text_field.dart';
import 'login_screen.dart';
import 'register_success_screen.dart';
import 'verification_screen.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  final VoidCallback? onRegisterSuccess;

  const RegisterScreen({
    super.key,
    this.onRegisterSuccess,
  });

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  int _currentStep = 1;

  // Step 1 Controllers
  final _step1FormKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  String _passwordInput = '';

  // Step 2 Controllers (Birth Profile)
  final _step2FormKey = GlobalKey<FormState>();
  final _dateController = TextEditingController(text: '1998-08-15');
  final _timeController = TextEditingController(text: '08:30:00');
  final _placeNameController = TextEditingController(text: 'New Delhi, India');
  final _latitudeController = TextEditingController(text: '28.6139');
  final _longitudeController = TextEditingController(text: '77.2090');
  String _selectedTimezone = 'Asia/Kolkata';

  DateTime? _selectedDate = DateTime(1998, 8, 15);
  TimeOfDay? _selectedTime = const TimeOfDay(hour: 8, minute: 30);

  static const List<String> _commonTimezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Dubai',
    'Asia/Singapore',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    _placeNameController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    super.dispose();
  }

  // Dynamic Password Validation Checks
  bool get _hasMinLength => _passwordInput.length >= 8;
  bool get _hasUppercase => RegExp(r'[A-Z]').hasMatch(_passwordInput);
  bool get _hasSpecialOrNumber => RegExp(r'[0-9!@#$%^&*(),.?":{}|<>]').hasMatch(_passwordInput);

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime(1998, 8, 15),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: AppColors.lightSurface,
              onSurface: AppColors.primary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _dateController.text = DateFormat('yyyy-MM-DD').format(picked);
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 8, minute: 30),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: AppColors.lightSurface,
              onSurface: AppColors.primary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedTime = picked;
        final h = picked.hour.toString().padLeft(2, '0');
        final m = picked.minute.toString().padLeft(2, '0');
        _timeController.text = '$h:$m:00';
      });
    }
  }

  void _proceedToStep2() {
    if (_step1FormKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();
      setState(() {
        _currentStep = 2;
      });
    }
  }

  Future<void> _submitRegistration() async {
    if (_step2FormKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final fullName = _nameController.text.trim();
      final phone = _phoneController.text.trim();

      final birthProfileData = {
        'name': fullName.isNotEmpty ? fullName : 'My Profile',
        'dateOfBirth': _dateController.text.trim(),
        'timeOfBirth': _timeController.text.trim(),
        'latitude': double.tryParse(_latitudeController.text.trim()) ?? 28.6139,
        'longitude': double.tryParse(_longitudeController.text.trim()) ?? 77.2090,
        'timezone': _selectedTimezone,
        'placeName': _placeNameController.text.trim().isNotEmpty
            ? _placeNameController.text.trim()
            : 'New Delhi, India',
      };

      final result = await ref.read(authStateProvider.notifier).register(
            email,
            password,
            fullName: fullName,
            phoneNumber: phone,
            birthProfile: birthProfileData,
          );

      if (result != null && result.requiresEmailVerification && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VerificationScreen(email: result.email),
          ),
        );
        return;
      }

      if (result != null && !result.requiresEmailVerification && mounted) {
        if (widget.onRegisterSuccess != null) {
          widget.onRegisterSuccess!();
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => const RegisterSuccessScreen(),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.primary),
          onPressed: () {
            if (_currentStep == 2) {
              setState(() => _currentStep = 1);
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 20.0),
            child: Center(
              child: Text(
                'Step $_currentStep of 2',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.secondary,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
            physics: const BouncingScrollPhysics(),
            child: Column(
              children: [
                // Icon Emblem Top
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withOpacity(0.08),
                      border: Border.all(color: AppColors.primary.withOpacity(0.2), width: 1.5),
                    ),
                    child: Icon(
                      _currentStep == 1 ? Icons.auto_awesome : Icons.person_pin_circle_outlined,
                      size: 32,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                if (_currentStep == 1) _buildStep1Content(authState) else _buildStep2Content(authState),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // STEP 1 UI: Account Details
  Widget _buildStep1Content(AuthState authState) {
    return Form(
      key: _step1FormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Create Your Account',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
              letterSpacing: -0.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          const Text(
            'Begin your personalized astrology journey',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.lightTextSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          if (authState.errorMessage != null) ...[
            ErrorBanner(
              message: authState.errorMessage!,
              onRetry: () => ref.read(authStateProvider.notifier).clearError(),
            ),
            const SizedBox(height: 18),
          ],

          // Full Name
          AuthTextField(
            controller: _nameController,
            labelText: 'Full Name',
            hintText: 'Rahul Sharma',
            autofillHints: const [AutofillHints.name],
            prefixIcon: const Icon(Icons.person_outline_rounded),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Enter your full name.';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Email Address
          AuthTextField(
            controller: _emailController,
            labelText: 'Email Address',
            hintText: 'user@example.com',
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            prefixIcon: const Icon(Icons.email_outlined),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Enter your email address.';
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val.trim())) {
                return 'Enter a valid email address.';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Phone Number (Optional)
          AuthTextField(
            controller: _phoneController,
            labelText: 'Phone Number (Optional)',
            hintText: '+91 98765 43210',
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            prefixIcon: const Icon(Icons.phone_outlined),
          ),
          const SizedBox(height: 16),

          // Password
          AuthTextField(
            controller: _passwordController,
            labelText: 'Password',
            isPassword: _obscurePassword,
            autofillHints: const [AutofillHints.newPassword],
            prefixIcon: const Icon(Icons.lock_outline),
            onChanged: (val) {
              setState(() {
                _passwordInput = val;
              });
            },
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Enter a password.';
              }
              if (val.length < 8) {
                return 'Password must be at least 8 characters.';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Confirm Password
          AuthTextField(
            controller: _confirmPasswordController,
            labelText: 'Confirm Password',
            isPassword: _obscureConfirmPassword,
            prefixIcon: const Icon(Icons.lock_reset_outlined),
            suffixIcon: IconButton(
              icon: Icon(_obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            ),
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Confirm your password.';
              }
              if (val != _passwordController.text) {
                return 'Passwords do not match.';
              }
              return null;
            },
          ),
          const SizedBox(height: 18),

          // Dynamic Password Requirements Checklist
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.lightBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCheckItem('At least 8 characters', _hasMinLength),
                const SizedBox(height: 6),
                _buildCheckItem('One uppercase letter', _hasUppercase),
                const SizedBox(height: 6),
                _buildCheckItem('One number or special character', _hasSpecialOrNumber),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Continue Button
          ElevatedButton(
            onPressed: _proceedToStep2,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              elevation: 2,
            ),
            child: const Text(
              'Continue',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Login Link
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Already have an account? ',
                style: TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
              ),
              GestureDetector(
                onTap: () {
                  ref.read(authStateProvider.notifier).clearError();
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => LoginScreen(onLoginSuccess: widget.onRegisterSuccess),
                    ),
                  );
                },
                child: const Text(
                  'Login',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildCheckItem(String label, bool isMet) {
    return Row(
      children: [
        Icon(
          isMet ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
          size: 16,
          color: isMet ? AppColors.success : AppColors.lightTextMuted,
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isMet ? FontWeight.w600 : FontWeight.normal,
            color: isMet ? AppColors.primary : AppColors.lightTextSecondary,
          ),
        ),
      ],
    );
  }

  // STEP 2 UI: Birth Profile Details
  Widget _buildStep2Content(AuthState authState) {
    return Form(
      key: _step2FormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Almost There!',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
              letterSpacing: -0.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          const Text(
            'Tell us about yourself for accurate readings',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.lightTextSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          if (authState.errorMessage != null) ...[
            ErrorBanner(
              message: authState.errorMessage!,
              onRetry: () => ref.read(authStateProvider.notifier).clearError(),
            ),
            const SizedBox(height: 18),
          ],

          // Date of Birth
          AuthTextField(
            controller: _dateController,
            labelText: 'Date of Birth',
            hintText: 'YYYY-MM-DD',
            readOnly: true,
            onTap: _pickDate,
            prefixIcon: const Icon(Icons.calendar_today_rounded),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Date of Birth is required.';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Time of Birth
          AuthTextField(
            controller: _timeController,
            labelText: 'Time of Birth',
            hintText: 'HH:mm:ss',
            readOnly: true,
            onTap: _pickTime,
            prefixIcon: const Icon(Icons.access_time_rounded),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Time of Birth is required.';
              }
              return null;
            },
          ),
          const SizedBox(height: 4),
          Row(
            children: const [
              Icon(Icons.info_outline_rounded, size: 13, color: AppColors.lightTextMuted),
              SizedBox(width: 4),
              Text(
                'Enter time as per your birth certificate',
                style: TextStyle(fontSize: 11, color: AppColors.lightTextMuted),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Place of Birth
          AuthTextField(
            controller: _placeNameController,
            labelText: 'Place of Birth',
            hintText: 'Search your birth place (e.g. New Delhi, India)',
            prefixIcon: const Icon(Icons.place_outlined),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Place of birth is required.';
              }
              return null;
            },
          ),
          const SizedBox(height: 4),
          Row(
            children: const [
              Icon(Icons.info_outline_rounded, size: 13, color: AppColors.lightTextMuted),
              SizedBox(width: 4),
              Text(
                'This helps us calculate accurate planetary positions',
                style: TextStyle(fontSize: 11, color: AppColors.lightTextMuted),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Timezone Selector
          const Text(
            'Timezone',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: _selectedTimezone,
            style: const TextStyle(fontSize: 14, color: AppColors.primary),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.public_rounded, size: 20, color: AppColors.secondary),
              filled: true,
              fillColor: AppColors.lightBackground,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.lightBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.lightBorder),
              ),
            ),
            items: _commonTimezones
                .map((tz) => DropdownMenuItem(value: tz, child: Text(tz)))
                .toList(),
            onChanged: (val) {
              if (val != null) setState(() => _selectedTimezone = val);
            },
          ),

          const SizedBox(height: 28),

          // Submit Create Account Button
          authState.isLoading
              ? const AstroLoaderButton(
                  label: 'Creating Account...',
                  isDark: false,
                )
              : ElevatedButton(
                  onPressed: _submitRegistration,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 2,
                  ),
                  child: const Text(
                    'Create Account',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),

          const SizedBox(height: 20),

          // Terms and Privacy Text
          const Text(
            'By creating an account, you agree to our\nTerms of Service or Privacy Policy',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.lightTextMuted,
              height: 1.4,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
