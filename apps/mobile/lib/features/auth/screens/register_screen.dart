import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_text_field.dart';
import 'login_screen.dart';
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

  // Step 2 Controllers (Birth Profile)
  final _step2FormKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();
  final _placeNameController = TextEditingController();
  final _latitudeController = TextEditingController();
  final _longitudeController = TextEditingController();
  String _selectedTimezone = 'Asia/Kolkata';

  // No pre-filled birth details: the user must enter their own.
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;

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
    _dateController.dispose();
    _timeController.dispose();
    _placeNameController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showAstroDatePicker(
      context: context,
      title: 'Date of Birth',
      initialDate: _selectedDate ?? DateTime(DateTime.now().year - 25),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.accent,
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
        _dateController.text = DateFormat('yyyy-MM-dd').format(picked);
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showAstroTimePicker(
      context: context,
      title: 'Time of Birth',
      initialTime: _selectedTime ?? const TimeOfDay(hour: 12, minute: 0),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.accent,
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
      final fullName = _nameController.text.trim();

      final latitude = double.tryParse(_latitudeController.text.trim());
      final longitude = double.tryParse(_longitudeController.text.trim());
      if (latitude == null || longitude == null || _placeNameController.text.trim().isEmpty) {
        // Never substitute default coordinates/place: they would produce a wrong chart.
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter your birth place with valid latitude and longitude.')),
        );
        return;
      }

      final birthProfileData = {
        'name': fullName.isNotEmpty ? fullName : 'My Profile',
        'dateOfBirth': _dateController.text.trim(),
        'timeOfBirth': _timeController.text.trim(),
        'latitude': latitude,
        'longitude': longitude,
        'timezone': _selectedTimezone,
        'placeName': _placeNameController.text.trim(),
      };

      final sent = await ref.read(authStateProvider.notifier).sendEmailOtp(email);
      if (sent && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VerificationScreen(
              email: email,
              fullName: fullName.isNotEmpty ? fullName : null,
              birthProfile: birthProfileData,
              onVerificationSuccess: widget.onRegisterSuccess,
            ),
          ),
        );
      }
    }
  }

  void _onBack() {
    if (_currentStep == 2) {
      setState(() => _currentStep = 1);
    } else {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final step1 = _currentStep == 1;

    // One sticky primary action per step, above the keyboard.
    final Widget primary;
    if (step1) {
      primary = AstroPrimaryButton(label: 'Continue', icon: Icons.arrow_forward_rounded, onPressed: _proceedToStep2);
    } else if (authState.isLoading) {
      primary = const AstroLoaderButton(label: 'Creating Account...', isDark: false);
    } else {
      primary = AstroPrimaryButton(
        label: 'Create Account',
        icon: Icons.check_rounded,
        onPressed: _submitRegistration,
      );
    }

    return PopScope(
      canPop: step1,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _currentStep = 1);
      },
      child: AstroPage(
        title: step1 ? 'Create Your Account' : 'Almost There!',
        onBack: _onBack,
        backgroundColor: AppColors.lightBackground,
        bottomBar: DecoratedBox(
          decoration: const BoxDecoration(
            color: AppColors.navBarFrost,
            border: Border(top: BorderSide(color: AppColors.separator, width: 0.5)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 12, AstroMetrics.gutter, 12),
              child: Center(
                heightFactor: 1,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: AstroMetrics.maxContentWidth),
                  child: primary,
                ),
              ),
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AstroStepIndicator(
              current: _currentStep,
              total: 2,
              labels: const ['Account', 'Birth details'],
              hint: step1 ? 'Begin your personalized astrology journey' : 'Tell us about yourself for accurate readings',
            ),
            const SizedBox(height: 24),
            if (step1) _buildStep1Content(authState) else _buildStep2Content(authState),
          ],
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
          const SizedBox(height: 24),

          // Login Link
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Text(
                'Already have an account? ',
                style: TextStyle(fontSize: 16, color: AppColors.lightTextSecondary),
              ),
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () {
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
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.accent,
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

  // STEP 2 UI: Birth Profile Details
  Widget _buildStep2Content(AuthState authState) {
    return Form(
      key: _step2FormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          const Row(
            children: [
              Icon(Icons.info_outline_rounded, size: 16, color: AppColors.textSecondary),
              SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Enter time as per your birth certificate',
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
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
          const Row(
            children: [
              Icon(Icons.info_outline_rounded, size: 16, color: AppColors.textSecondary),
              SizedBox(width: 4),
              Expanded(
                child: Text(
                  'This helps us calculate accurate planetary positions',
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Timezone Selector
          const Text(
            'Timezone',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: _selectedTimezone,
            style: const TextStyle(fontSize: 16, color: AppColors.primary),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.public_rounded, size: 21, color: AppColors.accent),
              filled: true,
              fillColor: AppColors.cardSurface,
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

          // Terms and Privacy Text
          const Text(
            'By creating an account, you agree to our\nTerms of Service or Privacy Policy',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
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
