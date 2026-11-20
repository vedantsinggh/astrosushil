import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/prashna_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';

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
  // Location fields start empty: the querent must enter their own place.
  final _placeController = TextEditingController();
  final _latitudeController = TextEditingController();
  final _longitudeController = TextEditingController();
  final _timezoneController = TextEditingController();
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

    // The querent's real location is required; no default city is assumed.
    final lat = double.tryParse(_latitudeController.text.trim());
    final lng = double.tryParse(_longitudeController.text.trim());
    if (lat == null || lng == null || _timezoneController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the place, latitude, longitude and timezone of the question.')),
      );
      return;
    }
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

    final Widget body = prashnaState.isLoading
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
                : _buildInputForm();

    return AstroPage(
      title: 'Prashna (Horary Astrology)',
      child: body,
    );
  }

  /// Large, light, clearly labelled input decoration used by the form fields.
  InputDecoration _fieldDecoration({String? hint, String? label}) {
    OutlineInputBorder border(Color c, [double w = 1.2]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: c, width: w),
        );
    return InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: AppColors.cardSurface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: kAdvSecondary,
      hintStyle: kAdvSecondary.copyWith(color: AppColors.textMuted),
      errorStyle: kAdvSecondary.copyWith(color: AppColors.error),
      errorMaxLines: 2,
      border: border(AppColors.cardBorder),
      enabledBorder: border(AppColors.cardBorder),
      focusedBorder: border(AppColors.gold, 2),
      errorBorder: border(AppColors.error),
      focusedErrorBorder: border(AppColors.error, 2),
    );
  }

  /// A visible label above an input, so the purpose stays readable while typing.
  Widget _labelled(String label, Widget field) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(label, style: kAdvBody.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        field,
      ],
    );
  }

  Widget _buildInputForm() {
    return Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AdvSummaryCard(
              label: 'Prashna',
              icon: Icons.psychology_rounded,
              title: 'Ask your question',
              subtitle:
                  'Prashna Shastra casts a precise astrological chart for the moment and place a question is asked.',
            ),
            const SizedBox(height: kAdvGap),

            // STEP 1: QUESTION
            AdvCard(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AdvStepHeader(
                    step: 1,
                    total: 2,
                    title: 'Query Details',
                    hint: 'Write your question. A seed number is optional.',
                  ),
                  const SizedBox(height: 16),
                  _labelled(
                    'Question / Topic (Optional)',
                    TextFormField(
                      controller: _questionTextController,
                      style: kAdvBody,
                      decoration: _fieldDecoration(
                        hint: 'e.g. Will the business contract finalize smoothly?',
                      ),
                      maxLines: 3,
                      minLines: 2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Material(
                    color: Colors.transparent,
                    child: SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      activeThumbColor: AppColors.gold,
                      title: Text(
                        'Use Horary Seed Number (Prashna Sankhya)',
                        style: kAdvBody.copyWith(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        _selectedNumberSystem == 'PARASHARI_108'
                            ? 'Parashari / Ashtamangala (1–108)'
                            : 'KP Seed Number (1–249)',
                        style: kAdvSecondary,
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
                    _labelled(
                      'System',
                      AstroSegmentedControl<String>(
                        selected: _selectedNumberSystem,
                        segments: const [
                          AstroSegment(value: 'PARASHARI_108', label: 'Parashari (1–108)'),
                          AstroSegment(value: 'KP_249', label: 'KP (1–249)'),
                        ],
                        onChanged: (val) {
                          setState(() {
                            _selectedNumberSystem = val;
                          });
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                    _labelled(
                      _selectedNumberSystem == 'PARASHARI_108' ? 'Number (1–108)' : 'Number (1–249)',
                      TextFormField(
                        controller: _questionNumberController,
                        keyboardType: TextInputType.number,
                        style: kAdvBody,
                        decoration: _fieldDecoration(),
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
                ],
              ),
            ),
            const SizedBox(height: kAdvGap),

            // STEP 2: TIME & LOCATION
            AdvCard(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AdvStepHeader(
                    step: 2,
                    total: 2,
                    title: 'Time & Location',
                    hint: 'When and where the question was asked.',
                  ),
                  const SizedBox(height: 16),
                  Text('Question Timestamp', style: kAdvBody.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: AstroTint.sky.background,
                      borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.schedule_rounded, color: AstroTint.sky.foreground, size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _selectedDateTime.toLocal().toString().split('.')[0],
                            style: kAdvBody.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          minimumSize: const Size(48, 48),
                          foregroundColor: AppColors.accent,
                          textStyle: kAdvBody.copyWith(fontWeight: FontWeight.w600),
                        ),
                        onPressed: () {
                          setState(() {
                            _selectedDateTime = DateTime.now();
                          });
                        },
                        icon: const Icon(Icons.update_rounded),
                        label: const Text('Now'),
                      ),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          minimumSize: const Size(48, 48),
                          foregroundColor: AppColors.accent,
                          textStyle: kAdvBody.copyWith(fontWeight: FontWeight.w600),
                        ),
                        icon: const Icon(Icons.edit_calendar_rounded),
                        label: const Text('Change date & time'),
                        onPressed: () async {
                          final date = await showAstroDatePicker(
                            context: context,
                            initialDate: _selectedDateTime,
                            firstDate: DateTime(1900),
                            lastDate: DateTime(2100),
                          );
                          if (date != null && mounted) {
                            final time = await showAstroTimePicker(
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
                  const SizedBox(height: 12),
                  _labelled(
                    'Place Name',
                    TextFormField(
                      controller: _placeController,
                      style: kAdvBody,
                      decoration: _fieldDecoration(hint: 'e.g. New Delhi'),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Place is required' : null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _labelled(
                    'Latitude',
                    TextFormField(
                      controller: _latitudeController,
                      style: kAdvBody,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true, signed: true),
                      decoration: _fieldDecoration(hint: 'e.g. 28.61'),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Latitude required' : null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _labelled(
                    'Longitude',
                    TextFormField(
                      controller: _longitudeController,
                      style: kAdvBody,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true, signed: true),
                      decoration: _fieldDecoration(hint: 'e.g. 77.21'),
                      validator: (v) =>
                          (v == null || v.isEmpty) ? 'Longitude required' : null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _labelled(
                    'Timezone',
                    TextFormField(
                      controller: _timezoneController,
                      style: kAdvBody,
                      decoration: _fieldDecoration(hint: 'e.g. Asia/Kolkata'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            AdvPrimaryButton(
              onPressed: _submitPrashna,
              icon: Icons.flare_rounded,
              label: 'Cast Prashna Chart',
            ),
          ],
        ),
    );
  }

  ExplanationContext _buildExplanationContext(PrashnaChartModel result) {
    return ExplanationContext(
      feature: 'prashna',
      screenTitle: 'Prashna (Horary Astrology)',
      purpose: 'Explain the Prashna Lagna (${result.prashnaLagna.rashiName}), Chandra mind indicator (${result.chandra.rashiName}), and query outcome indicators.',
      astrologyData: {
        'questionText': result.questionText,
        'prashnaLagna': {
          'sign': result.prashnaLagna.rashiName,
          'degree': result.prashnaLagna.formattedDegree,
          'lord': result.prashnaLagna.lord,
        },
        'chandraMind': {
          'sign': result.chandra.rashiName,
          'house': result.chandra.house,
          'nakshatra': result.chandra.nakshatraName,
        },
        'sphutas': {
          'gulika': result.sphutas.gulika.rashiName,
          'trisphuta': result.sphutas.trisphuta.rashiName,
        },
      },
      importantValues: {
        'prashnaLagna': result.prashnaLagna.rashiName,
        'chandraHouse': result.chandra.house,
      },
    );
  }

  Widget _buildResultView(PrashnaChartModel result) {
    final lagna = result.prashnaLagna;
    final moon = result.chandra;
    final sphutas = result.sphutas;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. AT-A-GLANCE SUMMARY
        AdvSummaryCard(
          label: 'Your question',
          icon: Icons.psychology_rounded,
          title: result.questionText ?? 'Horary Question Analysis',
          subtitle: 'Cast: ${result.timeDetails.formattedLocalTime} • ${result.location.placeName}',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AdvStatGrid(
                onDark: true,
                stats: [
                  AdvStat(label: 'Prashna Lagna', value: lagna.rashiName, accent: AppColors.gold),
                  AdvStat(label: 'Moon house', value: 'House ${moon.house}'),
                ],
              ),
              if (result.questionNumberDetails != null) ...[
                const SizedBox(height: 12),
                AdvBadge.now(
                  'Seed Number: ${result.questionNumberDetails!.number} (${result.questionNumberDetails!.system})',
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: kAdvGap),

        // Sushil Sir Explainer Button
        SushilExplainerButton(
          contextBuilder: () => _buildExplanationContext(result),
          poseAsset: AppAssets.sushilGuiding,
        ),

        const SizedBox(height: kAdvGap),
        AdvSection(
          title: 'Prashna Lagna (Horary Ascendant)',
          subtitle: 'The primary anchor point and physical reality of the query',
          icon: Icons.explore_rounded,
          tint: AstroTint.indigo,
          child: Column(
            children: [
              AdvInfoRow(
                label: 'Ascendant Sign',
                value: lagna.rashiName,
                emphasize: true,
              ),
              AdvInfoRow(
                label: 'Exact Degree',
                value: lagna.formattedDegree,
              ),
              AdvInfoRow(
                label: 'Ascendant Lord (Lagnesha)',
                value: lagna.lord,
              ),
              AdvInfoRow(
                label: 'Nakshatra & Pada',
                value: '${lagna.nakshatraName} (P${lagna.pada})',
                showDivider: false,
              ),
            ],
          ),
        ),
        const SizedBox(height: kAdvGap),
        AdvSection(
          title: 'Chandra (Moon Position & Query Mind)',
          subtitle: 'Reflects querent mental intention and ultimate fruition',
          icon: Icons.nightlight_round,
          tint: AstroTint.sky,
          child: Column(
            children: [
              AdvInfoRow(
                label: 'Moon Sign (Chandra Rashi)',
                value: moon.rashiName,
                emphasize: true,
              ),
              AdvInfoRow(
                label: 'Moon House from Lagna',
                value: 'House ${moon.house}',
              ),
              AdvInfoRow(
                label: 'Moon Nakshatra & Pada',
                value: '${moon.nakshatraName} (P${moon.pada})',
              ),
              AdvInfoRow(
                label: 'Moon Lord',
                value: moon.lord,
                showDivider: false,
              ),
            ],
          ),
        ),
        const SizedBox(height: kAdvGap),
        AdvDetailsExpander(
          title: 'Classical Horary Sphutas (Sensitive Points)',
          subtitle: 'Traditional Parashari mathematical points for Prashna validation',
          icon: Icons.flare_rounded,
          child: Column(
            children: [
              AdvInfoRow(
                label: 'Gulika / Mandi',
                value: '${sphutas.gulika.rashiName} (${sphutas.gulika.formattedDegree})',
              ),
              AdvInfoRow(
                label: 'Trisphuta (Lagna + Moon + Gulika)',
                value: '${sphutas.trisphuta.rashiName} (${sphutas.trisphuta.formattedDegree})',
              ),
              AdvInfoRow(
                label: 'Chatusphuta (+ Sun)',
                value: '${sphutas.chatusphuta.rashiName} (${sphutas.chatusphuta.formattedDegree})',
              ),
              AdvInfoRow(
                label: 'Panchasphuta (+ Rahu)',
                value: '${sphutas.panchasphuta.rashiName} (${sphutas.panchasphuta.formattedDegree})',
                showDivider: false,
              ),
            ],
          ),
        ),
        if (result.panchanga != null) ...[
          const SizedBox(height: 12),
          AdvDetailsExpander(
            title: 'Moment Panchanga',
            subtitle: 'Cosmic climate when the query was initiated',
            icon: Icons.wb_twilight_rounded,
            child: Column(
              children: [
                AdvInfoRow(
                  label: 'Tithi',
                  value: result.panchanga!.tithiName,
                ),
                AdvInfoRow(
                  label: 'Vara (Weekday)',
                  value: result.panchanga!.varaName,
                ),
                AdvInfoRow(
                  label: 'Yoga',
                  value: result.panchanga!.yogaName,
                ),
                AdvInfoRow(
                  label: 'Karana',
                  value: result.panchanga!.karanaName,
                ),
                AdvInfoRow(
                  label: 'Rahu Kala Active',
                  value: result.panchanga!.isRahuKala ? 'YES (Inauspicious)' : 'NO',
                  showDivider: false,
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        AdvSecondaryButton(
          onPressed: () {
            ref.read(prashnaProvider.notifier).clear();
          },
          icon: Icons.add_comment_rounded,
          label: 'Cast Another Prashna',
        ),
      ],
    );
  }
}
