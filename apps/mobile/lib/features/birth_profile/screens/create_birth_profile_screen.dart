import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../models/birth_profile_model.dart';
import '../providers/birth_profile_provider.dart';
import 'birth_profile_detail_screen.dart';

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
      initialDate: _selectedDate ?? DateTime(1990, 1, 1),
      firstDate: DateTime(1900),
      lastDate: now,
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
      initialTime: _selectedTime ?? const TimeOfDay(hour: 12, minute: 0),
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
            builder: (_) => BirthProfileDetailScreen(profileId: createdProfile.id),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(birthProfilesListNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Birth Profile'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (state.errorMessage != null) ...[
                  ErrorBanner(message: state.errorMessage!),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    hintText: 'e.g. Sushil Kumar',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _dateController,
                        readOnly: true,
                        onTap: _pickDate,
                        decoration: const InputDecoration(
                          labelText: 'Date of Birth',
                          hintText: 'YYYY-MM-DD',
                          prefixIcon: Icon(Icons.calendar_today_outlined),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Date is required';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _timeController,
                        readOnly: true,
                        onTap: _pickTime,
                        decoration: const InputDecoration(
                          labelText: 'Time of Birth',
                          hintText: 'HH:mm:ss',
                          prefixIcon: Icon(Icons.access_time_outlined),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Time is required';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedTimezone,
                  decoration: const InputDecoration(
                    labelText: 'Explicit Timezone',
                    prefixIcon: Icon(Icons.public_outlined),
                  ),
                  items: _commonTimezones
                      .map((tz) => DropdownMenuItem(
                            value: tz,
                            child: Text(tz),
                          ))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedTimezone = val;
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _latitudeController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(
                          labelText: 'Latitude',
                          hintText: '28.6139',
                          prefixIcon: Icon(Icons.navigation_outlined),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Latitude is required';
                          }
                          final num = double.tryParse(val.trim());
                          if (num == null || num < -90 || num > 90) {
                            return 'Invalid (-90 to 90)';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _longitudeController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(
                          labelText: 'Longitude',
                          hintText: '77.2090',
                          prefixIcon: Icon(Icons.explore_outlined),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Longitude is required';
                          }
                          final num = double.tryParse(val.trim());
                          if (num == null || num < -180 || num > 180) {
                            return 'Invalid (-180 to 180)';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _placeNameController,
                  decoration: const InputDecoration(
                    labelText: 'Place Name',
                    hintText: 'e.g. New Delhi, India',
                    prefixIcon: Icon(Icons.place_outlined),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Place name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 28),
                CustomButton(
                  text: 'Save Birth Profile',
                  isLoading: state.isLoading,
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
