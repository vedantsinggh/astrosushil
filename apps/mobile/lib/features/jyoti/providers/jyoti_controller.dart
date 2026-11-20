import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../auth/providers/auth_provider.dart';
import '../../birth_profile/data/local_guest_birth_profile_service.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
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

  /// Resolves the currently active birth profile ID so answers are grounded in the chart the
  /// user is looking at (not whichever profile happens to be oldest on the server).
  final String? Function()? _activeProfileId;

  /// Returns true when the user is browsing as a guest (no backend session).
  final bool Function()? _isGuest;

  /// Last prompt sent, so "Try again" re-sends the question that actually failed.
  String? _lastPrompt;
  String? _lastScreen;

  JyotiController({
    JyotiApiRepository? apiRepo,
    JyotiLocalChatRepository? localRepo,
    String? Function()? activeProfileId,
    bool Function()? isGuest,
  })  : _apiRepo = apiRepo,
        _localRepo = localRepo,
        _activeProfileId = activeProfileId,
        _isGuest = isGuest,
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

    _lastPrompt = trimmed;
    _lastScreen = currentScreen;

    final userMsgId = 'usr_${DateTime.now().millisecondsSinceEpoch}';
    final userMsg = JyotiMessageModel.user(userMsgId, trimmed);

    // History sent to the backend must exclude the message being asked now (it is sent
    // separately as `message`), otherwise the question appears twice in the prompt.
    final priorHistory = List<JyotiMessageModel>.from(state.messages);

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

      if (_safeIsGuest()) {
        // Guests have no backend session, so the authenticated chat endpoint cannot answer.
        final id = DateTime.now().millisecondsSinceEpoch.toString();
        aiResponses = [
          JyotiMessageModel.jyotiText(
            '${id}_guest',
            'Please sign in to chat with Jyoti. Your questions are answered from your saved birth chart, which needs an account.',
          ),
          JyotiMessageModel.action(
            '${id}_guest_act',
            'Sign in to continue',
            const JyotiAction(
              type: JyotiActionType.openLogin,
              title: 'Sign In',
              subtitle: 'Sign in to chat with Jyoti',
              buttonText: 'Sign In',
            ),
          ),
        ];
      } else if (_apiRepo != null) {
        aiResponses = await _apiRepo!.sendMessage(
          message: trimmed,
          recentHistory: priorHistory,
          currentScreen: currentScreen ?? 'HOME',
          birthProfileId: _safeActiveProfileId(),
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
          text: friendlyErrorText(e),
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

  /// Re-sends the last prompt after a failure, dropping the error bubble it produced.
  Future<void> retryLastMessage() async {
    if (state.isThinking) return;
    // After an app restart the in-memory prompt is gone; fall back to the last user bubble.
    final prompt = _lastPrompt ??
        state.messages.lastWhere(
          (m) => m.type == JyotiMessageType.user,
          orElse: () => JyotiMessageModel.user('', ''),
        ).text;
    if (prompt.trim().isEmpty) return;
    final cleaned = [...state.messages];
    if (cleaned.isNotEmpty && cleaned.last.type == JyotiMessageType.error) {
      cleaned.removeLast();
      // Drop the failed user bubble too; sendMessage re-appends it.
      if (cleaned.isNotEmpty && cleaned.last.type == JyotiMessageType.user && cleaned.last.text == prompt) {
        cleaned.removeLast();
      }
    }
    state = state.copyWith(messages: cleaned);
    await sendMessage(prompt, currentScreen: _lastScreen);
  }

  /// Maps a failure to short, friendly copy. Never exposes raw exception text.
  static String friendlyErrorText(Object error) {
    if (error is AuthenticationException) {
      return 'Please sign in again to continue chatting with Jyoti.';
    }
    if (error is RateLimitException) {
      return "You're sending messages quickly. Please wait a moment and try again.";
    }
    if (error is TimeoutException) {
      return 'Jyoti is taking too long to respond right now. Please try again.';
    }
    if (error is NetworkException) {
      return "Jyoti couldn't connect. Please check your internet and try again.";
    }
    return 'Jyoti is unavailable right now. Please try again.';
  }

  String? _safeActiveProfileId() {
    try {
      final id = _activeProfileId?.call();
      if (id == null || id.isEmpty || id == LocalGuestBirthProfileService.guestProfileId) {
        return null;
      }
      return id;
    } catch (_) {
      return null;
    }
  }

  bool _safeIsGuest() {
    try {
      return _isGuest?.call() ?? false;
    } catch (_) {
      return false;
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
  return JyotiController(
    apiRepo: apiRepo,
    localRepo: localRepo,
    // Read lazily at send time. `exists` avoids spinning up the auth / profile notifiers from
    // here (the app shell always creates them; isolated containers in tests do not).
    activeProfileId: () => ref.exists(birthProfilesListNotifierProvider)
        ? ref.read(selectedBirthProfileProvider)?.id
        : null,
    isGuest: () => ref.exists(authStateProvider) && ref.read(authStateProvider).isGuest,
  );
});
