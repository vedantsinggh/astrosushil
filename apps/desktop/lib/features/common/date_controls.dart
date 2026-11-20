import 'package:flutter/material.dart';

/// `YYYY-MM-DD` of a civil date (no time zone maths; labels only).
String ymd(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Parses `YYYY-MM-DD` strictly; null when invalid.
DateTime? parseYmd(String s) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(s.trim());
  if (m == null) return null;
  final d = DateTime.utc(int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
  return ymd(d) == s.trim() ? d : null;
}

/// Compact labelled `YYYY-MM-DD` field that reports only valid dates.
class DateField extends StatefulWidget {
  const DateField({super.key, required this.label, required this.value, required this.onChanged, this.width = 150});
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final double width;

  @override
  State<DateField> createState() => _DateFieldState();
}

class _DateFieldState extends State<DateField> {
  late final TextEditingController _c = TextEditingController(text: widget.value);
  String? _error;

  @override
  void didUpdateWidget(DateField old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value && _c.text != widget.value) _c.text = widget.value;
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _submit(String v) {
    final ok = parseYmd(v) != null;
    setState(() => _error = ok ? null : 'YYYY-MM-DD');
    if (ok) widget.onChanged(v.trim());
  }

  @override
  Widget build(BuildContext context) => SizedBox(
        width: widget.width,
        child: TextField(
          controller: _c,
          decoration: InputDecoration(labelText: widget.label, errorText: _error, isDense: true),
          onSubmitted: _submit,
          onTapOutside: (_) => _submit(_c.text),
        ),
      );
}

/// Formats an ISO instant at a fixed UTC offset as `YYYY-MM-DD HH:mm` (display only).
String isoLocal(String? iso, int offsetMinutes, {bool seconds = false}) {
  if (iso == null) return '—';
  final t = DateTime.tryParse(iso);
  if (t == null) return iso;
  final l = t.toUtc().add(Duration(minutes: offsetMinutes));
  String p(int n) => n.toString().padLeft(2, '0');
  return '${ymd(l)} ${p(l.hour)}:${p(l.minute)}${seconds ? ':${p(l.second)}' : ''}';
}
