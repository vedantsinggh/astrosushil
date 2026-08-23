import 'dart:convert';

/// Metadata accompanying every cached domain object
class CacheEnvelope<T> {
  final T data;
  final DateTime cachedAt;
  final DateTime? expiresAt;
  final String? version;

  CacheEnvelope({
    required this.data,
    required this.cachedAt,
    this.expiresAt,
    this.version,
  });

  /// Check if the cached payload has passed its expiration time
  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  /// Format human-readable age of cache (e.g. "2 hours ago", "yesterday", "3 days ago")
  String get formattedAge {
    final difference = DateTime.now().difference(cachedAt);
    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'yesterday';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  Map<String, dynamic> toJson(Object? Function(T value) dataToJson) {
    return {
      'cachedAt': cachedAt.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
      'version': version,
      'data': dataToJson(data),
    };
  }

  factory CacheEnvelope.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic rawData) dataFromJson,
  ) {
    return CacheEnvelope<T>(
      cachedAt: DateTime.parse(json['cachedAt'] as String),
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt'] as String) : null,
      version: json['version'] as String?,
      data: dataFromJson(json['data']),
    );
  }
}

/// Interface for local offline caching
abstract class LocalCacheService {
  Future<void> put<T>({
    required String key,
    required T data,
    Duration? ttl,
    String? version,
    Object? Function(T value)? toJson,
  });

  Future<CacheEnvelope<T>?> getEnvelope<T>({
    required String key,
    required T Function(dynamic rawData) fromJson,
  });

  Future<T?> get<T>({
    required String key,
    required T Function(dynamic rawData) fromJson,
  });

  Future<void> remove(String key);
  Future<void> clearAll();
}

/// In-Memory & Persistent fallback implementation for local caching
class MemoryAndStorageLocalCacheService implements LocalCacheService {
  final Map<String, String> _store = {};

  @override
  Future<void> put<T>({
    required String key,
    required T data,
    Duration? ttl,
    String? version,
    Object? Function(T value)? toJson,
  }) async {
    final now = DateTime.now();
    final envelope = CacheEnvelope<T>(
      data: data,
      cachedAt: now,
      expiresAt: ttl != null ? now.add(ttl) : null,
      version: version,
    );

    final rawJson = jsonEncode(envelope.toJson((val) {
      if (toJson != null) return toJson(val);
      return val;
    }));

    _store[key] = rawJson;
  }

  @override
  Future<CacheEnvelope<T>?> getEnvelope<T>({
    required String key,
    required T Function(dynamic rawData) fromJson,
  }) async {
    final raw = _store[key];
    if (raw == null || raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final envelope = CacheEnvelope<T>.fromJson(decoded, fromJson);
      
      // If expired, return envelope but mark expiration
      return envelope;
    } catch (_) {
      // Corrupted cache entry -> remove
      _store.remove(key);
      return null;
    }
  }

  @override
  Future<T?> get<T>({
    required String key,
    required T Function(dynamic rawData) fromJson,
  }) async {
    final envelope = await getEnvelope<T>(key: key, fromJson: fromJson);
    if (envelope == null || envelope.isExpired) {
      return null;
    }
    return envelope.data;
  }

  @override
  Future<void> remove(String key) async {
    _store.remove(key);
  }

  @override
  Future<void> clearAll() async {
    _store.clear();
  }
}
