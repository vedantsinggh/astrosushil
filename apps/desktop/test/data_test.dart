import 'dart:io';

import 'package:astro_desktop/src/data/chart_file.dart';
import 'package:astro_desktop/src/data/city_index.dart';
import 'package:astro_desktop/src/data/recent_charts.dart';
import 'package:astro_desktop/src/engine/inputs.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

const birth = BirthInput(name: 'Test', date: '1990-05-15', time: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, placeName: 'New Delhi');

void main() {
  late Directory tmp;
  setUp(() => tmp = Directory.systemTemp.createTempSync('astro_desktop_test'));
  tearDown(() => tmp.deleteSync(recursive: true));

  test('chart file round-trips and records its path', () async {
    final path = p.join(tmp.path, 'a.aschart');
    final saved = await ChartFile(birth: birth, notes: 'n', gender: 'F').saveTo(path);
    expect(saved.path, path);
    final loaded = await ChartFile.load(path);
    expect(loaded.birth, birth);
    expect(loaded.notes, 'n');
    expect(loaded.gender, 'F');
  });

  test('rejects foreign or newer files', () {
    expect(() => ChartFile.fromJson({'format': 'other', 'version': 1}), throwsFormatException);
    expect(() => ChartFile.fromJson({'format': ChartFile.formatId, 'version': 999, 'birth': birth.toJson()}), throwsFormatException);
  });

  test('recent charts: most recent first, deduplicated, limited', () async {
    final r = RecentCharts(File(p.join(tmp.path, 'sub', 'recent.json')), limit: 3);
    expect(await r.load(), isEmpty);
    await r.add('/a');
    await r.add('/b');
    await r.add('/a');
    expect(await r.load(), ['/a', '/b']);
    await r.add('/c');
    await r.add('/d');
    expect(await r.load(), ['/d', '/c', '/a']);
    expect(await r.remove('/c'), ['/d', '/a']);
  });

  test('city index search over the bundled GeoNames asset', () {
    final idx = CityIndex.parse(File('assets/geo/cities.tsv').readAsStringSync());
    expect(idx.cities.length, greaterThan(30000));
    final pune = idx.search('pune').first;
    expect(pune.timezone, 'Asia/Kolkata');
    expect(pune.latitude, closeTo(18.52, 0.1));
    final ny = idx.search('new york').first;
    expect(ny.timezone, 'America/New_York');
    expect(idx.search('sao paulo').first.name, 'São Paulo');
    expect(idx.search('springfield, illinois').first.region, 'Illinois');
    expect(idx.search('x'), isEmpty);
  });
}
