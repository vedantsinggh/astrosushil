// UI audit: Jyoti chat, consultation booking flow and courses (QA only).
@Tags(['ui_audit'])
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/consultations/widgets/booking_flow_sheet.dart';
import 'package:astro_mobile/features/courses/screens/course_detail_screen.dart';
import 'package:astro_mobile/features/courses/screens/course_player_screen.dart';
import 'package:astro_mobile/features/courses/screens/courses_hub_screen.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_api_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_local_chat_repository.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';
import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';

import 'audit_fixtures.dart';
import 'audit_harness.dart';

class _EmptyJyotiLocal extends Fake implements JyotiLocalChatRepository {
  @override
  Future<List<JyotiMessageModel>> loadMessages() async => [];
  @override
  Future<void> saveMessages(List<JyotiMessageModel> messages) async {}
  @override
  Future<void> clearChat() async {}
}

/// Never answers, so the chat stays in its "thinking" state.
class _PendingJyotiApi extends Fake implements JyotiApiRepository {
  @override
  Future<List<JyotiMessageModel>> sendMessage({
    required String message,
    required List<JyotiMessageModel> recentHistory,
    String? currentScreen,
    String? birthProfileId,
  }) =>
      Completer<List<JyotiMessageModel>>().future;
}

const _offering = ConsultationOfferingModel(
  sku: 'consult-general-video',
  title: 'General Consultation (Video)',
  description: '30-minute interactive video call with thorough chart analysis.',
  mode: 'ONLINE_VIDEO',
  durationMinutes: 30,
  pricePaise: 1500000,
  responseDaysNotice: 7,
  category: 'Video Consultation',
);

Widget _booking() => const Scaffold(body: BookingFlowSheet(offering: _offering));

Future<void> _pickSlot(WidgetTester tester) async {
  final slot = find.textContaining('10:00');
  if (slot.evaluate().isNotEmpty) {
    await tester.ensureVisible(slot.first);
    await tester.tap(slot.first, warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 300));
  }
}

Future<void> _tapNext(WidgetTester tester) async {
  final next = find.byKey(const ValueKey('booking_next'));
  if (next.evaluate().isNotEmpty) {
    await tester.ensureVisible(next);
    await tester.tap(next, warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 400));
  }
}

void main() {
  final cases = <AuditCase>[
    AuditCase('jyoti_chat', () => const JyotiChatScreen(), overrides: () => baseOverrides()),
    AuditCase('jyoti_chat_empty', () => const JyotiChatScreen(),
        overrides: () => baseOverrides(extra: [jyotiLocalChatRepositoryProvider.overrideWithValue(_EmptyJyotiLocal())])),
    AuditCase('jyoti_chat_thinking', () => const JyotiChatScreen(initialPrompt: 'What is my Moon sign?'),
        overrides: () => baseOverrides(extra: [
              jyotiLocalChatRepositoryProvider.overrideWithValue(_EmptyJyotiLocal()),
              jyotiApiRepositoryProvider.overrideWithValue(_PendingJyotiApi()),
            ]),
        matrix: kLiteMatrix),
    AuditCase('jyoti_chat_answer', () => const JyotiChatScreen(initialPrompt: 'Generate my Kundli'),
        overrides: () => baseOverrides(extra: [jyotiLocalChatRepositoryProvider.overrideWithValue(_EmptyJyotiLocal())]),
        matrix: kLiteMatrix),
    AuditCase('booking_step1', _booking, overrides: () => baseOverrides()),
    AuditCase('booking_step2', _booking, overrides: () => baseOverrides(), matrix: kLiteMatrix, interact: (t) async {
      await _pickSlot(t);
      await _tapNext(t);
    }),
    AuditCase('booking_step3', _booking, overrides: () => baseOverrides(), matrix: kLiteMatrix, interact: (t) async {
      await _pickSlot(t);
      await _tapNext(t);
      await _tapNext(t);
    }),
    AuditCase('courses_hub', () => const CoursesHubScreen(), overrides: () => baseOverrides()),
    AuditCase('courses_my_learning', () => const CoursesHubScreen(initialTab: 1), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('course_detail', () => const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'), overrides: () => baseOverrides()),
    AuditCase('course_player', () => const CoursePlayerScreen(lessonId: 'l-1'), overrides: () => baseOverrides()),
  ];
  registerAuditCases('E', cases);
}
