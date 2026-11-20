import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/engine/inputs.dart';
import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';
import '../../src/util/format.dart';
import '../common/engine_call.dart';

/// A body on the wheel: engine longitude only (no calculation here).
class WheelBody {
  const WheelBody(this.label, this.longitude, {this.retrograde = false});
  final String label;
  final double longitude;
  final bool retrograde;
}

/// Circular (wheel) chart: the 12 sidereal signs as a ring with the Lagna on the left (eastern
/// horizon), bodies at their engine longitudes, and whole-sign house numbers. Display only.
class ChartWheelPainter extends CustomPainter {
  ChartWheelPainter({required this.ascendant, required this.bodies, required this.palette, required this.textStyle});
  final double ascendant;
  final List<WheelBody> bodies;
  final AppPalette palette;
  final TextStyle textStyle;

  /// Screen angle (radians) for a zodiac longitude: Lagna at 9 o'clock; later signs run anticlockwise (down through houses 2-3).
  double _angle(double lon) => math.pi + (lon - ascendant) * math.pi / 180;

  void _text(Canvas c, String s, Offset at, TextStyle st) {
    final tp = TextPainter(text: TextSpan(text: s, style: st), textDirection: TextDirection.ltr)..layout();
    tp.paint(c, at - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  void paint(Canvas canvas, Size size) {
    final ctr = size.center(Offset.zero);
    final r = size.shortestSide / 2 - 4;
    final rSign = r * 0.86, rHouse = r * 0.62, rInner = r * 0.30;
    final line = Paint()
      ..color = palette.chartLine
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawCircle(ctr, r, Paint()..color = palette.chartBg);
    for (final rr in [r, rSign, rHouse, rInner]) {
      canvas.drawCircle(ctr, rr, line);
    }
    Offset at(double lon, double rad) => ctr + Offset(math.cos(_angle(lon)), -math.sin(_angle(lon))) * rad;
    // sign boundaries and names
    for (var i = 0; i < 12; i++) {
      canvas.drawLine(at(i * 30.0, rSign), at(i * 30.0, r), line);
      _text(canvas, signShort[i], at(i * 30.0 + 15, (r + rSign) / 2), textStyle.copyWith(fontWeight: FontWeight.w700, color: palette.heading));
    }
    // whole-sign houses: house n = sign of the Lagna + n - 1
    final ascSign = (ascendant ~/ 30) % 12;
    for (var h = 0; h < 12; h++) {
      final s = (ascSign + h) % 12;
      canvas.drawLine(at(s * 30.0, rInner), at(s * 30.0, rHouse), line..color = palette.border);
      _text(canvas, '${h + 1}', at(s * 30.0 + 15, (rHouse + rInner) / 2), textStyle.copyWith(color: palette.textMuted, fontSize: 11));
    }
    // Lagna axis
    canvas.drawLine(at(ascendant, rInner), at(ascendant, r), Paint()
      ..color = palette.accent
      ..strokeWidth = 2.2);
    _text(canvas, 'Asc ${signDms(ascendant)}', at(ascendant, rInner * 0.55), textStyle.copyWith(fontSize: 10.5, color: palette.accentText));
    // bodies, spread when close
    final sorted = [...bodies]..sort((a, b) => a.longitude.compareTo(b.longitude));
    final placed = <double>[];
    for (final b in sorted) {
      var lon = b.longitude;
      while (placed.any((p) => (((lon - p) % 360) + 360) % 360 < 7)) {
        lon += 7;
      }
      placed.add(lon);
      canvas.drawLine(at(b.longitude, rSign), at(b.longitude, rSign - 6), Paint()
        ..color = b.retrograde ? palette.retro : palette.chartLine
        ..strokeWidth = 2);
      _text(canvas, '${b.label}${b.retrograde ? ' R' : ''}', at(lon, (rSign + rHouse) / 2), textStyle.copyWith(color: b.retrograde ? palette.retro : palette.text, fontWeight: FontWeight.w600));
    }
  }

  @override
  bool shouldRepaint(ChartWheelPainter old) => old.ascendant != ascendant || old.bodies != bodies || old.palette != palette;
}

class ChartWheel extends StatelessWidget {
  const ChartWheel({super.key, required this.ascendant, required this.bodies, this.size = 420});
  final double ascendant;
  final List<WheelBody> bodies;
  final double size;
  @override
  Widget build(BuildContext context) => SizedBox.square(
        dimension: size,
        child: CustomPaint(painter: ChartWheelPainter(ascendant: ascendant, bodies: bodies, palette: context.palette, textStyle: Theme.of(context).textTheme.bodySmall!.copyWith(fontSize: 12))),
      );
}

/// Wheel view of the natal Rasi chart (from `chart.compute`).
class ChartWheelScreen extends ConsumerWidget {
  const ChartWheelScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncView(
        value: ref.watch(engineCallProvider(EngineCall('chart.compute', {'birth': birth.toJson()}))),
        builder: (j) {
          final rasi = asMap(j['rasi']);
          final asc = asDouble(asMap(rasi['ascendant'])['absoluteDegree']) ?? 0;
          final bodies = [
            for (final p in asMapList(rasi['planets'])) WheelBody(abbr(asStr(p['name'])), asDouble(p['absoluteDegree']) ?? 0, retrograde: p['retrograde'] == true && p['name'] != 'RAHU' && p['name'] != 'KETU'),
          ];
          return PageBody(children: [
            SectionCard(
              title: 'Rasi chart (wheel)',
              subtitle: 'Sidereal signs; Lagna on the left (eastern horizon); house numbers are whole-sign houses.',
              child: Center(child: LayoutBuilder(builder: (context, c) => ChartWheel(ascendant: asc, bodies: bodies, size: math.min(560, c.maxWidth)))),
            ),
          ]);
        },
      );
}
