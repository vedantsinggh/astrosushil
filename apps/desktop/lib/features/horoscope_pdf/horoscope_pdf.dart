import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../src/charts/chart_data.dart';
import '../../src/charts/chart_geometry.dart';
import '../../src/engine/models.dart';
import '../../src/print/chart_pdf.dart' show latin1Safe, pdfChart;
import '../../src/util/format.dart';
import '../common/engine_call.dart';
import 'horoscope_data.dart';

const _navy = PdfColor.fromInt(0xFF121440);
const _gold = PdfColor.fromInt(0xFFB45309);
const _muted = PdfColor.fromInt(0xFF5B5E7A);
const _border = PdfColor.fromInt(0xFFE2DACB);
const _headerFill = PdfColor.fromInt(0xFFF3EDE2);

/// Options for [buildHoroscopePdf].
class HoroscopePdfOptions {
  const HoroscopePdfOptions({this.style = ChartStyle.north, this.sections = const {...HoroscopeSection.values}, this.format = PdfPageFormat.a4});
  final ChartStyle style;
  final Set<HoroscopeSection> sections;
  final PdfPageFormat format;
}

/// Bhava Chalit drawing: each graha is placed in the cell of the bhava number the engine assigned
/// it (cell of bhava N = N-th sign counted from the Lagna sign). Layout only, no calculation.
ChartData bhavaChartData(String title, NormalizedChartModel c) {
  final asc = c.ascendant.rashiIndex;
  int cellOf(int house) => ((asc - 1 + house - 1) % 12) + 1;
  final m = <int, List<ChartBody>>{
    asc: [const ChartBody('As', highlight: true, code: 'LAGNA')],
  };
  for (final name in planetOrder) {
    final p = c.planets.where((x) => x.name == name).firstOrNull;
    if (p == null) continue;
    m.putIfAbsent(cellOf(p.house), () => []).add(ChartBody(abbr(p.name), retrograde: p.retrograde, code: p.name));
  }
  return ChartData(title: title, ascSign: asc, bodies: m);
}

pw.Widget _title(String t) => pw.Padding(
      padding: const pw.EdgeInsets.only(top: 6, bottom: 4),
      child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
        pw.Text(latin1Safe(t), style: const pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: _navy)),
        pw.Container(height: 1, width: 48, color: _gold, margin: const pw.EdgeInsets.only(top: 2)),
      ]),
    );

pw.Widget _kv(List<(String, String)> items, {double keyWidth = 95}) => pw.Table(
      columnWidths: {0: pw.FixedColumnWidth(keyWidth), 1: const pw.FlexColumnWidth()},
      children: [
        for (final (k, v) in items)
          pw.TableRow(children: [
            pw.Padding(padding: const pw.EdgeInsets.symmetric(vertical: 1.6), child: pw.Text(latin1Safe(k), style: const pw.TextStyle(fontSize: 8, color: _muted))),
            pw.Padding(padding: const pw.EdgeInsets.symmetric(vertical: 1.6), child: pw.Text(latin1Safe(v), style: const pw.TextStyle(fontSize: 8))),
          ]),
      ],
    );

pw.Widget _table(List<String> header, List<List<String>> rows, {double fontSize = 7.5, Map<int, pw.TableColumnWidth>? widths}) => pw.TableHelper.fromTextArray(
      headers: header.map(latin1Safe).toList(),
      data: [for (final r in rows) r.map(latin1Safe).toList()],
      columnWidths: widths,
      headerStyle: pw.TextStyle(fontSize: fontSize, fontWeight: pw.FontWeight.bold, color: _navy),
      cellStyle: pw.TextStyle(fontSize: fontSize),
      headerDecoration: const pw.BoxDecoration(color: _headerFill),
      border: const pw.TableBorder(horizontalInside: pw.BorderSide(color: _border, width: 0.4), bottom: pw.BorderSide(color: _border, width: 0.4)),
      cellPadding: const pw.EdgeInsets.symmetric(horizontal: 3, vertical: 1.8),
    );

String _span(PanchangElement e, int off) => e.end == null ? '' : ' (ends ${localDateTime(e.end!, off)})';

/// Full A4 multi-page horoscope: cover with birth data, panchanga and Avakhada; D1/D9/D10 and
/// Bhava Chalit (Sripati) charts; planet and house tables; Vimshottari (MD + AD) and Yogini
/// dashas; Shadbala summary. Every value is engine output; this only lays it out.
Future<Uint8List> buildHoroscopePdf(HoroscopeData d, {HoroscopePdfOptions options = const HoroscopePdfOptions()}) async {
  final b = d.birth;
  final c = d.chart;
  final off = c.utcOffsetMinutes;
  final a = c.rasi.ascendant;
  final p = c.panchang;
  final s = options.sections;
  final name = b.name ?? 'Untitled chart';
  final doc = pw.Document(title: latin1Safe('Horoscope - $name'), creator: 'Astro Sushil Desktop', author: 'Astro Sushil Desktop');

  final blocks = <List<pw.Widget>>[];

  if (s.contains(HoroscopeSection.basics)) {
    blocks.add([
      pw.SizedBox(height: 8),
      pw.Text(latin1Safe(name), style: const pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: _navy)),
      pw.Text('Horoscope', style: const pw.TextStyle(fontSize: 11, color: _muted)),
      _title('Birth data'),
      _kv([
        ('Date / time', '${b.date} ${b.time} (${offsetLabel(off)})'),
        ('Time zone', b.timezone),
        ('Place', b.placeName ?? '-'),
        ('Coordinates', latLon(b.latitude, b.longitude)),
        ('UTC', localDateTime(c.utc, 0)),
        ('Julian day (UT)', c.julianDayUT.toStringAsFixed(5)),
        ('Ayanamsa', '${ayanamsaShort(c.ayanamsaName)} ${dms(c.ayanamsa)}'),
        ('House system / nodes', '${houseSystemLabel(c.houseSystem)} / ${nodeLabel(c.nodeCalculation)}'),
        ('Lagna', '${a.sign} ${dms(a.degree)} - ${a.nakshatra} pada ${a.pada} (lord ${a.lord})'),
        ('Day / night birth', c.isDayBirth ? 'Day (between sunrise and sunset)' : 'Night'),
      ]),
      _title('Panchanga at birth'),
      _kv([
        ('Tithi', '${p.tithi.name}, ${titleCase(p.tithi.extra ?? '')}${_span(p.tithi, off)}'),
        ('Vara', '${p.vara.name}${p.vara.extra == null ? '' : ' (lord ${titleCase(p.vara.extra!)})'}'),
        ('Nakshatra', '${p.nakshatra.name} pada ${p.nakshatra.pada ?? ''}${_span(p.nakshatra, off)}'),
        ('Yoga', '${p.yoga.name}${_span(p.yoga, off)}'),
        ('Karana', '${p.karana.name}${_span(p.karana, off)}'),
        ('Masa', '${p.amantaMasa ?? '-'} (amanta) / ${p.purnimantaMasa ?? '-'} (purnimanta)${p.isAdhika ? ' - Adhika' : ''}'),
      ]),
      if (d.avakhada.isNotEmpty) ...[
        _title('Avakhada Chakra'),
        _kv([
          for (final (k, label) in avakhadaFields)
            if (d.avakhada[k] != null) (label, k.endsWith('Lord') ? titleCase(asStr(d.avakhada[k])) : asStr(d.avakhada[k])),
        ]),
      ],
    ]);
  }

  if (s.contains(HoroscopeSection.charts) || s.contains(HoroscopeSection.bhavaChalit)) {
    final charts = <pw.Widget>[
      if (s.contains(HoroscopeSection.charts)) ...[
        pdfChart(ChartData.fromNormalized('Rasi (D1)', c.rasi), options.style, 235),
        pdfChart(ChartData.fromVarga(d.d9).withTitle('Navamsa (D9)'), options.style, 235),
        pdfChart(ChartData.fromVarga(d.d10).withTitle('Dasamsa (D10)'), options.style, 235),
      ],
      if (s.contains(HoroscopeSection.bhavaChalit)) pdfChart(bhavaChartData('Bhava Chalit (Sripati)', d.bhavaSripati), options.style, 235),
    ];
    blocks.add([
      _title('Charts (${options.style.label})'),
      pw.Wrap(spacing: 24, runSpacing: 14, alignment: pw.WrapAlignment.center, children: charts),
      if (s.contains(HoroscopeSection.bhavaChalit)) ...[
        _title('Bhava Chalit (Sripati) - bhava madhya and sandhi'),
        _table(const ['Bhava', 'Begins (sandhi)', 'Madhya', 'Ends (sandhi)', 'Sign', 'Lord'], [
          for (final h in d.bhavaSripati.houses)
            [
              '${h.number}',
              h.startLongitude == null ? '' : signDms(h.startLongitude!),
              signDms(h.cuspLongitude),
              h.endLongitude == null ? '' : signDms(h.endLongitude!),
              h.sign,
              titleCase(h.lord),
            ],
        ]),
      ],
    ]);
  }

  if (s.contains(HoroscopeSection.planets) || s.contains(HoroscopeSection.houses)) {
    blocks.add([
      if (s.contains(HoroscopeSection.planets)) ...[
        _title('Planetary positions (D1)'),
        _table(const ['Body', 'Longitude', 'Sign', 'Nakshatra', 'Pada', 'Nak. lord', 'House', 'Dignity', 'Retro', 'Combust'], [
          ['Lagna', signDms(a.absoluteDegree), a.sign, a.nakshatra, '${a.pada}', titleCase(a.lord), '1', '', '', ''],
          for (final x in c.rasi.planets)
            [
              planetName(x.name),
              signDms(x.absoluteDegree),
              x.sign,
              x.nakshatra,
              '${x.pada}',
              titleCase(x.nakshatraLord),
              '${x.house}',
              titleCase(x.dignity),
              x.retrograde ? 'R' : '',
              x.combust ? 'C' : '',
            ],
        ]),
      ],
      if (s.contains(HoroscopeSection.houses)) ...[
        _title('Houses (D1)'),
        _table(const ['House', 'Sign', 'Lord', 'Cusp', 'Occupants'], [
          for (final h in c.rasi.houses) ['${h.number}', h.sign, titleCase(h.lord), signDms(h.cuspLongitude), h.occupants.map(planetName).join(', ')],
        ]),
      ],
    ]);
  }

  if (s.contains(HoroscopeSection.vimshottari) && d.vimshottari.isEligible) {
    final rows = <List<String>>[];
    for (final md in d.vimshottari.periods) {
      rows.add([titleCase(md.label), '', localDate(md.start, off), localDate(md.end, off), md.durationYears.toStringAsFixed(2)]);
      for (final ad in md.children) {
        rows.add(['', titleCase(ad.label), localDate(ad.start, off), localDate(ad.end, off), ad.durationYears.toStringAsFixed(2)]);
      }
    }
    blocks.add([
      _title('Vimshottari dasha'),
      if (d.vimshottari.balanceAtBirthYears != null)
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 4),
          child: pw.Text('Balance at birth: ${d.vimshottari.balanceAtBirthYears!.toStringAsFixed(3)} years', style: const pw.TextStyle(fontSize: 8, color: _muted)),
        ),
      _table(const ['Mahadasha', 'Antardasha', 'From', 'To', 'Years'], rows, fontSize: 7.2),
    ]);
  }

  if (s.contains(HoroscopeSection.yogini) || s.contains(HoroscopeSection.shadbala)) {
    blocks.add([
      if (s.contains(HoroscopeSection.yogini) && d.yogini.isEligible) ...[
        _title('Yogini dasha (mahadashas)'),
        _table(const ['Yogini (lord)', 'From', 'To', 'Years'], [
          for (final md in d.yogini.periods) [md.label, localDate(md.start, off), localDate(md.end, off), md.durationYears.toStringAsFixed(2)],
        ]),
      ],
      if (s.contains(HoroscopeSection.shadbala) && d.strength.shadbala.isNotEmpty) ...[
        _title('Shadbala summary (shashtiamsas unless stated)'),
        _table(const ['Planet', 'Sthana', 'Dig', 'Kala', 'Cheshta', 'Naisargika', 'Drik', 'Total', 'Rupas', 'Required', 'Ratio', 'Rank'], [
          for (final r in d.strength.shadbala)
            [
              planetName(r.planet),
              fixed(r.sthana),
              fixed(r.dig),
              fixed(r.kala),
              fixed(r.cheshta),
              fixed(r.naisargika),
              fixed(r.drik),
              fixed(r.total),
              fixed(r.rupas),
              fixed(r.required),
              fixed(r.ratio),
              '${r.rank}',
            ],
        ]),
      ],
    ]);
  }

  final content = <pw.Widget>[];
  for (var i = 0; i < blocks.length; i++) {
    if (i > 0) content.add(pw.NewPage());
    content.addAll(blocks[i]);
  }
  if (content.isEmpty) content.add(pw.Text('No sections selected.', style: const pw.TextStyle(fontSize: 10, color: _muted)));

  doc.addPage(pw.MultiPage(
    pageFormat: options.format,
    margin: const pw.EdgeInsets.fromLTRB(32, 28, 32, 28),
    header: (ctx) => pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 4),
      margin: const pw.EdgeInsets.only(bottom: 6),
      decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: _border, width: 0.6))),
      child: pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
        pw.Text('Astro Sushil Desktop', style: const pw.TextStyle(fontSize: 9, color: _navy, fontWeight: pw.FontWeight.bold)),
        pw.Text(latin1Safe('Horoscope - $name - ${b.date} ${b.time}'), style: const pw.TextStyle(fontSize: 8, color: _muted)),
      ]),
    ),
    footer: (ctx) => pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
      pw.Text(latin1Safe('Engine ${c.engineVersion} - ${ayanamsaShort(c.ayanamsaName)} ayanamsa - ${nodeLabel(c.nodeCalculation)} - calculated by the local engine'),
          style: const pw.TextStyle(fontSize: 6.5, color: _muted)),
      pw.Text('Page ${ctx.pageNumber} of ${ctx.pagesCount}', style: const pw.TextStyle(fontSize: 6.5, color: _muted)),
    ]),
    build: (ctx) => content,
  ));
  return doc.save();
}

extension on ChartData {
  ChartData withTitle(String t) => ChartData(title: t, ascSign: ascSign, bodies: bodies, subtitle: subtitle);
}
