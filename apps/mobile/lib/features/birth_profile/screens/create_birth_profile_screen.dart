import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../astrology/screens/birth_chart_screen.dart';
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
      setState(() {
        _selectedTime = picked;
        final hour = picked.hour.toString().padLeft(2, '0');
        final minute = picked.minute.toString().padLeft(2, '0');
        _timeController.text = '$hour:$minute:00';
      });
    }
  }

  void _onLocationSelected(LocationModel? location) {
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
      );

      final createdProfile = await ref
          .read(birthProfilesListNotifierProvider.notifier)
          .createProfile(dto);

      if (createdProfile != null && mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => BirthChartScreen(profile: createdProfile),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(birthProfilesListNotifierProvider);
    final isEditing = widget.existingProfile != null;

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
                  const Text(
                    'Accurate birth date, time, and verified location calculate your exact ascendant, houses, and planetary positions.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                      height: 1.4,
                    ),
                  ),

                  const SizedBox(height: 20),

                  if (state.errorMessage != null) ...[
                    ErrorBanner(message: state.errorMessage!),
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
                              return 'Full Name is required';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 18),

                        // DATE & TIME OF BIRTH ROW
                        Row(
                          children: [
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
                                    style: const TextStyle(fontSize: 14, color: AppColors.primary),
                                    decoration: InputDecoration(
                                      hintText: 'YYYY-MM-DD',
                                      hintStyle: TextStyle(color: AppColors.secondary.withOpacity(0.5)),
                                      prefixIcon: const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.secondary),
                                      filled: true,
                                      fillColor: AppColors.lightBackground,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(color: AppColors.lightBorder),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(color: AppColors.lightBorder),
                                      ),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) {
                                        return 'Date is required';
                                      }
                                      return null;
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
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
                                    style: const TextStyle(fontSize: 14, color: AppColors.primary),
                                    decoration: InputDecoration(
                                      hintText: 'HH:mm:ss',
                                      hintStyle: TextStyle(color: AppColors.secondary.withOpacity(0.5)),
                                      prefixIcon: const Icon(Icons.access_time_rounded, size: 18, color: AppColors.secondary),
                                      filled: true,
                                      fillColor: AppColors.lightBackground,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(color: AppColors.lightBorder),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(color: AppColors.lightBorder),
                                      ),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) {
                                        return 'Time is required';
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

                        // VERIFIED PLACE OF BIRTH (AUTOCOMPLETE)
                        const Text(
                          'Place of Birth',
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

                        // ADVANCED LAT / LONG COLLAPSIBLE
                        InkWell(
                          onTap: () {
                            setState(() => _showAdvancedCoordinates = !_showAdvancedCoordinates);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6.0),
                            child: Row(
                              children: [
                                Icon(
                                  _showAdvancedCoordinates
                                      ? Icons.keyboard_arrow_up_rounded
                                      : Icons.keyboard_arrow_down_rounded,
                                  size: 18,
                                  color: AppColors.secondary,
                                ),
                                const SizedBox(width: 4),
                                const Text(
                                  'Resolved Coordinates (Lat/Long/TZ)',
                                  style: TextStyle(
                                    fontSize: 12,
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
