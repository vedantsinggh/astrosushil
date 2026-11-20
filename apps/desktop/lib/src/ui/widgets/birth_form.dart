import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/city_index.dart';
import '../../engine/inputs.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../../util/input_parsing.dart';

class BirthFormResult {
  const BirthFormResult(this.birth, {this.gender, this.notes = ''});
  final BirthInput birth;
  final String? gender;
  final String notes;
}

/// Birth / event data entry with offline place search.
Future<BirthFormResult?> showBirthForm(
  BuildContext context, {
  BirthInput? initial,
  String? gender,
  String notes = '',
  String title = 'Birth details',
  bool askName = true,
  String submitLabel = 'OK',
}) =>
    showDialog<BirthFormResult>(
      context: context,
      barrierDismissible: false,
      builder: (_) => BirthFormDialog(initial: initial, gender: gender, notes: notes, title: title, askName: askName, submitLabel: submitLabel),
    );

/// Validators kept for callers that only need yes/no (plain-language messages).
String? validateDate(String? v) => parseDateInput(v).error;
String? validateTime(String? v) => parseTimeInput(v).error;
String? validateCoord(String? v, double limit) =>
    parseCoordinate(v, latitude: limit <= 90) == null ? (limit <= 90 ? 'Latitude must be between 90 S and 90 N, e.g. 28.61 or 28.61 N.' : 'Longitude must be between 180 W and 180 E, e.g. 77.21 or 77.21 E.') : null;

class BirthFormDialog extends ConsumerStatefulWidget {
  const BirthFormDialog({super.key, this.initial, this.gender, this.notes = '', required this.title, this.askName = true, this.submitLabel = 'OK'});
  final BirthInput? initial;
  final String? gender;
  final String notes;
  final String title;
  final bool askName;
  final String submitLabel;

  @override
  ConsumerState<BirthFormDialog> createState() => _BirthFormDialogState();
}

class _BirthFormDialogState extends ConsumerState<BirthFormDialog> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController name, date, time, lat, lon, tz, place, notes;
  TextEditingController? _search;
  FocusNode? _searchFocus;
  String? gender;
  bool _submitted = false;
  bool _advanced = false;

  @override
  void initState() {
    super.initState();
    final b = widget.initial;
    final last = b == null ? ref.read(prefsProvider).lastPlace : null;
    name = TextEditingController(text: b?.name ?? '');
    date = TextEditingController(text: b == null ? '' : _displayDate(b.date));
    time = TextEditingController(text: b?.time ?? '');
    lat = TextEditingController(text: b?.latitude.toString() ?? (last?['latitude']?.toString() ?? ''));
    lon = TextEditingController(text: b?.longitude.toString() ?? (last?['longitude']?.toString() ?? ''));
    tz = TextEditingController(text: b?.timezone ?? (last?['timezone'] as String? ?? ''));
    place = TextEditingController(text: b?.placeName ?? (last?['placeName'] as String? ?? ''));
    notes = TextEditingController(text: widget.notes);
    gender = widget.gender;
    for (final c in [date, time]) {
      c.addListener(() => setState(() {}));
    }
  }

  /// Shows a stored ISO date in the user's chosen format (it parses back unambiguously).
  String _displayDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    final style = ref.read(prefsProvider).dateStyle;
    return DateFormat(style == DateStyle.monthFirst ? 'dd MMM yyyy' : style.pattern).format(d);
  }

  @override
  void dispose() {
    for (final c in [name, date, time, lat, lon, tz, place, notes]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _placeValid =>
      parseCoordinate(lat.text, latitude: true) != null && parseCoordinate(lon.text, latitude: false) != null && _tzError(tz.text) == null;

  String? _tzError(String? v) {
    final s = (v ?? '').trim();
    if (s.isEmpty) return 'Choose a place above, or enter a time zone such as Asia/Kolkata.';
    if (!(s.contains('/') || s == 'UTC')) return 'Use a time zone name such as Asia/Kolkata or Europe/London.';
    return null;
  }

  void _pickCity(City c) {
    setState(() {
      place.text = c.label;
      lat.text = c.latitude.toStringAsFixed(4);
      lon.text = c.longitude.toStringAsFixed(4);
      tz.text = c.timezone;
    });
    if (_submitted) _form.currentState?.validate();
  }

  Future<void> _pickDate() async {
    final parsed = parseDateInput(date.text);
    final init = (parsed.isOk ? DateTime.tryParse(parsed.value!) : null) ?? DateTime(1990, 1, 1);
    final d = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: DateTime(minYear),
      lastDate: DateTime(maxYear, 12, 31),
      initialEntryMode: DatePickerEntryMode.calendar,
      helpText: 'Select the date',
    );
    if (d != null) date.text = DateFormat('dd MMM yyyy').format(d);
  }

  Future<void> _pickTime() async {
    final parsed = parseTimeInput(time.text);
    final parts = parsed.isOk ? parsed.value!.split(':').map(int.parse).toList() : [12, 0];
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: parts[0], minute: parts[1]),
      helpText: 'Select the local time',
      builder: (ctx, child) => MediaQuery(data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true), child: child!),
    );
    if (t != null) time.text = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  void _useNow() {
    final now = DateTime.now();
    date.text = DateFormat('dd MMM yyyy').format(now);
    time.text = DateFormat('HH:mm:ss').format(now);
  }

  void _submit() {
    setState(() => _submitted = true);
    final ok = _form.currentState!.validate();
    if (!ok) {
      if (!_placeValid && _search != null && _search!.text.trim().isEmpty && (lat.text.isNotEmpty || lon.text.isNotEmpty)) setState(() => _advanced = true);
      return;
    }
    final placeName = place.text.trim().isEmpty ? null : place.text.trim();
    final birth = BirthInput(
      name: widget.askName ? (name.text.trim().isEmpty ? null : name.text.trim()) : widget.initial?.name,
      date: parseDateInput(date.text).value!,
      time: parseTimeInput(time.text).value!,
      timezone: tz.text.trim(),
      latitude: parseCoordinate(lat.text, latitude: true)!,
      longitude: parseCoordinate(lon.text, latitude: false)!,
      placeName: placeName,
    );
    ref.read(prefsProvider.notifier).update((p) => p.copyWith(lastPlace: birth.location.toJson()));
    Navigator.of(context).pop(BirthFormResult(birth, gender: gender, notes: notes.text));
  }

  InputDecoration _dec(String label, {String? hint, String? helper, Widget? suffix, Widget? prefix}) => InputDecoration(
        labelText: label,
        hintText: hint,
        helperText: helper,
        suffixIcon: suffix,
        prefixIcon: prefix,
        floatingLabelBehavior: FloatingLabelBehavior.always,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      );

  Widget _heading(String text) => Padding(
        padding: const EdgeInsets.only(top: Gap.lg, bottom: Gap.sm),
        child: Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelSmall),
      );

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final cities = ref.watch(cityIndexProvider);
    final big = Theme.of(context).textTheme.bodyLarge!.copyWith(fontSize: 15.5);
    final pd = parseDateInput(date.text), pt = parseTimeInput(time.text);
    final preview = pd.isOk && pt.isOk ? '${DateFormat('EEEE, d MMMM yyyy').format(DateTime.parse(pd.value!))} at ${pt.value} local time' : null;

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.enter, control: true): _submit,
        const SingleActivator(LogicalKeyboardKey.enter, meta: true): _submit,
      },
      child: AlertDialog(
        titlePadding: const EdgeInsets.fromLTRB(28, 24, 28, 0),
        contentPadding: const EdgeInsets.fromLTRB(28, 8, 28, 8),
        actionsPadding: const EdgeInsets.fromLTRB(28, 8, 28, 20),
        title: Row(children: [
          Icon(widget.askName ? Icons.person_add_alt_1_outlined : Icons.schedule_rounded, color: pal.accentText),
          const SizedBox(width: 10),
          Expanded(child: Text(widget.title)),
        ]),
        content: SizedBox(
          width: 660,
          child: Form(
            key: _form,
            autovalidateMode: _submitted ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
            child: DefaultTextStyle.merge(
              style: big,
              child: SingleChildScrollView(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
                  if (widget.askName) ...[
                    _heading('Person'),
                    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Expanded(
                        child: TextFormField(
                          key: const Key('name'),
                          controller: name,
                          autofocus: widget.initial == null,
                          style: big,
                          textInputAction: TextInputAction.next,
                          decoration: _dec('Name', hint: 'Full name (optional)'),
                        ),
                      ),
                      const SizedBox(width: Gap.md),
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: SegmentedButton<String?>(
                          key: const Key('gender'),
                          showSelectedIcon: false,
                          style: const ButtonStyle(visualDensity: VisualDensity.standard),
                          segments: const [
                            ButtonSegment(value: 'M', label: Text('Male')),
                            ButtonSegment(value: 'F', label: Text('Female')),
                            ButtonSegment(value: null, label: Text('Not set')),
                          ],
                          selected: {gender},
                          onSelectionChanged: (s) => setState(() => gender = s.first),
                        ),
                      ),
                    ]),
                  ],
                  _heading(widget.askName ? 'Date and time of birth' : 'Date and time'),
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(
                      child: TextFormField(
                        key: const Key('date'),
                        controller: date,
                        style: big,
                        autofocus: !widget.askName,
                        validator: validateDate,
                        textInputAction: TextInputAction.next,
                        decoration: _dec('Date', hint: 'e.g. 15-05-1990 or 15 May 1990',
                            suffix: IconButton(tooltip: 'Pick from a calendar', icon: const Icon(Icons.calendar_month_outlined), onPressed: _pickDate)),
                      ),
                    ),
                    const SizedBox(width: Gap.md),
                    Expanded(
                      child: TextFormField(
                        key: const Key('time'),
                        controller: time,
                        style: big,
                        validator: validateTime,
                        textInputAction: TextInputAction.next,
                        decoration: _dec('Local time', hint: 'e.g. 14:30 or 2:30 pm',
                            suffix: IconButton(tooltip: 'Pick a time', icon: const Icon(Icons.schedule_outlined), onPressed: _pickTime)),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  Row(children: [
                    Expanded(
                      child: AnimatedSwitcher(
                        duration: Motion.fast,
                        layoutBuilder: (cur, prev) => Stack(alignment: Alignment.centerLeft, children: [...prev, if (cur != null) cur]),
                        child: Text(
                          preview ?? 'Type the date any common way; you will see how it was understood here.',
                          key: ValueKey(preview),
                          style: TextStyle(color: preview == null ? pal.textMuted : pal.success, fontSize: 12.5, fontWeight: preview == null ? FontWeight.w400 : FontWeight.w600),
                        ),
                      ),
                    ),
                    TextButton.icon(onPressed: _useNow, icon: const Icon(Icons.access_time_rounded, size: 16), label: const Text('Use now')),
                  ]),
                  _heading(widget.askName ? 'Place of birth' : 'Place'),
                  cities.when(
                    data: (index) => _placeField(index, big),
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('The place list could not be loaded: $e', style: TextStyle(color: pal.error)),
                  ),
                  const SizedBox(height: 8),
                  _PlaceSummary(place: place.text, lat: lat.text, lon: lon.text, tz: tz.text, valid: _placeValid),
                  Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      key: ValueKey('advanced-$_advanced'),
                      initiallyExpanded: _advanced,
                      onExpansionChanged: (v) => _advanced = v,
                      tilePadding: EdgeInsets.zero,
                      title: Text('Coordinates and time zone (filled in from the place)', style: TextStyle(fontSize: 13.5, color: pal.textMuted, fontWeight: FontWeight.w600)),
                      childrenPadding: const EdgeInsets.only(bottom: 8),
                      children: [
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(
                            child: TextFormField(
                              key: const Key('lat'),
                              controller: lat,
                              validator: (v) => validateCoord(v, 90),
                              onChanged: (_) => setState(() {}),
                              decoration: _dec('Latitude', hint: '28.6139 or 28.61 N'),
                            ),
                          ),
                          const SizedBox(width: Gap.md),
                          Expanded(
                            child: TextFormField(
                              key: const Key('lon'),
                              controller: lon,
                              validator: (v) => validateCoord(v, 180),
                              onChanged: (_) => setState(() {}),
                              decoration: _dec('Longitude', hint: '77.2090 or 77.21 E'),
                            ),
                          ),
                        ]),
                        const SizedBox(height: Gap.md),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(
                            child: TextFormField(
                              key: const Key('tz'),
                              controller: tz,
                              validator: _tzError,
                              onChanged: (_) => setState(() {}),
                              decoration: _dec('Time zone', hint: 'Asia/Kolkata', helper: 'Summer time and historical changes are applied automatically.'),
                            ),
                          ),
                          const SizedBox(width: Gap.md),
                          Expanded(child: TextFormField(controller: place, onChanged: (_) => setState(() {}), decoration: _dec('Place name as printed', hint: 'e.g. New Delhi, India'))),
                        ]),
                      ],
                    ),
                  ),
                  if (widget.askName) ...[
                    _heading('Notes'),
                    TextFormField(controller: notes, maxLines: 2, decoration: _dec('Notes (optional)', hint: 'Source of birth time, rectification notes…')),
                  ],
                ]),
              ),
            ),
          ),
        ),
        actions: [
          Text('Ctrl+Enter to confirm', style: TextStyle(fontSize: 12, color: pal.textMuted)),
          const SizedBox(width: 8),
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
          FilledButton(key: const Key('submit'), onPressed: _submit, child: Text(widget.submitLabel)),
        ],
      ),
    );
  }

  Widget _placeField(CityIndex index, TextStyle big) {
    final pal = context.palette;
    return Autocomplete<City>(
      displayStringForOption: (c) => c.label,
      optionsBuilder: (v) => index.search(v.text, limit: 12),
      onSelected: _pickCity,
      fieldViewBuilder: (context, ctrl, focus, onSubmit) {
        _search = ctrl;
        _searchFocus = focus;
        return TextFormField(
          key: const Key('place'),
          controller: ctrl,
          focusNode: focus,
          style: big,
          onFieldSubmitted: (_) => onSubmit(),
          validator: (_) => _placeValid ? null : 'Please choose the place from the list (type at least 2 letters), or enter coordinates below.',
          decoration: _dec(
            'Search for the town or city',
            hint: place.text.isEmpty ? 'e.g. Pune, or Springfield, Illinois' : 'Type to change: ${place.text}',
            prefix: const Icon(Icons.search_rounded),
          ),
        );
      },
      optionsViewBuilder: (context, onSelected, options) {
        final list = options.toList();
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 8,
            color: pal.card,
            shape: RoundedRectangleBorder(side: BorderSide(color: pal.border), borderRadius: BorderRadius.circular(8)),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 320, maxWidth: 604),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 4),
                shrinkWrap: true,
                itemCount: list.length,
                itemBuilder: (context, i) {
                  final c = list[i];
                  final highlighted = AutocompleteHighlightedOption.of(context) == i;
                  if (highlighted) {
                    WidgetsBinding.instance.addPostFrameCallback((_) => Scrollable.ensureVisible(context, alignment: 0.5));
                  }
                  return InkWell(
                    onTap: () => onSelected(c),
                    child: Container(
                      color: highlighted ? pal.accent.withValues(alpha: 0.16) : null,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      child: Row(children: [
                        Icon(Icons.place_outlined, size: 18, color: pal.textMuted),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(c.name, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5, color: pal.text)),
                            Text([if (c.region.isNotEmpty && c.region != c.name) c.region, c.country].join(', '), style: TextStyle(fontSize: 12.5, color: pal.textMuted)),
                          ]),
                        ),
                        Text('${c.timezone}\n${latLon(c.latitude, c.longitude)}', textAlign: TextAlign.right, style: TextStyle(fontSize: 11.5, color: pal.textMuted, fontFeatures: tabularFigures)),
                      ]),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  /// For tests: focus the place search field.
  void focusSearch() => _searchFocus?.requestFocus();
}

class _PlaceSummary extends StatelessWidget {
  const _PlaceSummary({required this.place, required this.lat, required this.lon, required this.tz, required this.valid});
  final String place, lat, lon, tz;
  final bool valid;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    if (!valid) {
      return Text('No place selected yet. Type a few letters above and pick from the list (↑ ↓ and Enter work too).', style: TextStyle(color: pal.textMuted, fontSize: 12.5));
    }
    final la = parseCoordinate(lat, latitude: true)!, lo = parseCoordinate(lon, latitude: false)!;
    return Container(
      key: const Key('place-summary'),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: pal.success.withValues(alpha: 0.08), border: Border.all(color: pal.success.withValues(alpha: 0.35)), borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Icon(Icons.check_circle_rounded, color: pal.success, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(place.isEmpty ? 'Custom coordinates' : place, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            Text('${latLon(la, lo)}  ·  $tz', style: TextStyle(color: pal.textMuted, fontSize: 12.5, fontFeatures: tabularFigures)),
          ]),
        ),
      ]),
    );
  }
}
