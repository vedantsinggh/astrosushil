import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';

import 'package:flutter/foundation.dart' show ValueNotifier;

/// Error returned by the engine sidecar (`ok: false`) or raised by the transport.
class EngineException implements Exception {
  EngineException(this.code, this.message, {this.reason});
  final String code;
  final String message;

  /// The engine's own error code behind a `CALCULATION_ERROR`, if any (e.g.
  /// `PLACIDUS_UNDEFINED_AT_LATITUDE`).
  final String? reason;

  /// KP (Placidus) cusps are undefined at the chart's latitude (engine `PlacidusUndefinedError`).
  /// Falls back to the message for sidecars that do not send `reason`.
  bool get isPlacidusUndefined =>
      reason == 'PLACIDUS_UNDEFINED_AT_LATITUDE' || code == 'PLACIDUS_UNDEFINED_AT_LATITUDE' || message.contains('Placidus house cusps are undefined');
  @override
  String toString() => '$code: $message';
}

/// Line-oriented duplex channel to the sidecar. Abstracted so tests can use an in-memory fake.
abstract class SidecarTransport {
  Stream<String> get lines;
  void send(String line);
  Future<void> close();

  /// Completes when the underlying process exits (with its exit code), if known.
  Future<int> get exitCode;
}

/// Transport over a child process' stdin/stdout (NDJSON).
class ProcessTransport implements SidecarTransport {
  ProcessTransport(this._process)
      : lines = _process.stdout.transform(utf8.decoder).transform(const LineSplitter()).asBroadcastStream() {
    _process.stderr.transform(utf8.decoder).listen((s) => stderrLog.write(s));
  }

  final Process _process;
  final StringBuffer stderrLog = StringBuffer();

  static Future<ProcessTransport> start(String executable, List<String> args, {String? workingDirectory}) async {
    final p = await Process.start(executable, args, workingDirectory: workingDirectory, runInShell: false);
    return ProcessTransport(p);
  }

  @override
  final Stream<String> lines;

  @override
  void send(String line) {
    try {
      _process.stdin.writeln(line);
    } catch (_) {
      // The process has gone; the client fails pending calls when stdout closes.
    }
  }

  @override
  Future<void> close() async {
    try {
      await _process.stdin.close();
    } catch (_) {}
    await _process.exitCode.timeout(const Duration(seconds: 3), onTimeout: () {
      _process.kill();
      return -1;
    });
  }

  @override
  Future<int> get exitCode => _process.exitCode;
}

/// Typed request/response client for the engine sidecar protocol v1.
///
/// Responses larger than [isolateDecodeThreshold] characters are decoded on a background isolate
/// so big results (e.g. deep dasha trees) never block the UI thread.
class EngineClient {
  EngineClient(this._transport, {this.isolateDecodeThreshold = 256 * 1024}) {
    _sub = _transport.lines.listen(_onLine, onDone: _onDone, onError: (Object e) => _failAll(EngineException('TRANSPORT_ERROR', '$e')));
  }

  static const supportedProtocolVersion = 1;

  final SidecarTransport _transport;
  final int isolateDecodeThreshold;
  late final StreamSubscription<String> _sub;
  final _pending = <int, Completer<Object?>>{};
  final _ready = Completer<Map<String, Object?>>();
  final _done = Completer<void>();
  int _nextId = 1;
  bool _closed = false;
  bool _disposed = false;

  /// Number of requests in flight (drives the status-bar activity indicator).
  final ValueNotifier<int> inFlight = ValueNotifier<int>(0);

  /// Resolves with the sidecar's `ready` event (protocol + engine versions).
  Future<Map<String, Object?>> get ready => _ready.future;

  /// Completes when the connection ends, either through [dispose] or because the sidecar stopped.
  Future<void> get done => _done.future;

  bool get isClosed => _closed;

  /// True when the connection ended because [dispose] was called (not a crash).
  bool get wasDisposed => _disposed;

  void _onLine(String line) {
    if (line.trim().isEmpty) return;
    if (line.length >= isolateDecodeThreshold) {
      Isolate.run(() => jsonDecode(line)).then(_onDecoded, onError: (Object _) {});
      return;
    }
    final Object? decoded;
    try {
      decoded = jsonDecode(line);
    } catch (_) {
      return; // ignore non-protocol output
    }
    _onDecoded(decoded);
  }

  void _onDecoded(Object? decoded) {
    if (decoded is! Map<String, Object?>) return;
    if (decoded['event'] == 'ready') {
      if (!_ready.isCompleted) {
        final v = decoded['protocolVersion'];
        if (v != supportedProtocolVersion) {
          _ready.completeError(EngineException('PROTOCOL_MISMATCH', 'Sidecar protocol $v, client expects $supportedProtocolVersion'));
        } else {
          _ready.complete(decoded);
        }
      }
      return;
    }
    final id = decoded['id'];
    if (id is! int) return;
    final c = _pending.remove(id);
    if (c == null) return;
    inFlight.value = _pending.length;
    if (decoded['ok'] == true) {
      c.complete(decoded['result']);
    } else {
      final err = decoded['error'];
      if (err is Map<String, Object?>) {
        final reason = err['reason'];
        c.completeError(EngineException('${err['code']}', '${err['message']}', reason: reason is String ? reason : null));
      } else {
        c.completeError(EngineException('INTERNAL_ERROR', 'Malformed error response'));
      }
    }
  }

  void _onDone() {
    _closed = true;
    _failAll(EngineException('SIDECAR_EXITED', 'The calculation engine stopped unexpectedly.'));
    if (!_ready.isCompleted) _ready.completeError(EngineException('SIDECAR_EXITED', 'The calculation engine failed to start.'));
    if (!_done.isCompleted) _done.complete();
  }

  void _failAll(EngineException e) {
    final list = _pending.values.toList();
    _pending.clear();
    inFlight.value = 0;
    for (final c in list) {
      if (!c.isCompleted) c.completeError(e);
    }
  }

  /// Sends [method] with [params]; resolves with the raw `result` JSON value.
  Future<Object?> call(String method, [Map<String, Object?> params = const {}]) async {
    if (_closed) throw EngineException('SIDECAR_EXITED', 'The calculation engine is not running.');
    await ready;
    if (_closed) throw EngineException('SIDECAR_EXITED', 'The calculation engine is not running.');
    final id = _nextId++;
    final c = Completer<Object?>();
    _pending[id] = c;
    inFlight.value = _pending.length;
    _transport.send(jsonEncode({'id': id, 'method': method, 'params': params}));
    return c.future;
  }

  /// Calls [method] and decodes the result object with [decode].
  Future<T> callTyped<T>(String method, Map<String, Object?> params, T Function(Map<String, Object?>) decode) async {
    final r = await call(method, params);
    if (r is! Map<String, Object?>) throw EngineException('INTERNAL_ERROR', 'Unexpected result for $method');
    return decode(r);
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _closed = true;
    _failAll(EngineException('SIDECAR_EXITED', 'Engine client disposed.'));
    if (!_ready.isCompleted) _ready.completeError(EngineException('SIDECAR_EXITED', 'Engine client disposed.'));
    _ready.future.ignore();
    if (!_done.isCompleted) _done.complete();
    await _transport.close();
    await _sub.cancel();
  }
}
