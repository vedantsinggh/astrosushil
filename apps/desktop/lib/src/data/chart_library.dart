import 'dart:io';

import 'package:path/path.dart' as p;

import 'chart_file.dart';

/// One saved chart known to the chart database (inputs only; nothing is computed here).
class ChartLibraryEntry {
  const ChartLibraryEntry({required this.path, required this.file, required this.modified});
  final String path;
  final ChartFile file;
  final DateTime modified;

  String get name => file.displayName;
  String get place => file.birth.placeName ?? '';
  DateTime? get birthDate => DateTime.tryParse(file.birth.date);
}

/// Sort orders for the chart database.
enum LibrarySort {
  name('Name'),
  birthDate('Birth date'),
  modified('Last changed');

  const LibrarySort(this.label);
  final String label;
}

/// Search and filter criteria (all optional).
class LibraryQuery {
  const LibraryQuery({this.text = '', this.gender, this.fromYear, this.toYear, this.sort = LibrarySort.modified, this.descending = true});
  final String text;
  final String? gender; // 'M' | 'F' | null = any
  final int? fromYear;
  final int? toYear;
  final LibrarySort sort;
  final bool descending;

  LibraryQuery copyWith({String? text, String? gender, bool clearGender = false, int? fromYear, bool clearFrom = false, int? toYear, bool clearTo = false, LibrarySort? sort, bool? descending}) =>
      LibraryQuery(
        text: text ?? this.text,
        gender: clearGender ? null : (gender ?? this.gender),
        fromYear: clearFrom ? null : (fromYear ?? this.fromYear),
        toYear: clearTo ? null : (toYear ?? this.toYear),
        sort: sort ?? this.sort,
        descending: descending ?? this.descending,
      );

  bool get isFiltered => text.trim().isNotEmpty || gender != null || fromYear != null || toYear != null;

  /// Case-insensitive match on name, place, notes and date; every word must match.
  bool matches(ChartLibraryEntry e) {
    final words = text.toLowerCase().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
    final hay = '${e.name} ${e.place} ${e.file.notes} ${e.file.birth.date} ${p.basename(e.path)}'.toLowerCase();
    if (!words.every(hay.contains)) return false;
    if (gender != null && e.file.gender != gender) return false;
    final y = e.birthDate?.year;
    if (fromYear != null && (y == null || y < fromYear!)) return false;
    if (toYear != null && (y == null || y > toYear!)) return false;
    return true;
  }

  List<ChartLibraryEntry> apply(List<ChartLibraryEntry> all) {
    final out = all.where(matches).toList();
    int cmp(ChartLibraryEntry a, ChartLibraryEntry b) => switch (sort) {
          LibrarySort.name => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
          LibrarySort.birthDate => '${a.file.birth.date} ${a.file.birth.time}'.compareTo('${b.file.birth.date} ${b.file.birth.time}'),
          LibrarySort.modified => a.modified.compareTo(b.modified),
        };
    out.sort((a, b) => descending ? cmp(b, a) : cmp(a, b));
    return out;
  }
}

/// Scans chart files: the given [files] (e.g. recent charts) plus every `*.aschart` in [folders]
/// (and their direct sub-folders). Unreadable files are skipped and counted.
class ChartLibraryScanner {
  static Future<({List<ChartLibraryEntry> entries, int skipped})> scan({List<String> files = const [], List<String> folders = const []}) async {
    final paths = <String>{};
    for (final f in files) {
      paths.add(p.normalize(f));
    }
    for (final folder in folders) {
      final dir = Directory(folder);
      if (!await dir.exists()) continue;
      try {
        await for (final e in dir.list(recursive: false, followLinks: false)) {
          if (e is File && p.extension(e.path) == '.${ChartFile.extension}') paths.add(p.normalize(e.path));
          if (e is Directory) {
            try {
              await for (final s in e.list(followLinks: false)) {
                if (s is File && p.extension(s.path) == '.${ChartFile.extension}') paths.add(p.normalize(s.path));
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    final entries = <ChartLibraryEntry>[];
    var skipped = 0;
    for (final path in paths) {
      try {
        final f = File(path);
        if (!await f.exists()) {
          skipped++;
          continue;
        }
        entries.add(ChartLibraryEntry(path: path, file: await ChartFile.load(path), modified: await f.lastModified()));
      } catch (_) {
        skipped++;
      }
    }
    return (entries: entries, skipped: skipped);
  }
}
