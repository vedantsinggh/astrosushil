import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/screens/simple_screen_kit.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../astrology/screens/birth_chart_screen.dart';
import '../../../home/providers/home_provider.dart';
import '../../../home/screens/home_screen.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/birth_profile_model.dart';
import '../models/location_model.dart';
import '../providers/birth_profile_provider.dart';
import '../widgets/location_autocomplete_field.dart';
import '../../../shared/widgets/astro_sheets.dart';

class CreateBirthProfileScreen extends ConsumerStatefulWidget {
  final BirthProfileModel? existingProfile;

  const CreateBirthProfileScreen({super.key, this.existingProfile});

  /// Opens this form from a sign-in / sign-up flow with the main shell (Home
  /// tab) as the root route underneath it, so the form and the birth chart it
  /// opens after saving always have a back path to Home.
  static void openAboveHome(BuildContext context, WidgetRef ref) {
    ref.read(homeTabControllerProvider.notifier).state = 0;
    final navigator = Navigator.of(context);
    navigator.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const HomeScreen()),
      (route) => false,
    );
    navigator.push(MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()));
  }

  @override
  ConsumerState<CreateBirthProfileScreen> createState() => _CreateBirthProfileScreenState();
}

class _CreateBirthProfileScreenState extends ConsumerState<CreateBirthProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameController;
  late final TextEditingController _dateController;
  late final TextEditingController _timeController;
  late final TextEditingController _latitudeController;
  late final TextEditingController _longitudeController;

  LocationModel? _selectedLocation;
  String _selectedTimezone = 'Asia/Kolkata';
  bool _showAdvancedCoordinates = false;

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;

  String? _selectedDisambiguation;
  ValidationErrorDetail? _ambiguousDetail;
  ValidationErrorDetail? _nonexistentDetail;

  @override
  void initState() {
    super.initState();
    final profile = widget.existingProfile;

    _nameController = TextEditingController(text: profile?.name ?? '');
    _dateController = TextEditingController(text: profile?.dateOfBirth ?? '');
    _timeController = TextEditingController(text: profile?.timeOfBirth ?? '');
    _latitudeController = TextEditingController(
      text: profile != null ? profile.latitude.toString() : '28.6139',
    );
    _longitudeController = TextEditingController(
      text: profile != null ? profile.longitude.toString() : '77.2090',
    );

    if (profile != null) {
      _selectedTimezone = profile.timezone;
      _selectedDisambiguation = profile.disambiguation;
      if (profile.placeName.isNotEmpty) {
        _selectedLocation = LocationModel(
          id: 'existing-location',
          name: profile.placeName,
          displayName: profile.placeName,
          country: profile.country ?? '',
          countryCode: profile.countryCode ?? '',
          state: profile.state,
          latitude: profile.latitude,
          longitude: profile.longitude,
          timezone: profile.timezone,
        );
      }

      if (profile.disambiguationRequired) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _submit();
        });
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    super.dispose();
  }

  void _clearDisambiguationState() {
    if (_ambiguousDetail != null || _nonexistentDetail != null) {
      setState(() {
        _ambiguousDetail = null;
        _nonexistentDetail = null;
      });
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final initial = _selectedDate ??
        (widget.existingProfile != null && widget.existingProfile!.dateOfBirth.isNotEmpty
            ? AppDateTime.parseCalendarDate(widget.existingProfile!.dateOfBirth) ?? DateTime(1998, 8, 15)
            : DateTime(1998, 8, 15));

    final picked = await showAstroDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Choose date of birth',
      initialDatePickerMode: _dateController.text.trim().isEmpty ? DatePickerMode.year : DatePickerMode.day,
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
      _clearDisambiguationState();
      setState(() {
        _selectedDate = picked;
        _dateController.text = DateFormat('yyyy-MM-dd').format(picked);
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showAstroTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 08, minute: 30),
      helpText: 'Choose time of birth',
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
      _clearDisambiguationState();
      setState(() {
        _selectedTime = picked;
        final hour = picked.hour.toString().padLeft(2, '0');
        final minute = picked.minute.toString().padLeft(2, '0');
        _timeController.text = '$hour:$minute:00';
      });
    }
  }

  void _onLocationSelected(LocationModel? location) {
    _clearDisambiguationState();
    setState(() {
      _selectedLocation = location;
      if (location != null) {
        _selectedTimezone = location.timezone;
        _latitudeController.text = location.latitude.toString();
        _longitudeController.text = location.longitude.toString();
      }
    });
  }

  void _submit() async {
    if (_formKey.currentState?.validate() ?? false) {
      if (_selectedLocation == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please search and select a verified birthplace from suggestions'),
            backgroundColor: Colors.redAccent,
          ),
        );
        return;
      }

      FocusScope.of(context).unfocus();

      final dto = CreateBirthProfileDto(
        name: _nameController.text.trim(),
        dateOfBirth: _dateController.text.trim(),
        timeOfBirth: _timeController.text.trim(),
        latitude: _selectedLocation!.latitude,
        longitude: _selectedLocation!.longitude,
        timezone: _selectedLocation!.timezone,
        placeName: _selectedLocation!.displayName,
        country: _selectedLocation!.country.isNotEmpty ? _selectedLocation!.country : null,
        countryCode: _selectedLocation!.countryCode.isNotEmpty ? _selectedLocation!.countryCode : null,
        state: _selectedLocation!.state,
        isResolved: true,
        disambiguation: _selectedDisambiguation,
      );

      BirthProfileModel? savedProfile;
      if (widget.existingProfile != null) {
        final auth = ref.read(authStateProvider);
        try {
          savedProfile = await ref
              .read(birthProfileRepositoryProvider)
              .updateProfile(widget.existingProfile!.id, dto, isGuest: auth.isGuest);
          await ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles();
        } on ValidationException catch (ve) {
          final ambiguous = ve.details?.where((d) => d.code == 'AMBIGUOUS_LOCAL_TIME').firstOrNull;
          final nonexistent = ve.details?.where((d) => d.code == 'NONEXISTENT_LOCAL_TIME').firstOrNull;
          setState(() {
            _ambiguousDetail = ambiguous;
            _nonexistentDetail = nonexistent;
            if (ambiguous != null && _selectedDisambiguation == null) {
              _selectedDisambiguation = 'earlier';
            }
          });
          return;
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent),
          );
          return;
        }
      } else {
        savedProfile = await ref
            .read(birthProfilesListNotifierProvider.notifier)
            .createProfile(dto);
      }

      final profileState = ref.read(birthProfilesListNotifierProvider);
      if (profileState.lastValidationException != null) {
        final details = profileState.lastValidationException!.details;
        final ambiguous = details?.where((d) => d.code == 'AMBIGUOUS_LOCAL_TIME').firstOrNull;
        final nonexistent = details?.where((d) => d.code == 'NONEXISTENT_LOCAL_TIME').firstOrNull;

        setState(() {
          _ambiguousDetail = ambiguous;
          _nonexistentDetail = nonexistent;
          if (ambiguous != null && _selectedDisambiguation == null) {
            _selectedDisambiguation = 'earlier';
          }
        });
      } else if (savedProfile != null) {
        setState(() {
          _ambiguousDetail = null;
          _nonexistentDetail = null;
        });

        if (mounted) {
          final navigator = Navigator.of(context);
          final chartRoute = MaterialPageRoute<void>(
            builder: (_) => BirthChartScreen(profile: savedProfile),
          );
          if (navigator.canPop()) {
            navigator.pushReplacement(chartRoute);
          } else {
            // This form is the root route (first profile during onboarding):
            // never leave the chart as a root with no way back. Reset to the
            // main shell and show the chart on top of it.
            ref.read(homeTabControllerProvider.notifier).state = 0;
            navigator.pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const HomeScreen()),
              (route) => false,
            );
            navigator.push(chartRoute);
          }
        }
      }
    }
  }

  /// Friendly display of the stored `yyyy-MM-dd` value (e.g. "15 August 1998").
  String? get _dateDisplayText {
    final raw = _dateController.text.trim();
    if (raw.isEmpty) return null;
    // Birth date is the birth place's civil date: format it without any
    // timezone conversion.
    return AppDateTime.formatCalendarDate(raw, 'd MMMM yyyy');
  }

  /// Friendly display of the stored `HH:mm:ss` value (e.g. "8:30 AM").
  String? _timeDisplayText(BuildContext context) {
    final raw = _timeController.text.trim();
    if (raw.isEmpty) return null;
    final parts = raw.split(':');
    if (parts.length >= 2) {
      final h = int.tryParse(parts[0]);
      final m = int.tryParse(parts[1]);
      if (h != null && m != null && h >= 0 && h < 24 && m >= 0 && m < 60) {
        return MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay(hour: h, minute: m));
      }
    }
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(birthProfilesListNotifierProvider);
    final isEditing = widget.existingProfile != null;

    final hasDisambiguationOrNonexistent = _ambiguousDetail != null || _nonexistentDetail != null;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: const SimpleScreenAppBar(),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                physics: const BouncingScrollPhysics(),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SimplePageHeading(
                        title: isEditing ? 'Edit Birth Details' : 'Your Birth Details',
                        subtitle: isEditing
                            ? 'Saving updates all your charts. Older PDF reports stay in your library.'
                            : 'We use these to make your birth chart.',
                      ),
                      const SizedBox(height: 20),

                      // Error banner if standard error and not specifically handled by cards
                      if (state.errorMessage != null && !hasDisambiguationOrNonexistent) ...[
                        ErrorBanner(message: state.errorMessage!),
                        const SizedBox(height: 16),
                      ],

                      // Nonexistent local time explanation
                      if (_nonexistentDetail != null) ...[
                        _buildNonexistentCard(),
                        const SizedBox(height: 16),
                      ],

                      // Ambiguous local time chooser
                      if (_ambiguousDetail != null) ...[
                        _buildAmbiguousCard(state.isLoading),
                        const SizedBox(height: 16),
                      ],

                      // FORM FIELDS
                      SimpleGroupCard(
                        padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // FULL NAME
                              const _FieldLabel(text: 'Full Name'),
                              TextFormField(
                                controller: _nameController,
                                style: const TextStyle(fontSize: 18, color: AppColors.primary),
                                decoration: _fieldDecoration(
                                  hint: 'e.g. Rahul Sharma',
                                  icon: Icons.person_outline_rounded,
                                ),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return 'Please enter your full name';
                                  }
                                  return null;
                                },
                              ),

                              const SizedBox(height: 22),

                              // DATE OF BIRTH
                              const _FieldLabel(text: 'Date of Birth'),
                              _PickerField(
                                key: const Key('birth_date_field'),
                                controller: _dateController,
                                icon: Icons.calendar_month_rounded,
                                valueText: _dateDisplayText,
                                placeholder: 'Choose a date',
                                onTap: _pickDate,
                              ),

                              const SizedBox(height: 22),

                              // TIME OF BIRTH
                              const _FieldLabel(text: 'Time of Birth'),
                              _PickerField(
                                key: const Key('birth_time_field'),
                                controller: _timeController,
                                icon: Icons.schedule_rounded,
                                valueText: _timeDisplayText(context),
                                placeholder: 'Choose a time',
                                onTap: _pickTime,
                                hasProblem: _nonexistentDetail != null,
                              ),
                              if (!isEditing) ...[
                                const SizedBox(height: 10),
                                const _FieldHint(
                                  icon: Icons.help_outline_rounded,
                                  text:
                                      'Not sure? If exact birth time is approximate, use 12:00 PM (Noon) or check hospital birth records.',
                                ),
                              ],

                              const SizedBox(height: 22),

                              // PLACE OF BIRTH
                              const _FieldLabel(text: 'Place of Birth'),
                              const Padding(
                                padding: EdgeInsets.only(bottom: 10),
                                child: Text(
                                  'Type your city or town, then pick it from the list.',
                                  style: TextStyle(fontSize: 14, height: 1.35, color: AppColors.textSecondary),
                                ),
                              ),
                              LocationAutocompleteField(
                                initialLocation: _selectedLocation,
                                onLocationSelected: _onLocationSelected,
                              ),

                              const SizedBox(height: 8),

                              // ADVANCED: VERIFIED COORDINATES (hidden by default)
                              _buildCoordinatesToggle(),
                              if (_showAdvancedCoordinates) _buildCoordinatesDetail(),
                            ],
                          ),
                        ],
                      ),

                      if (!isEditing) ...[
                        const SizedBox(height: 12),
                        const SimpleExpander(
                          label: 'Why do we need this?',
                          child: SimpleNote(
                            icon: Icons.auto_awesome,
                            color: AppColors.goldDark,
                            text:
                                'Vedic Astrology (Jyotish) and Gupta Nadi calculations use exact solar alignment and horizon tilt at the precise minute of your birth.',
                          ),
                        ),
                      ],

                      const SizedBox(height: 24),

                      // PRIMARY ACTION
                      SimplePrimaryButton(
                        label: isEditing ? 'Save & Calculate Chart' : 'Create Birth Chart',
                        icon: Icons.check_rounded,
                        isLoading: state.isLoading,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _fieldDecoration({required String hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 17, color: AppColors.textMuted),
      hintMaxLines: 2,
      prefixIcon: Icon(icon, size: 24, color: AppColors.secondary),
      filled: true,
      fillColor: AppColors.lightBackground,
      errorStyle: const TextStyle(fontSize: 14, color: AppColors.error),
      errorMaxLines: 3,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
    );
  }

  Widget _buildCoordinatesToggle() {
    return Semantics(
      button: true,
      expanded: _showAdvancedCoordinates,
      child: InkWell(
        onTap: () {
          setState(() {
            _showAdvancedCoordinates = !_showAdvancedCoordinates;
          });
        },
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              children: [
                Icon(
                  _showAdvancedCoordinates ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  size: 26,
                  color: AppColors.secondary,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    _showAdvancedCoordinates ? 'Hide verified coordinates' : 'View verified coordinates & timezone',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCoordinatesDetail() {
    InputDecoration deco(String label) => InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
          filled: true,
          fillColor: AppColors.lightBackground,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.lightBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.lightBorder),
          ),
        );

    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _latitudeController,
            readOnly: true,
            style: const TextStyle(fontSize: 16, color: AppColors.primary),
            decoration: deco('Latitude'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _longitudeController,
            readOnly: true,
            style: const TextStyle(fontSize: 16, color: AppColors.primary),
            decoration: deco('Longitude'),
          ),
          const SizedBox(height: 10),
          Text(
            'Timezone: $_selectedTimezone',
            style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildNonexistentCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.errorBorder, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 26),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Clock Change: Time Did Not Occur',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    height: 1.3,
                    color: Color(0xFF991B1B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'The local time ${_timeController.text.trim()} did not occur in ${_selectedLocation?.timezone ?? _selectedTimezone} on ${_dateController.text.trim()} because clocks jumped forward 1 hour for Daylight Saving Time.',
            style: const TextStyle(fontSize: 15, color: Color(0xFF7F1D1D), height: 1.45),
          ),
          const SizedBox(height: 10),
          const Text(
            'Please check your official birth records or certificate and adjust the time above before proceeding.',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.4, color: Color(0xFF991B1B)),
          ),
        ],
      ),
    );
  }

  Widget _buildAmbiguousCard(bool isLoading) {
    const amberDark = Color(0xFF92400E);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.warningBorder, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.schedule_rounded, color: Color(0xFFD97706), size: 26),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Ambiguous Local Birth Time',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, height: 1.3, color: amberDark),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Because clocks turned back by one hour on ${_dateController.text.trim()} in ${_selectedLocation?.timezone ?? _selectedTimezone}, this local time occurred twice.',
            style: const TextStyle(fontSize: 15, color: Color(0xFF78350F), height: 1.45),
          ),
          const SizedBox(height: 10),
          Text(
            'Entered Time: ${_timeController.text.trim()}  |  Timezone: ${_selectedLocation?.timezone ?? _selectedTimezone}',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: amberDark),
          ),
          const SizedBox(height: 14),
          const Text(
            'Please select which occurrence corresponds to your birth:',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: amberDark),
          ),
          const SizedBox(height: 10),
          ...(_ambiguousDetail!.candidates ?? []).map((candidate) {
            final isSelected = _selectedDisambiguation == candidate.disambiguation;
            final isEarlier = candidate.disambiguation == 'earlier';
            final offsetStr = candidate.offsetMinutes >= 0
                ? '+${(candidate.offsetMinutes / 60).toStringAsFixed(1)}'
                : (candidate.offsetMinutes / 60).toStringAsFixed(1);

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected ? const Color(0xFFD97706) : const Color(0xFFE5E7EB),
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: RadioListTile<String>(
                value: candidate.disambiguation,
                groupValue: _selectedDisambiguation,
                onChanged: (val) {
                  setState(() {
                    _selectedDisambiguation = val;
                  });
                },
                title: Text(
                  isEarlier
                      ? 'Earlier occurrence (First pass before clock change)'
                      : 'Later occurrence (Second pass after clock change)',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: AppColors.primary,
                  ),
                ),
                subtitle: Text(
                  'UTC: ${candidate.utcIsoString.replaceFirst('.000Z', ' UTC')}  |  UTC Offset: ${offsetStr}h',
                  style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
                ),
                activeColor: const Color(0xFFD97706),
              ),
            );
          }),
          const SizedBox(height: 4),
          ElevatedButton.icon(
            onPressed: isLoading ? null : _submit,
            icon: const Icon(Icons.check_circle_outline, size: 22),
            label: const Text(
              'Confirm Choice & Calculate Chart',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB45309),
              foregroundColor: Colors.white,
              elevation: 0,
              minimumSize: const Size.fromHeight(54),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Bold label shown above each form field.
class _FieldLabel extends StatelessWidget {
  final String text;

  const _FieldLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2, bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.bold,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

/// Short helper line under a field.
class _FieldHint extends StatelessWidget {
  final IconData icon;
  final String text;

  const _FieldHint({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Icon(icon, size: 20, color: AppColors.goldDark),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, height: 1.4, color: AppColors.textSecondary),
          ),
        ),
      ],
    );
  }
}

/// Large, tap-to-open picker field. The stored value lives in [controller]
/// (unchanged format); this widget only shows a friendlier [valueText] and
/// validates that a value has been chosen.
class _PickerField extends StatelessWidget {
  final TextEditingController controller;
  final IconData icon;
  final String? valueText;
  final String placeholder;
  final VoidCallback onTap;
  final bool hasProblem;

  const _PickerField({
    super.key,
    required this.controller,
    required this.icon,
    required this.valueText,
    required this.placeholder,
    required this.onTap,
    this.hasProblem = false,
  });

  @override
  Widget build(BuildContext context) {
    return FormField<String>(
      validator: (_) {
        final val = controller.text;
        if (val.trim().isEmpty) {
          return 'Required';
        }
        return null;
      },
      builder: (field) {
        // Clear a previous "Required" error once a value has been picked.
        if (field.hasError && controller.text.trim().isNotEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (field.mounted) field.validate();
          });
        }
        const problemColor = Color(0xFFDC2626);
        final borderColor = field.hasError || hasProblem ? AppColors.error : AppColors.lightBorder;

        return Semantics(
          button: true,
          child: Material(
            color: hasProblem ? AppColors.errorBg : AppColors.lightBackground,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: borderColor, width: hasProblem ? 1.5 : 1.0),
            ),
            child: InkWell(
              customBorder: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              onTap: onTap,
              child: InputDecorator(
                isEmpty: false,
                decoration: InputDecoration(
                  border: InputBorder.none,
                  errorText: field.errorText,
                  errorStyle: const TextStyle(fontSize: 14, color: AppColors.error),
                  contentPadding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
                ),
                child: Row(
                  children: [
                    Icon(icon, size: 24, color: hasProblem ? problemColor : AppColors.secondary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        valueText ?? placeholder,
                        style: TextStyle(
                          fontSize: 18,
                          height: 1.3,
                          fontWeight: valueText != null ? FontWeight.w600 : FontWeight.normal,
                          color:
                              hasProblem ? problemColor : (valueText != null ? AppColors.primary : AppColors.textMuted),
                        ),
                      ),
                    ),
                    if (valueText != null) ...[
                      const SizedBox(width: 8),
                      const Text(
                        'Change',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.goldDark,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
