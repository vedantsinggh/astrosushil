enum NotificationCategory {
  all,
  panchang,
  transit,
  consultation,
  order,
  system,
}

/// Model representing an in-app and push notification record
class NotificationItemModel {
  final String id;
  final String title;
  final String titleHi;
  final String body;
  final String bodyHi;
  final NotificationCategory category;
  final DateTime timestamp;
  final bool isRead;
  final String? routeAction;
  final String? entityId;

  const NotificationItemModel({
    required this.id,
    required this.title,
    required this.titleHi,
    required this.body,
    required this.bodyHi,
    required this.category,
    required this.timestamp,
    this.isRead = false,
    this.routeAction,
    this.entityId,
  });

  NotificationItemModel copyWith({
    String? id,
    String? title,
    String? titleHi,
    String? body,
    String? bodyHi,
    NotificationCategory? category,
    DateTime? timestamp,
    bool? isRead,
    String? routeAction,
    String? entityId,
  }) {
    return NotificationItemModel(
      id: id ?? this.id,
      title: title ?? this.title,
      titleHi: titleHi ?? this.titleHi,
      body: body ?? this.body,
      bodyHi: bodyHi ?? this.bodyHi,
      category: category ?? this.category,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
      routeAction: routeAction ?? this.routeAction,
      entityId: entityId ?? this.entityId,
    );
  }

  factory NotificationItemModel.fromJson(Map<String, dynamic> json) {
    NotificationCategory cat;
    switch ((json['category'] as String? ?? 'system').toLowerCase()) {
      case 'panchang':
        cat = NotificationCategory.panchang;
        break;
      case 'transit':
        cat = NotificationCategory.transit;
        break;
      case 'consultation':
        cat = NotificationCategory.consultation;
        break;
      case 'order':
        cat = NotificationCategory.order;
        break;
      default:
        cat = NotificationCategory.system;
    }

    return NotificationItemModel(
      id: json['id'] as String,
      title: json['title'] as String,
      titleHi: json['titleHi'] as String? ?? json['title'] as String,
      body: json['body'] as String,
      bodyHi: json['bodyHi'] as String? ?? json['body'] as String,
      category: cat,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
      routeAction: json['routeAction'] as String?,
      entityId: json['entityId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'titleHi': titleHi,
      'body': body,
      'bodyHi': bodyHi,
      'category': category.name,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
      'routeAction': routeAction,
      'entityId': entityId,
    };
  }
}
