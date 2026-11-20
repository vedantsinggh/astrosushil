import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../engine/inputs.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/input_parsing.dart';
import 'birth_form.dart';

/// Date/time/place selector for transit, panchang and prashna moments.
///
/// The step buttons (±1 day, ±1 hour) update the fields at once and recalculate after a short
/// pause, so clicking several times only asks the engine once.
class MomentBar extends ConsumerStatefulWidget {
  const MomentBar({super.key, required this.value, required this.onChanged, this.label = 'Moment', this.debounce = const Duration(milliseconds: 350)});
  final BirthInput value;
  final ValueChanged<BirthInput> onChanged;
  final String label;
  final Duration debounce;

  @override
  ConsumerState<MomentBar> createState() => _MomentBarState();
}

class _MomentBarState extends ConsumerState<MomentBar> {
  late final TextEditingController date = TextEditingController(text: widget.value.date);
  late final TextEditingController time = TextEditingController(text: widget.value.time);
  Timer? _debounce;
  String? _error;

  @override
  void didUpdateWidget(MomentBar old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value && !(_debounce?.isActive ?? false)) {
      date.text = widget.value.date;
      time.text = widget.value.time;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    date.dispose();
    time.dispose();
    super.dispose();
  }

  BirthInput? _parsed() {
    final d = parseDateInput(date.text), t = parseTimeInput(time.text);
    setState(() => _error = d.error ?? t.error);
    if (!d.isOk || !t.isOk) return null;
    return widget.value.copyWith(date: d.value, time: t.value);
  }

  void _apply() {
    _debounce?.cancel();
    final m = _parsed();
    if (m != null) widget.onChanged(m);
  }

  void _step(Duration delta) {
    final m = _parsed();
    if (m == null) return;
    final dt = DateTime.parse('${m.date}T${m.time}').add(delta);
    date.text = DateFormat('yyyy-MM-dd').format(dt);
    time.text = DateFormat('HH:mm:ss').format(dt);
    _debounce?.cancel();
    _debounce = Timer(widget.debounce, _apply);
  }

  Future<void> _now() async {
    final engine = await ref.read(calcEngineProvider.future);
    final now = await engine.localTime(widget.value.timezone);
    date.text = now.date;
    time.text = now.time;
    widget.onChanged(widget.value.copyWith(date: now.date, time: now.time));
  }

  Future<void> _place() async {
    final r = await showBirthForm(context, initial: widget.value, title: '${widget.label}: date, time and place', askName: false, submitLabel: 'Apply');
    if (r != null) widget.onChanged(r.birth.copyWith(name: widget.value.name));
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    Widget step(String tip, IconData icon, Duration d) => IconButton(tooltip: tip, onPressed: () => _step(d), icon: Icon(icon, size: 20), visualDensity: VisualDensity.compact);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: pal.card, border: Border.all(color: pal.border), borderRadius: BorderRadius.circular(10)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Text(widget.label, style: TextStyle(fontWeight: FontWeight.w700, color: pal.heading)),
          const SizedBox(width: 4),
          step('One day earlier', Icons.keyboard_double_arrow_left_rounded, const Duration(days: -1)),
          step('One hour earlier', Icons.chevron_left_rounded, const Duration(hours: -1)),
          SizedBox(width: 140, child: TextField(key: const Key('moment-date'), controller: date, decoration: const InputDecoration(labelText: 'Date', isDense: true), onSubmitted: (_) => _apply())),
          SizedBox(width: 110, child: TextField(key: const Key('moment-time'), controller: time, decoration: const InputDecoration(labelText: 'Time', isDense: true), onSubmitted: (_) => _apply())),
          step('One hour later', Icons.chevron_right_rounded, const Duration(hours: 1)),
          step('One day later', Icons.keyboard_double_arrow_right_rounded, const Duration(days: 1)),
          FilledButton.tonal(onPressed: _apply, child: const Text('Apply')),
          OutlinedButton.icon(onPressed: _now, icon: const Icon(Icons.access_time_rounded, size: 18), label: const Text('Now')),
          TextButton.icon(
            onPressed: _place,
            icon: const Icon(Icons.place_outlined, size: 18),
            label: Text('${widget.value.placeName ?? '${widget.value.latitude}, ${widget.value.longitude}'} · ${widget.value.timezone}', overflow: TextOverflow.ellipsis),
          ),
        ]),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_error!, style: TextStyle(color: pal.error, fontSize: 12.5))),
      ]),
    );
  }
}
