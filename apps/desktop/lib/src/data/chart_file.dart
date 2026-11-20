import 'dart:convert';
import 'dart:io';

import '../engine/inputs.dart';

/// On-disk chart document (`*.aschart`, JSON). Stores inputs only: every value shown in the
/// app is recomputed by the engine when the chart is opened, so files never go stale.
class ChartFile {
  ChartFile({required this.birth, this.notes = '', this.gender, DateTime? createdAt, this.path})
      : createdAt = createdAt ?? DateTime.now().toUtc();

  static const formatId = 'astro-sushil-desktop-chart';
  static const formatVersion = 1;
  static const extension = 'aschart';

  final BirthInput birth;
  final String notes;
  final String? gender; // 'M' | 'F' | null — used to pre-fill matchmaking
  final DateTime createdAt;
  final String? path;

  String get displayName => (birth.name == null || birth.name!.trim().isEmpty) ? 'Untitled chart' : birth.name!;

  ChartFile copyWith({BirthInput? birth, String? notes, String? gender, String? path}) =>
      ChartFile(birth: birth ?? this.birth, notes: notes ?? this.notes, gender: gender ?? this.gender, createdAt: createdAt, path: path ?? this.path);

  Map<String, Object?> toJson() => {
        'format': formatId,
        'version': formatVersion,
        'createdAt': createdAt.toIso8601String(),
        'birth': birth.toJson(),
        'notes': notes,
        if (gender != null) 'gender': gender,
      };

  static ChartFile fromJson(Map<String, Object?> j, {String? path}) {
    if (j['format'] != formatId) throw const FormatException('Not an Astro Sushil Desktop chart file');
    final v = j['version'];
    if (v is! int || v > formatVersion) throw FormatException('Unsupported chart file version: $v');
    final birth = j['birth'];
    if (birth is! Map<String, Object?>) throw const FormatException('Chart file has no birth data');
    return ChartFile(
      birth: BirthInput.fromJson(birth),
      notes: (j['notes'] as String?) ?? '',
      gender: j['gender'] as String?,
      createdAt: DateTime.tryParse((j['createdAt'] as String?) ?? ''),
      path: path,
    );
  }

  String encode() => const JsonEncoder.withIndent('  ').convert(toJson());

  static Future<ChartFile> load(String path) async {
    final text = await File(path).readAsString();
    final decoded = jsonDecode(text);
    if (decoded is! Map<String, Object?>) throw const FormatException('Chart file is not a JSON object');
    return fromJson(decoded, path: path);
  }

  Future<ChartFile> saveTo(String path) async {
    final tmp = File('$path.tmp');
    await tmp.writeAsString(encode(), flush: true);
    await tmp.rename(path);
    return copyWith(path: path);
  }
}
