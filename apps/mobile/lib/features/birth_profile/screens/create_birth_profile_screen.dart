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
import '../providers/birth_profile_provider.dart';

class CreateBirthProfileScreen extends ConsumerStatefulWidget {
  const CreateBirthProfileScreen({super.key});

  @override
  ConsumerState<CreateBirthProfileScreen> createState() => _CreateBirthProfileScreenState();
}

class _CreateBirthProfileScreenState extends ConsumerState<CreateBirthProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();
  final _latitudeController = TextEditingController(text: '28.6139');
  final _longitudeController = TextEditingController(text: '77.2090');
  final _placeNameController = TextEditingController(text: 'New Delhi, India');

  String _selectedTimezone = 'Asia/Kolkata';
  bool _showAdvancedCoordinates = false;

  static const List<String> _commonTimezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Dubai',
    'Asia/Singapore',
    'Australia/Sydney',
  ];

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;

  @override
  void dispose() {
    _nameController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    _placeNameController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime(1998, 8, 15),
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

  void _submit() async {
    if (_formKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();

      final dto = CreateBirthProfileDto(
        name: _nameController.text.trim(),
        dateOfBirth: _dateController.text.trim(),
        timeOfBirth: _timeController.text.trim(),
        latitude: double.parse(_latitudeController.text.trim()),
        longitude: double.parse(_longitudeController.text.trim()),
        timezone: _selectedTimezone,
        placeName: _placeNameController.text.trim(),
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

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: const AstroAppBar(
        title: 'Your Birth Details',
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
                  const Text(
                    'Your Birth Details',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Accurate birth details help us calculate your exact planetary positions and Kundli chart.',
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
                        // NAME INPUT
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

                        // PLACE OF BIRTH
                        const Text(
                          'Place of Birth',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _placeNameController,
                          style: const TextStyle(fontSize: 14, color: AppColors.primary),
                          decoration: InputDecoration(
                            hintText: 'e.g. New Delhi, India',
                            hintStyle: TextStyle(color: AppColors.secondary.withOpacity(0.5)),
                            prefixIcon: const Icon(Icons.place_outlined, size: 18, color: AppColors.secondary),
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
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Place name is required';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 18),

                        // TIMEZONE
                        const Text(
                          'Timezone',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedTimezone,
                          style: const TextStyle(fontSize: 14, color: AppColors.primary),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.public_rounded, size: 18, color: AppColors.secondary),
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
                          ),
                          items: _commonTimezones
                              .map((tz) => DropdownMenuItem(
                                    value: tz,
                                    child: Text(tz),
                                  ))
                              .toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setState(() => _selectedTimezone = val);
                            }
                          },
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
                                  'Advanced Coordinates (Lat/Long)',
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
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                                  style: const TextStyle(fontSize: 13, color: AppColors.primary),
                                  decoration: InputDecoration(
                                    labelText: 'Latitude',
                                    hintText: '28.6139',
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
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                                  style: const TextStyle(fontSize: 13, color: AppColors.primary),
                                  decoration: InputDecoration(
                                    labelText: 'Longitude',
                                    hintText: '77.2090',
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
                        : const Text(
                            'Create Birth Chart',
                            style: TextStyle(
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
