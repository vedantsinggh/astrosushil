import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/jyoti_api_repository.dart';
import '../data/jyoti_local_chat_repository.dart';
import '../models/jyoti_message.dart';

/// State representation for Jyoti AI Assistant Chat.
class JyotiChatState {
  final List<JyotiMessageModel> messages;
  final bool isThinking;
  final bool isOffline;
  final String? errorMessage;
  final List<String> suggestions;

  const JyotiChatState({
    this.messages = const [],
    this.isThinking = false,
    this.isOffline = false,
    this.errorMessage,
    this.suggestions = const [
      'Explain this screen',
      'Generate my Kundli',
      'Show my planets',
      'Explain 7th house dynamics',
    ],
  });

  JyotiChatState copyWith({
    List<JyotiMessageModel>? messages,
    bool? isThinking,
    bool? isOffline,
    String? errorMessage,
    List<String>? suggestions,
  }) {
    return JyotiChatState(
      messages: messages ?? this.messages,
      isThinking: isThinking ?? this.isThinking,
      isOffline: isOffline ?? this.isOffline,
      errorMessage: errorMessage,
      suggestions: suggestions ?? this.suggestions,
    );
  }
}

/// Controller managing conversation state & backend/local persistence for Jyoti.
class JyotiController extends StateNotifier<JyotiChatState> {
  final JyotiApiRepository? _apiRepo;
  final JyotiLocalChatRepository? _localRepo;

  JyotiController({
    JyotiApiRepository? apiRepo,
    JyotiLocalChatRepository? localRepo,
  })  : _apiRepo = apiRepo,
        _localRepo = localRepo,
        super(const JyotiChatState()) {
    _loadSavedHistory();
  }

  /// Load persisted chat history from local device storage
  Future<void> _loadSavedHistory() async {
    if (_localRepo == null) return;
    try {
      final saved = await _localRepo!.loadMessages();
      if (saved.isNotEmpty) {
        state = state.copyWith(messages: saved);
      }
    } catch (_) {}
  }

  /// Sends a user prompt to Node.js backend (`/api/v1/jyoti/chat`), persisting state
  Future<void> sendMessage(String text, {String? currentScreen}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    if (state.isOffline) {
      final offlineId = DateTime.now().millisecondsSinceEpoch.toString();
      final updated = [
        ...state.messages,
        JyotiMessageModel.user('${offlineId}_u', trimmed),
        JyotiMessageModel.offline('${offlineId}_o'),
      ];
      state = state.copyWith(messages: updated);
      await _localRepo?.saveMessages(updated);
      return;
    }

    final userMsgId = 'usr_${DateTime.now().millisecondsSinceEpoch}';
    final userMsg = JyotiMessageModel.user(userMsgId, trimmed);

    // 1. Append user message & set thinking indicator
    final interimMessages = [...state.messages, userMsg];
    state = state.copyWith(
      messages: interimMessages,
      isThinking: true,
      errorMessage: null,
    );
    await _localRepo?.saveMessages(interimMessages);

    try {
      List<JyotiMessageModel> aiResponses = [];

      if (_apiRepo != null) {
        aiResponses = await _apiRepo!.sendMessage(
          message: trimmed,
          recentHistory: state.messages,
          currentScreen: currentScreen ?? 'HOME',
        );
      } else {
        aiResponses = [
          JyotiMessageModel.error(
            'err_${DateTime.now().millisecondsSinceEpoch}',
            text: 'Jyoti is unavailable right now. Please try again.',
          ),
        ];
      }

      final finalMessages = [...interimMessages, ...aiResponses];
      state = state.copyWith(
        messages: finalMessages,
        isThinking: false,
      );
      await _localRepo?.saveMessages(finalMessages);
    } catch (e) {
      if (kDebugMode) {
        developer.log('[JYOTI CLIENT] Error sending message to backend: $e', name: 'JyotiController');
      }
      final errMessages = [
        JyotiMessageModel.error(
          'err_${DateTime.now().millisecondsSinceEpoch}',
          text: 'Jyoti is unavailable right now. Please try again.',
        ),
      ];
      final finalMessages = [...interimMessages, ...errMessages];
      state = state.copyWith(
        messages: finalMessages,
        isThinking: false,
      );
      await _localRepo?.saveMessages(finalMessages);
    }
  }

  /// Selects a suggestion chip
  Future<void> selectSuggestion(String suggestion, {String? currentScreen}) async {
    await sendMessage(suggestion, currentScreen: currentScreen);
  }

  /// Toggles simulated offline mode
  void setOffline(bool offline) {
    state = state.copyWith(isOffline: offline);
  }

  /// Triggers error state
  void triggerSimulatedError() {
    final errId = 'err_${DateTime.now().millisecondsSinceEpoch}';
    state = state.copyWith(
      messages: [
        ...state.messages,
        JyotiMessageModel.error(errId, text: 'Jyoti is unavailable right now. Please try again.'),
      ],
      isThinking: false,
    );
  }

  /// Clears chat conversation and local storage
  Future<void> clearChat() async {
    state = const JyotiChatState();
    await _localRepo?.clearChat();
  }
}

/// Local Chat Repository Provider
final jyotiLocalChatRepositoryProvider = Provider<JyotiLocalChatRepository>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return JyotiLocalChatRepository(storage: storage);
});

/// API Chat Repository Provider
final jyotiApiRepositoryProvider = Provider<JyotiApiRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return JyotiApiRepository(apiClient: apiClient);
});

/// Provider for JyotiController
final jyotiControllerProvider =
    StateNotifierProvider<JyotiController, JyotiChatState>((ref) {
  final apiRepo = ref.watch(jyotiApiRepositoryProvider);
  final localRepo = ref.watch(jyotiLocalChatRepositoryProvider);
  return JyotiController(apiRepo: apiRepo, localRepo: localRepo);
});
