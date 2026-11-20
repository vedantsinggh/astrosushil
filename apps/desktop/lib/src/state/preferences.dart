import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../charts/chart_geometry.dart';
import '../engine/inputs.dart';

/// How dates are shown in tables and summaries (display only).
enum DateStyle {
  medium('dd MMM yyyy', '15 May 1990'),
  dayFirst('dd-MM-yyyy', '15-05-1990'),
  iso('yyyy-MM-dd', '1990-05-15'),
  monthFirst('MM/dd/yyyy', '05/15/1990');

  const DateStyle(this.pattern, this.example);
  final String pattern;
  final String example;
}

/// User preferences. Persisted as JSON in the OS app-support directory.
class Preferences {
  const Preferences({
    this.chartStyle = ChartStyle.north,
    this.themeMode = ThemeMode.light,
    this.textScale = 1.0,
    this.dateStyle = DateStyle.medium,
    this.defaultSection = 'chart',
    this.lastSection = 'chart',
    this.hintDismissed = false,
    this.libraryFolders = const [],
    this.splitFraction = 0.58,
    this.lastPlace,
    this.sidebarExpanded = true,
    this.ayanamsa = CalcOptions.defaultAyanamsa,
    this.nodeType = CalcOptions.defaultNodeType,
  });

  final ChartStyle chartStyle;
  final ThemeMode themeMode;

  /// Accessibility text scale (1.0 = 100%).
  final double textScale;
  final DateStyle dateStyle;

  /// Section shown when a chart is opened ('last' = the last section used).
  final String defaultSection;
  final String lastSection;
  final bool hintDismissed;

  /// Extra folders scanned by the chart database.
  final List<String> libraryFolders;

  /// Width share of the left pane in split views.
  final double splitFraction;

  /// Last place picked in the birth form (pre-fills the next new chart).
  final Map<String, Object?>? lastPlace;
  final bool sidebarExpanded;

  /// Calculation settings sent with every engine request (engine enum names, `engine.info` →
  /// `options`). Changing them recomputes every open section.
  final String ayanamsa;
  final String nodeType;

  CalcOptions get calcOptions => CalcOptions(ayanamsa: ayanamsa, nodeType: nodeType);

  static const minScale = 0.9;
  static const maxScale = 1.5;

  Preferences copyWith({
    ChartStyle? chartStyle,
    ThemeMode? themeMode,
    double? textScale,
    DateStyle? dateStyle,
    String? defaultSection,
    String? lastSection,
    bool? hintDismissed,
    List<String>? libraryFolders,
    double? splitFraction,
    Map<String, Object?>? lastPlace,
    bool? sidebarExpanded,
    String? ayanamsa,
    String? nodeType,
  }) =>
      Preferences(
        chartStyle: chartStyle ?? this.chartStyle,
        themeMode: themeMode ?? this.themeMode,
        textScale: (textScale ?? this.textScale).clamp(minScale, maxScale),
        dateStyle: dateStyle ?? this.dateStyle,
        defaultSection: defaultSection ?? this.defaultSection,
        lastSection: lastSection ?? this.lastSection,
        hintDismissed: hintDismissed ?? this.hintDismissed,
        libraryFolders: libraryFolders ?? this.libraryFolders,
        splitFraction: (splitFraction ?? this.splitFraction).clamp(0.25, 0.8),
        lastPlace: lastPlace ?? this.lastPlace,
        sidebarExpanded: sidebarExpanded ?? this.sidebarExpanded,
        ayanamsa: ayanamsa ?? this.ayanamsa,
        nodeType: nodeType ?? this.nodeType,
      );

  Map<String, Object?> toJson() => {
        'version': 1,
        'chartStyle': chartStyle.name,
        'themeMode': themeMode.name,
        'textScale': textScale,
        'dateStyle': dateStyle.name,
        'defaultSection': defaultSection,
        'lastSection': lastSection,
        'hintDismissed': hintDismissed,
        'libraryFolders': libraryFolders,
        'splitFraction': splitFraction,
        if (lastPlace != null) 'lastPlace': lastPlace,
        'sidebarExpanded': sidebarExpanded,
        'ayanamsa': ayanamsa,
        'nodeType': nodeType,
      };

  static T _enum<T extends Enum>(List<T> values, Object? name, T fallback) => values.where((v) => v.name == name).firstOrNull ?? fallback;

  /// An engine enum name (e.g. `LAHIRI`); anything else is ignored. The engine validates the value.
  static String? _code(Object? v) => v is String && RegExp(r'^[A-Z][A-Z_]{0,39}$').hasMatch(v) ? v : null;

  /// Lenient: unknown or malformed fields fall back to defaults.
  factory Preferences.fromJson(Map<String, Object?> j) {
    const d = Preferences();
    final scale = j['textScale'];
    final split = j['splitFraction'];
    final place = j['lastPlace'];
    return d.copyWith(
      chartStyle: _enum(ChartStyle.values, j['chartStyle'], d.chartStyle),
      themeMode: _enum(ThemeMode.values, j['themeMode'], d.themeMode),
      textScale: scale is num ? scale.toDouble() : d.textScale,
      dateStyle: _enum(DateStyle.values, j['dateStyle'], d.dateStyle),
      defaultSection: j['defaultSection'] is String ? j['defaultSection'] as String : d.defaultSection,
      lastSection: j['lastSection'] is String ? j['lastSection'] as String : d.lastSection,
      hintDismissed: j['hintDismissed'] == true,
      libraryFolders: (j['libraryFolders'] is List) ? (j['libraryFolders'] as List).whereType<String>().toList() : const [],
      splitFraction: split is num ? split.toDouble() : d.splitFraction,
      lastPlace: place is Map<String, Object?> ? place : null,
      sidebarExpanded: j['sidebarExpanded'] != false,
      ayanamsa: _code(j['ayanamsa']) ?? d.ayanamsa,
      nodeType: _code(j['nodeType']) ?? d.nodeType,
    );
  }
}

/// Where preferences are persisted. Tests use [MemoryPrefsStore].
abstract class PrefsStore {
  Future<Preferences> load();
  Future<void> save(Preferences p);
}

class FilePrefsStore implements PrefsStore {
  FilePrefsStore(this.file);
  final File file;

  @override
  Future<Preferences> load() async {
    try {
      if (!await file.exists()) return const Preferences();
      final j = jsonDecode(await file.readAsString());
      return j is Map<String, Object?> ? Preferences.fromJson(j) : const Preferences();
    } catch (_) {
      return const Preferences();
    }
  }

  @override
  Future<void> save(Preferences p) async {
    await file.parent.create(recursive: true);
    final tmp = File('${file.path}.tmp');
    await tmp.writeAsString(const JsonEncoder.withIndent('  ').convert(p.toJson()), flush: true);
    await tmp.rename(file.path);
  }
}

class MemoryPrefsStore implements PrefsStore {
  MemoryPrefsStore([this.value = const Preferences()]);
  Preferences value;
  int saves = 0;
  @override
  Future<Preferences> load() async => value;
  @override
  Future<void> save(Preferences p) async {
    value = p;
    saves++;
  }
}

/// Overridden in `main()` with the store and the preferences loaded before the first frame.
final prefsStoreProvider = Provider<PrefsStore>((ref) => MemoryPrefsStore());
final initialPrefsProvider = Provider<Preferences>((ref) => const Preferences());

class PrefsNotifier extends Notifier<Preferences> {
  Timer? _saveTimer;

  @override
  Preferences build() {
    ref.onDispose(() {
      if (_saveTimer?.isActive ?? false) {
        _saveTimer!.cancel();
        unawaited(ref.read(prefsStoreProvider).save(state));
      }
    });
    return ref.watch(initialPrefsProvider);
  }

  void update(Preferences Function(Preferences p) change) {
    final next = change(state);
    state = next;
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 300), () => ref.read(prefsStoreProvider).save(state));
  }

  /// Writes immediately (used on exit).
  Future<void> flush() async {
    _saveTimer?.cancel();
    await ref.read(prefsStoreProvider).save(state);
  }
}

final prefsProvider = NotifierProvider<PrefsNotifier, Preferences>(PrefsNotifier.new);
