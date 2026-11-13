import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/errors/app_exception.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../astrology/screens/birth_chart_screen.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/birth_profile_model.dart';
import '../models/location_model.dart';
import '../providers/birth_profile_provider.dart';
import '../widgets/location_autocomplete_field.dart';

class CreateBirthProfileScreen extends ConsumerStatefulWidget {
  final BirthProfileModel? existingProfile;

  const CreateBirthProfileScreen({super.key, this.existingProfile});

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
            ? DateTime.tryParse(widget.existingProfile!.dateOfBirth) ?? DateTime(1998, 8, 15)
            : DateTime(1998, 8, 15));

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
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
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 08, minute: 30),
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
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => BirthChartScreen(profile: savedProfile),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(birthProfilesListNotifierProvider);
    final isEditing = widget.existingProfile != null;

    final hasDisambiguationOrNonexistent =
        _ambiguousDetail != null || _nonexistentDetail != null;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: isEditing ? 'Edit Birth Details' : 'Your Birth Details',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
            physics: const BouncingScrollPhysics(),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. HEADER TITLE & SUBTITLE
                  Text(
                    isEditing ? 'Confirm & Update Birth Details' : 'Your Birth Details',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    isEditing
                        ? 'Updating your birth details will recalculate all planetary positions, kundli charts, and dasha timelines across the app.'
                        : 'Accurate birth date, time, and verified location calculate your exact ascendant, houses, and planetary positions.',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                      height: 1.4,
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Explanatory Info Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.primary.withOpacity(0.12)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.auto_awesome, color: AppColors.premiumAccent, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            isEditing
                                ? 'Notice: Any existing PDF reports generated with earlier coordinates will remain archived in your report library.'
                                : 'Why do we need this? Vedic Astrology (Jyotish) and Gupta Nadi calculations use exact solar alignment and horizon tilt at the precise minute of your birth.',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.lightTextPrimary,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Error banner if standard error and not specifically handled by cards
                  if (state.errorMessage != null && !hasDisambiguationOrNonexistent) ...[
                    ErrorBanner(message: state.errorMessage!),
                    const SizedBox(height: 16),
                  ],

                  // Nonexistent Local Time Explanation Card
                  if (_nonexistentDetail != null) ...[
                    AstroCard(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFEF4444), width: 1.5),
                        ),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 22),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Clock Change: Time Did Not Occur',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF991B1B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'The local time ${_timeController.text.trim()} did not occur in ${_selectedLocation?.timezone ?? _selectedTimezone} on ${_dateController.text.trim()} because clocks jumped forward 1 hour for Daylight Saving Time.',
                              style: const TextStyle(fontSize: 13, color: Color(0xFF7F1D1D), height: 1.4),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Please check your official birth records or certificate and adjust the time above before proceeding.',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF991B1B)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Ambiguous Local Time Disambiguation Selector Card
                  if (_ambiguousDetail != null) ...[
                    AstroCard(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                        ),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.schedule_rounded, color: Color(0xFFD97706), size: 22),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Ambiguous Local Birth Time',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF92400E),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Because clocks turned back by one hour on ${_dateController.text.trim()} in ${_selectedLocation?.timezone ?? _selectedTimezone}, this local time occurred twice.',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF78350F), height: 1.35),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Entered Time: ${_timeController.text.trim()}  |  Timezone: ${_selectedLocation?.timezone ?? _selectedTimezone}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Please select which occurrence corresponds to your birth:',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                            ),
                            const SizedBox(height: 8),
                            ...(_ambiguousDetail!.candidates ?? []).map((candidate) {
                              final isSelected = _selectedDisambiguation == candidate.disambiguation;
                              final isEarlier = candidate.disambiguation == 'earlier';
                              final offsetStr = candidate.offsetMinutes >= 0
                                  ? '+${(candidate.offsetMinutes / 60).toStringAsFixed(1)}'
                                  : (candidate.offsetMinutes / 60).toStringAsFixed(1);

                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.white : Colors.white.withOpacity(0.65),
                                  borderRadius: BorderRadius.circular(10),
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
                                      fontSize: 13,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  subtitle: Text(
                                    'UTC: ${candidate.utcIsoString.replaceFirst('.000Z', ' UTC')}  |  UTC Offset: ${offsetStr}h',
                                    style: const TextStyle(fontSize: 11, color: AppColors.lightTextSecondary),
                                  ),
                                  activeColor: const Color(0xFFD97706),
                                ),
                              );
                            }),
                            const SizedBox(height: 4),
                            ElevatedButton.icon(
                              onPressed: state.isLoading ? null : _submit,
                              icon: const Icon(Icons.check_circle_outline, size: 16),
                              label: const Text('Confirm Choice & Calculate Chart'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFD97706),
                                foregroundColor: Colors.white,
                                minimumSize: const Size.fromHeight(42),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 2. FORM CARD
                  AstroCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // FULL NAME INPUT
                        const Text(
                          'Full Name',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameController,
                          style: const TextStyle(fontSize: 14, color: AppColors.primary),
                          decoration: InputDecoration(
                            hintText: 'e.g. Rahul Sharma',
                            hintStyle: TextStyle(color: AppColors.secondary.withOpacity(0.5)),
                            prefixIcon: const Icon(Icons.person_outline_rounded, size: 18, color: AppColors.secondary),
                            filled: true,
                            fillColor: AppColors.lightBackground,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.lightBorder),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.lightBorder),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                            ),
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Please enter your full name';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 16),

                        // DATE & TIME ROW
                        Row(
                          children: [
                            // DATE PICKER
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Date of Birth',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _dateController,
                                    readOnly: true,
                                    onTap: _pickDate,
                                    style: const TextStyle(fontSize: 13, color: AppColors.primary),
                                    decoration: InputDecoration(
                                      hintText: 'YYYY-MM-DD',
                                      prefixIcon: const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.secondary),
                                      filled: true,
                                      fillColor: AppColors.lightBackground,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(color: AppColors.lightBorder),
                                      ),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) {
                                        return 'Required';
                                      }
                                      return null;
                                    },
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(width: 12),

                            // TIME PICKER
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Time of Birth',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _timeController,
                                    readOnly: true,
                                    onTap: _pickTime,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: _nonexistentDetail != null ? const Color(0xFFDC2626) : AppColors.primary,
                                      fontWeight: _nonexistentDetail != null ? FontWeight.bold : FontWeight.normal,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: 'HH:MM:SS',
                                      prefixIcon: Icon(
                                        Icons.access_time_rounded,
                                        size: 16,
                                        color: _nonexistentDetail != null ? const Color(0xFFDC2626) : AppColors.secondary,
                                      ),
                                      filled: true,
                                      fillColor: _nonexistentDetail != null ? const Color(0xFFFEF2F2) : AppColors.lightBackground,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: BorderSide(
                                          color: _nonexistentDetail != null ? const Color(0xFFEF4444) : AppColors.lightBorder,
                                        ),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: BorderSide(
                                          color: _nonexistentDetail != null ? const Color(0xFFEF4444) : AppColors.lightBorder,
                                          width: _nonexistentDetail != null ? 1.5 : 1.0,
                                        ),
                                      ),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) {
                                        return 'Required';
                                      }
                                      return null;
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 18),

                        // BIRTHPLACE LOCATION AUTOCOMPLETE
                        const Text(
                          'Place of Birth (City/Town)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        LocationAutocompleteField(
                          initialLocation: _selectedLocation,
                          onLocationSelected: _onLocationSelected,
                        ),

                        const SizedBox(height: 14),

                        // ADVANCED TOGGLE FOR VERIFIED COORDINATES
                        InkWell(
                          onTap: () {
                            setState(() {
                              _showAdvancedCoordinates = !_showAdvancedCoordinates;
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _showAdvancedCoordinates ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  size: 18,
                                  color: AppColors.secondary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _showAdvancedCoordinates ? 'Hide verified coordinates' : 'View verified coordinates & timezone',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        if (_showAdvancedCoordinates) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _latitudeController,
                                  readOnly: true,
                                  style: const TextStyle(fontSize: 13, color: AppColors.primary),
                                  decoration: InputDecoration(
                                    labelText: 'Latitude',
                                    filled: true,
                                    fillColor: AppColors.lightBackground,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(color: AppColors.lightBorder),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextFormField(
                                  controller: _longitudeController,
                                  readOnly: true,
                                  style: const TextStyle(fontSize: 13, color: AppColors.primary),
                                  decoration: InputDecoration(
                                    labelText: 'Longitude',
                                    filled: true,
                                    fillColor: AppColors.lightBackground,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(color: AppColors.lightBorder),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Timezone: $_selectedTimezone',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.lightTextSecondary,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // 3. PRIMARY GOLD CTA BUTTON
                  ElevatedButton(
                    onPressed: state.isLoading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.premiumAccent,
                      foregroundColor: AppColors.primary,
                      elevation: 2,
                      shadowColor: AppColors.premiumAccent.withOpacity(0.4),
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: state.isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                          )
                        : Text(
                            isEditing ? 'Save & Calculate Chart' : 'Create Birth Chart',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                  ),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
