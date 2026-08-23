import 'dart:convert';
import '../../../core/storage/secure_storage_service.dart';
import '../models/jyoti_message.dart';

/// Local chat repository for persisting Jyoti conversation history safely.
class JyotiLocalChatRepository {
  final SecureStorageService _storage;
  static const String _storageKey = 'jyoti_local_chat_messages_v1';
  static const int maxStorageLimit = 50;

  JyotiLocalChatRepository({required SecureStorageService storage}) : _storage = storage;

  /// Loads locally saved chat messages safely.
  Future<List<JyotiMessageModel>> loadMessages() async {
    try {
      final rawJson = await _storage.read(key: _storageKey);
      if (rawJson == null || rawJson.trim().isEmpty) {
        return [];
      }

      final List<dynamic> decoded = jsonDecode(rawJson);
      final List<JyotiMessageModel> loaded = [];

      for (final item in decoded) {
        if (item is Map<String, dynamic>) {
          try {
            final msg = JyotiMessageModel.fromJson(item);
            // Skip loading temporary indicators
            if (msg.type != JyotiMessageType.loading) {
              loaded.add(msg);
            }
          } catch (e) {
            // Ignore individual malformed message objects gracefully
          }
        }
      }

      return loaded;
    } catch (e) {
      // If entire storage payload is corrupted, return empty array without crashing
      return [];
    }
  }

  /// Saves current chat messages, enforcing maximum storage limits.
  Future<void> saveMessages(List<JyotiMessageModel> messages) async {
    try {
      // Filter out temporary loading indicators
      final persistable = messages.where((m) => m.type != JyotiMessageType.loading).toList();

      // Trim oldest messages if list exceeds limit
      final trimmed = persistable.length > maxStorageLimit
          ? persistable.sublist(persistable.length - maxStorageLimit)
          : persistable;

      final jsonList = trimmed.map((m) => m.toJson()).toList();
      final rawString = jsonEncode(jsonList);

      await _storage.write(key: _storageKey, value: rawString);
    } catch (_) {}
  }

  /// Clears stored chat history.
  Future<void> clearChat() async {
    try {
      await _storage.delete(key: _storageKey);
    } catch (_) {}
  }
}
