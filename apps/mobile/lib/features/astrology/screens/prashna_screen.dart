import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/prashna_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/astrology_data_table.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';

/// Screen for casting instantaneous or customized Prashna (Horary) astrology queries
/// calculates Prashna Lagna, Chandra query mind, Sphutas (Gulika, Trisphuta), and moment Panchanga.
class PrashnaScreen extends ConsumerStatefulWidget {
  const PrashnaScreen({super.key});

  @override
  ConsumerState<PrashnaScreen> createState() => _PrashnaScreenState();
}

class _PrashnaScreenState extends ConsumerState<PrashnaScreen> {
  final _formKey = GlobalKey<FormState>();

  DateTime _selectedDateTime = DateTime.now();
  final _placeController = TextEditingController(text: 'New Delhi, India');
  final _latitudeController = TextEditingController(text: '28.6139');
  final _longitudeController = TextEditingController(text: '77.2090');
  final _timezoneController = TextEditingController(text: 'Asia/Kolkata');
  final _questionTextController = TextEditingController();
  final _questionNumberController = TextEditingController();
  String _selectedNumberSystem = 'PARASHARI_108'; // or 'KP_249'
  bool _useQuestionNumber = false;

  @override
  void dispose() {
    _placeController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    _timezoneController.dispose();
    _questionTextController.dispose();
    _questionNumberController.dispose();
    super.dispose();
  }

  void _submitPrashna() {
    if (!_formKey.currentState!.validate()) return;

    final lat = double.tryParse(_latitudeController.text.trim()) ?? 28.6139;
    final lng = double.tryParse(_longitudeController.text.trim()) ?? 77.2090;
    final qNum = _useQuestionNumber
        ? int.tryParse(_questionNumberController.text.trim())
        : null;

    ref.read(prashnaProvider.notifier).submitPrashna(
          questionTime: _selectedDateTime,
          timezone: _timezoneController.text.trim(),
          latitude: lat,
          longitude: lng,
          placeName: _placeController.text.trim(),
          questionNumber: qNum,
          questionNumberSystem: _useQuestionNumber ? _selectedNumberSystem : null,
          questionText: _questionTextController.text.trim().isNotEmpty
              ? _questionTextController.text.trim()
              : null,
        );
  }

  @override
  Widget build(BuildContext context) {
    final prashnaState = ref.watch(prashnaProvider);

    return Scaffold(
      appBar: AstroAppBar(
        title: 'Prashna (Horary Astrology)',
        actions: [
          if (prashnaState.result != null)
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
              tooltip: 'New Question',
              onPressed: () {
                ref.read(prashnaProvider.notifier).clear();
              },
            ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: prashnaState.isLoading
            ? const AstrologyLoadingState(
                message: 'Casting Prashna Chart and Sphuta Calculations...',
              )
            : prashnaState.errorMessage != null
                ? AstrologyErrorState(
                    customMessage: prashnaState.errorMessage,
                    onRetry: _submitPrashna,
                  )
                : prashnaState.result != null
                    ? _buildResultView(prashnaState.result!)
                    : _buildInputForm(),
      ),
    );
  }

  Widget _buildInputForm() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.psychology_rounded, color: AppColors.primary, size: 28),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Prashna Shastra casts a precise astrological chart for the moment and place a question is asked.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AstrologySectionCard(
              title: '1. Query Details',
              subtitle: 'State the querent question and optional seed number',
              icon: Icons.help_outline_rounded,
              child: Column(
                children: [
                  TextFormField(
                    controller: _questionTextController,
                    decoration: const InputDecoration(
                      labelText: 'Question / Topic (Optional)',
                      hintText: 'e.g. Will the business contract finalize smoothly?',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  Material(
                    color: Colors.transparent,
                    child: SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Use Horary Seed Number (Prashna Sankhya)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        _selectedNumberSystem == 'PARASHARI_108'
                            ? 'Parashari / Ashtamangala (1–108)'
                            : 'KP Seed Number (1–249)',
                        style: const TextStyle(fontSize: 11, color: AppColors.secondary),
                      ),
                      value: _useQuestionNumber,
                      onChanged: (val) {
                        setState(() {
                          _useQuestionNumber = val;
                        });
                      },
                    ),
                  ),
                  if (_useQuestionNumber) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _selectedNumberSystem,
                            decoration: const InputDecoration(
                              labelText: 'System',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'PARASHARI_108',
                                child: Text('Parashari (1–108)', style: TextStyle(fontSize: 12)),
                              ),
                              DropdownMenuItem(
                                value: 'KP_249',
                                child: Text('KP (1–249)', style: TextStyle(fontSize: 12)),
                              ),
                            ],
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedNumberSystem = val;
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _questionNumberController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: _selectedNumberSystem == 'PARASHARI_108'
                                  ? 'Number (1–108)'
                                  : 'Number (1–249)',
                              border: const OutlineInputBorder(),
                              isDense: true,
                            ),
                            validator: (val) {
                              if (!_useQuestionNumber) return null;
                              final num = int.tryParse(val ?? '');
                              if (num == null) return 'Enter number';
                              if (_selectedNumberSystem == 'PARASHARI_108' &&
                                  (num < 1 || num > 108)) {
                                return '1 to 108 only';
                              }
                              if (_selectedNumberSystem == 'KP_249' &&
                                  (num < 1 || num > 249)) {
                                return '1 to 249 only';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            AstrologySectionCard(
              title: '2. Time & Location',
              subtitle: 'Defaults to current moment and location',
              icon: Icons.location_on_rounded,
              child: Column(
                children: [
                  Material(
                    color: Colors.transparent,
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Question Timestamp', style: TextStyle(fontSize: 13)),
                      subtitle: Text(
                        _selectedDateTime.toLocal().toString().split('.')[0],
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: AppColors.primary,
                        ),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _selectedDateTime = DateTime.now();
                              });
                            },
                            child: const Text('Now'),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_calendar_rounded, color: AppColors.primary),
                            onPressed: () async {
                              final date = await showDatePicker(
                                context: context,
                                initialDate: _selectedDateTime,
                                firstDate: DateTime(1900),
                                lastDate: DateTime(2100),
                              );
                              if (date != null && mounted) {
                                final time = await showTimePicker(
                                  context: context,
                                  initialTime: TimeOfDay.fromDateTime(_selectedDateTime),
                                );
                                if (time != null) {
                                  setState(() {
                                    _selectedDateTime = DateTime(
                                      date.year,
                                      date.month,
                                      date.day,
                                      time.hour,
                                      time.minute,
                                    );
                                  });
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Divider(),
                  TextFormField(
                    controller: _placeController,
                    decoration: const InputDecoration(
                      labelText: 'Place Name',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Place is required' : null,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _latitudeController,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true, signed: true),
                          decoration: const InputDecoration(
                            labelText: 'Latitude',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Latitude required' : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _longitudeController,
                          keyboardType: const TextInputType.numberWithOptions(
                              decimal: true, signed: true),
                          decoration: const InputDecoration(
                            labelText: 'Longitude',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Longitude required' : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _submitPrashna,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              icon: const Icon(Icons.flare_rounded, color: Colors.white),
              label: const Text(
                'Cast Prashna Chart',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultView(PrashnaChartModel result) {
    final lagna = result.prashnaLagna;
    final moon = result.chandra;
    final sphutas = result.sphutas;

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primary.withValues(alpha: 0.1),
                AppColors.secondary.withValues(alpha: 0.06),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.psychology_rounded, color: AppColors.primary, size: 24),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      result.questionText ?? 'Horary Question Analysis',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Cast: ${result.timeDetails.formattedLocalTime} • ${result.location.placeName}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.secondary,
                ),
              ),
              if (result.questionNumberDetails != null) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Seed Number: ${result.questionNumberDetails!.number} (${result.questionNumberDetails!.system})',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Prashna Lagna (Horary Ascendant)',
          subtitle: 'The primary anchor point and physical reality of the query',
          icon: Icons.explore_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Ascendant Sign',
                value: lagna.rashiName,
              ),
              AstrologyInfoRow(
                label: 'Exact Degree',
                value: lagna.formattedDegree,
              ),
              AstrologyInfoRow(
                label: 'Ascendant Lord (Lagnesha)',
                value: lagna.lord,
              ),
              AstrologyInfoRow(
                label: 'Nakshatra & Pada',
                value: '${lagna.nakshatraName} (P${lagna.pada})',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Chandra (Moon Position & Query Mind)',
          subtitle: 'Reflects querent mental intention and ultimate fruition',
          icon: Icons.nightlight_round,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Moon Sign (Chandra Rashi)',
                value: moon.rashiName,
              ),
              AstrologyInfoRow(
                label: 'Moon House from Lagna',
                value: 'House ${moon.house}',
              ),
              AstrologyInfoRow(
                label: 'Moon Nakshatra & Pada',
                value: '${moon.nakshatraName} (P${moon.pada})',
              ),
              AstrologyInfoRow(
                label: 'Moon Lord',
                value: moon.lord,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AstrologySectionCard(
          title: 'Classical Horary Sphutas (Sensitive Points)',
          subtitle: 'Traditional Parashari mathematical points for Prashna validation',
          icon: Icons.flare_rounded,
          child: Column(
            children: [
              AstrologyInfoRow(
                label: 'Gulika / Mandi',
                value:
                    '${sphutas.gulika.rashiName} (${sphutas.gulika.formattedDegree})',
              ),
              AstrologyInfoRow(
                label: 'Trisphuta (Lagna + Moon + Gulika)',
                value:
                    '${sphutas.trisphuta.rashiName} (${sphutas.trisphuta.formattedDegree})',
              ),
              AstrologyInfoRow(
                label: 'Chatusphuta (+ Sun)',
                value:
                    '${sphutas.chatusphuta.rashiName} (${sphutas.chatusphuta.formattedDegree})',
              ),
              AstrologyInfoRow(
                label: 'Panchasphuta (+ Rahu)',
                value:
                    '${sphutas.panchasphuta.rashiName} (${sphutas.panchasphuta.formattedDegree})',
              ),
            ],
          ),
        ),
        if (result.panchanga != null) ...[
          const SizedBox(height: 16),
          AstrologySectionCard(
            title: 'Moment Panchanga',
            subtitle: 'Cosmic climate when the query was initiated',
            icon: Icons.wb_twilight_rounded,
            child: Column(
              children: [
                AstrologyInfoRow(
                  label: 'Tithi',
                  value: result.panchanga!.tithiName,
                ),
                AstrologyInfoRow(
                  label: 'Vara (Weekday)',
                  value: result.panchanga!.varaName,
                ),
                AstrologyInfoRow(
                  label: 'Yoga',
                  value: result.panchanga!.yogaName,
                ),
                AstrologyInfoRow(
                  label: 'Karana',
                  value: result.panchanga!.karanaName,
                ),
                AstrologyInfoRow(
                  label: 'Rahu Kala Active',
                  value: result.panchanga!.isRahuKala ? 'YES (Inauspicious)' : 'NO',
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () {
            ref.read(prashnaProvider.notifier).clear();
          },
          icon: const Icon(Icons.add_comment_rounded, color: AppColors.primary),
          label: const Text('Cast Another Prashna', style: TextStyle(color: AppColors.primary)),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
            side: const BorderSide(color: AppColors.primary),
          ),
        ),
      ],
    );
  }
}
