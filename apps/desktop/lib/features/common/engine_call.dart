import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../src/state/providers.dart';

typedef JsonMap = Map<String, Object?>;

/// One sidecar request (method + params) with value equality, so it can key a provider family.
/// Feature screens use this instead of adding providers to the shared state files.
class EngineCall {
  EngineCall(this.method, this.params) : _key = '$method ${jsonEncode(params)}';
  final String method;
  final JsonMap params;
  final String _key;

  @override
  bool operator ==(Object other) => other is EngineCall && other._key == _key;
  @override
  int get hashCode => _key.hashCode;
  @override
  String toString() => _key;
}

/// Raw JSON result of an [EngineCall], computed by the engine sidecar.
final engineCallProvider = FutureProvider.family<JsonMap, EngineCall>((ref, c) async {
  final engine = await ref.watch(calcEngineProvider.future);
  return engine.raw(c.method, c.params);
});

/// Tolerant JSON readers for engine results (feature models use these).
double? asDouble(Object? v) => v is num ? v.toDouble() : null;
int? asInt(Object? v) => v is num ? v.toInt() : null;
String asStr(Object? v, [String fallback = '']) => v is String ? v : (v == null ? fallback : '$v');
JsonMap asMap(Object? v) => v is Map ? v.cast<String, Object?>() : const {};
List<JsonMap> asMapList(Object? v) => v is List ? [for (final e in v) if (e is Map) e.cast<String, Object?>()] : const [];
