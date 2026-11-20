import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/app_date_time.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/notification_item_model.dart';

class NotificationsState {
  final List<NotificationItemModel> items;
  final NotificationCategory selectedCategory;
  final bool isLoading;
  final String? errorMessage;

  const NotificationsState({
    required this.items,
    this.selectedCategory = NotificationCategory.all,
    this.isLoading = false,
    this.errorMessage,
  });

  int get unreadCount => items.where((item) => !item.isRead).length;

  List<NotificationItemModel> get filteredItems {
    if (selectedCategory == NotificationCategory.all) {
      return items;
    }
    return items.where((item) => item.category == selectedCategory).toList();
  }

  NotificationsState copyWith({
    List<NotificationItemModel>? items,
    NotificationCategory? selectedCategory,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// In-app notification inbox backed by `GET /notifications`.
///
/// Only genuine server notifications are shown. With no API client (guest /
/// signed-out) the inbox is simply empty; a failed load sets [errorMessage].
class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final ApiClient? _apiClient;

  NotificationsNotifier([this._apiClient]) : super(const NotificationsState(items: [])) {
    if (_apiClient != null) {
      load();
    }
  }

  Future<void> load() async {
    final client = _apiClient;
    if (client == null) return;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await client.get('/notifications', queryParameters: {'page': 1, 'pageSize': 50});
      final raw = response['notifications'];
      if (raw is! List) {
        throw const FormatException('Notifications response has no list');
      }
      final items = raw
          .whereType<Map>()
          .map((e) => notificationFromServer(Map<String, dynamic>.from(e)))
          .whereType<NotificationItemModel>()
          .toList();
      if (!mounted) return;
      state = state.copyWith(isLoading: false, items: items);
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Notifications could not be loaded. Please try again.',
      );
    }
  }

  /// Maps a backend notification row ({id, type, title, body, metadata,
  /// readAt, createdAt}) to the UI model. Rows missing required fields are
  /// dropped rather than filled with invented values.
  static NotificationItemModel? notificationFromServer(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];
    final body = json['body'];
    final createdAt = AppDateTime.parseInstant(json['createdAt']);
    if (id is! String || title is! String || body is! String || createdAt == null) {
      return null;
    }
    Map<String, dynamic> meta = const {};
    final rawMeta = json['metadata'];
    if (rawMeta is String && rawMeta.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawMeta);
        if (decoded is Map) meta = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    } else if (rawMeta is Map) {
      meta = Map<String, dynamic>.from(rawMeta);
    }
    final type = (json['type'] as String? ?? '').toUpperCase();
    final NotificationCategory category;
    if (type.startsWith('BOOKING_') || type == 'CONSULTATION_REMINDER') {
      category = NotificationCategory.consultation;
    } else if (type == 'PAYMENT_SUCCESS') {
      category = NotificationCategory.order;
    } else {
      category = NotificationCategory.system;
    }
    return NotificationItemModel(
      id: id,
      title: title,
      titleHi: title,
      body: body,
      bodyHi: body,
      category: category,
      timestamp: createdAt,
      isRead: json['readAt'] != null,
      routeAction: meta['route'] as String?,
      entityId: meta['entityId'] as String?,
    );
  }

  void markAsRead(String id) {
    _apiClient?.patch('/notifications/$id/read').catchError((_) => <String, dynamic>{});
    state = state.copyWith(
      items: state.items.map((item) {
        if (item.id == id) {
          return item.copyWith(isRead: true);
        }
        return item;
      }).toList(),
    );
  }

  void markAllAsRead() {
    _apiClient?.post('/notifications/read-all').catchError((_) => <String, dynamic>{});
    state = state.copyWith(
      items: state.items.map((item) => item.copyWith(isRead: true)).toList(),
    );
  }

  void deleteNotification(String id) {
    state = state.copyWith(
      items: state.items.where((item) => item.id != id).toList(),
    );
  }

  void setCategory(NotificationCategory category) {
    state = state.copyWith(selectedCategory: category);
  }

  void clearAll() {
    state = state.copyWith(items: []);
  }
}

final notificationsNotifierProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  final auth = ref.watch(authStateProvider);
  // Guests and signed-out users have no server inbox.
  if (!auth.isAuthenticated) return NotificationsNotifier();
  return NotificationsNotifier(ref.watch(apiClientProvider));
});
