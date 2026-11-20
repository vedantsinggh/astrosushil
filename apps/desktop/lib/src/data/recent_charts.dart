import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

/// Most-recently-used chart file list, persisted as JSON in the app support directory.
class RecentCharts {
  RecentCharts(this.storeFile, {this.limit = 12});
  final File storeFile;
  final int limit;

  Future<List<String>> load() async {
    try {
      if (!await storeFile.exists()) return [];
      final j = jsonDecode(await storeFile.readAsString());
      if (j is! List) return [];
      return j.whereType<String>().toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<String>> add(String path) async {
    final list = (await load())..removeWhere((e) => p.equals(e, path));
    list.insert(0, path);
    final trimmed = list.take(limit).toList();
    await _save(trimmed);
    return trimmed;
  }

  Future<List<String>> remove(String path) async {
    final list = (await load())..removeWhere((e) => p.equals(e, path));
    await _save(list);
    return list;
  }

  Future<void> _save(List<String> list) async {
    await storeFile.parent.create(recursive: true);
    await storeFile.writeAsString(jsonEncode(list));
  }
}
