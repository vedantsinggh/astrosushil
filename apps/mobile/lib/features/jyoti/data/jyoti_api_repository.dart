import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_client.dart';
import '../models/jyoti_message.dart';

class JyotiApiRepository {
  final ApiClient _apiClient;

  JyotiApiRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Sends user chat message to the Node.js API backend (`/api/v1/jyoti/chat`)
  Future<List<JyotiMessageModel>> sendMessage({
    required String message,
    required List<JyotiMessageModel> recentHistory,
    String? currentScreen,
    String? birthProfileId,
  }) async {
    final validHistory = recentHistory
        .where((m) => m.type == JyotiMessageType.user || m.type == JyotiMessageType.jyotiText)
        .toList();

    final recentSublist = validHistory.length > 6
        ? validHistory.sublist(validHistory.length - 6)
        : validHistory;

    final historyPayload = recentSublist
        .map((m) => {
              'role': m.isUser ? 'user' : 'assistant',
              'content': m.text,
            })
        .toList();

    if (kDebugMode) {
      developer.log(
        '[JYOTI CLIENT] Sending request to endpoint: /jyoti/chat (history count: ${historyPayload.length})',
        name: 'JyotiApiRepository',
      );
    }

    final response = await _apiClient.post(
      '/jyoti/chat',
      // The backend bounds its LLM retries to ~50s and always answers before this,
      // with either the reply or a clean AI_SERVICE_UNAVAILABLE error.
      timeout: const Duration(seconds: 60),
      data: {
        'message': message,
        'conversation': historyPayload,
        'context': {
          if (currentScreen != null) 'currentScreen': currentScreen,
          if (birthProfileId != null) 'birthProfileId': birthProfileId,
        },
      },
    );

    if (kDebugMode) {
      developer.log('[JYOTI CLIENT] Response received successfully from backend', name: 'JyotiApiRepository');
    }

    final data = response['data'] as Map<String, dynamic>? ?? response;
    final rawMessage = data['message'];
    if (rawMessage is! String || rawMessage.trim().isEmpty) {
      // Never substitute a canned reply for a missing backend answer.
      throw const ServerException('Jyoti did not return a response. Please try again.', code: 'JYOTI_EMPTY_RESPONSE');
    }
    String cleanText = rawMessage;

    // Un-escape any literal '\n' string representations
    cleanText = cleanText.replaceAll(r'\n', '\n');

    // If message is wrapped in a stringified JSON object, extract message property
    if (cleanText.trim().startsWith('{') && cleanText.trim().endsWith('}')) {
      try {
        final decoded = jsonDecode(cleanText.trim());
        if (decoded is Map && decoded['message'] != null) {
          cleanText = (decoded['message'] as String).replaceAll(r'\n', '\n');
        }
      } catch (_) {}
    }

    final rawActions = data['actions'] as List<dynamic>?;
    final rawExplanation = data['explanation'] as Map<String, dynamic>?;

    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final List<JyotiMessageModel> results = [];

    // Main Jyoti conversational message
    results.add(JyotiMessageModel.jyotiText('${id}_1', cleanText));

    // Optional Action cards
    if (rawActions != null && rawActions.isNotEmpty) {
      for (int i = 0; i < rawActions.length; i++) {
        final act = rawActions[i] as Map<String, dynamic>;
        final typeStr = act['type'] as String?;
        // Skip actions without an explicit type instead of guessing one.
        if (typeStr == null || typeStr.isEmpty) continue;
        final actionType = JyotiActionTypeExtension.fromString(typeStr);

        results.add(
          JyotiMessageModel.action(
            '${id}_act_$i',
            act['subtitle'] as String? ?? 'Suggested shortcut:',
            JyotiAction(
              type: actionType,
              title: act['title'] as String? ?? 'Open Feature',
              subtitle: act['subtitle'] as String? ?? '',
              buttonText: act['buttonText'] as String? ?? 'Open →',
            ),
          ),
        );
      }
    }

    // Optional Explanation card
    if (rawExplanation != null) {
      final expActionType = rawExplanation['actionType'] != null
          ? JyotiActionTypeExtension.fromString(rawExplanation['actionType'] as String)
          : null;

      results.add(
        JyotiMessageModel.explanation(
          '${id}_exp',
          'Cosmic Insight:',
          JyotiExplanation(
            title: rawExplanation['title'] as String? ?? 'Astrology Insight',
            category: rawExplanation['category'] as String? ?? 'Vedic Astrology',
            summary: rawExplanation['summary'] as String? ?? '',
            detailedText: rawExplanation['detailedText'] as String? ?? '',
            actionButtonText: rawExplanation['actionButtonText'] as String?,
            actionType: expActionType,
          ),
        ),
      );
    }

    return results;
  }
}
