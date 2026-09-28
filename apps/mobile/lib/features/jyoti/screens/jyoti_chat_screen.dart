import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/providers/home_provider.dart';
import '../../../home/screens/reports_screen.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../astrology/screens/birth_chart_screen.dart';
import '../../astrology/screens/planets_screen.dart';
import '../../astrology/screens/rashi_bhavishya_screen.dart';
import '../../astrology/screens/vastu_screen.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_screen.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/birth_profile_list_screen.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../../onboarding/screens/onboarding_screen.dart';
import '../data/jyoti_mock_data.dart';
import '../models/jyoti_message.dart';
import '../providers/jyoti_controller.dart';
import '../widgets/jyoti_action_card.dart';
import '../widgets/jyoti_avatar.dart';
import '../widgets/jyoti_error.dart';
import '../widgets/jyoti_explanation_card.dart';
import '../widgets/jyoti_input.dart';
import '../widgets/jyoti_message.dart';
import '../widgets/jyoti_suggestion_chip.dart';
import '../widgets/jyoti_typing_indicator.dart';
import '../widgets/jyoti_user_message.dart';

/// Main Chat Screen for Jyoti AI Assistant (Phase 1 UI Shell).
class JyotiChatScreen extends ConsumerStatefulWidget {
  const JyotiChatScreen({super.key});

  @override
  ConsumerState<JyotiChatScreen> createState() => _JyotiChatScreenState();
}

class _JyotiChatScreenState extends ConsumerState<JyotiChatScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showVoiceComingSoonSnackbar() {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.mic_rounded, color: AppColors.premiumAccent, size: 20),
            SizedBox(width: 10),
            Text(
              'Voice input is currently disabled',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showConfirmLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppColors.error),
            SizedBox(width: 10),
            Text(
              'Log Out?',
              style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out of Astro Sushil?',
          style: TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(authStateProvider.notifier).logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );
  }

  void _showHelpBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.lightSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.help_outline_rounded, color: AppColors.primary),
                SizedBox(width: 10),
                Text(
                  'Astro Sushil Assistance',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Jyoti is here to assist you with astrology concepts, your birth chart, daily horoscopes, reports, and app navigation. If you need account or payment support, you can access options in your Profile.',
              style: TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.4),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Got it', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _executeAction(JyotiActionType actionType) {
    final profilesState = ref.read(birthProfilesListNotifierProvider);
    final hasProfile = profilesState.profiles.isNotEmpty;

    switch (actionType) {
      case JyotiActionType.openHome:
        ref.read(homeTabControllerProvider.notifier).state = 0;
        Navigator.of(context).popUntil((route) => route.isFirst);
        return;

      case JyotiActionType.openBirthChart:
      case JyotiActionType.openHouses:
      case JyotiActionType.openNakshatra:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => hasProfile ? const BirthChartScreen() : const CreateBirthProfileScreen(),
          ),
        );
        return;

      case JyotiActionType.openPlanets:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => hasProfile ? const PlanetsScreen() : const CreateBirthProfileScreen(),
          ),
        );
        return;

      case JyotiActionType.openRashiBhavishya:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const RashiBhavishyaScreen()),
        );
        return;

      case JyotiActionType.openVastu:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const VastuScreen()),
        );
        return;

      case JyotiActionType.openProfile:
      case JyotiActionType.openBirthProfile:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const BirthProfileListScreen()),
        );
        return;

      case JyotiActionType.openSettings:
      case JyotiActionType.openAccount:
      case JyotiActionType.openNotificationSettings:
        ref.read(homeTabControllerProvider.notifier).state = 2;
        Navigator.of(context).popUntil((route) => route.isFirst);
        return;

      case JyotiActionType.openReports:
      case JyotiActionType.openCareerReport:
      case JyotiActionType.generateCareerReport:
      case JyotiActionType.openSubscription:
      case JyotiActionType.openPayment:
        ref.read(homeTabControllerProvider.notifier).state = 1;
        Navigator.of(context).popUntil((route) => route.isFirst);
        return;

      case JyotiActionType.openLogin:
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
        return;

      case JyotiActionType.confirmLogout:
        _showConfirmLogoutDialog();
        return;

      case JyotiActionType.openHelp:
      case JyotiActionType.openAbout:
        _showHelpBottomSheet();
        return;

      case JyotiActionType.openNotifications:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Notifications can be managed in your Profile settings.'),
          ),
        );
        return;

      case JyotiActionType.openJyoti:
        return;
    }
  }


  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(jyotiControllerProvider);
    final controller = ref.read(jyotiControllerProvider.notifier);

    // Auto-scroll when messages change or typing state changes
    ref.listen(jyotiControllerProvider, (prev, next) {
      if (next.messages.length != (prev?.messages.length ?? 0) ||
          next.isThinking != prev?.isThinking) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Jyoti',
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(
              Icons.more_vert_rounded,
              color: AppColors.primary,
            ),
            onSelected: (value) {
              if (value == 'clear') {
                controller.clearChat();
              } else if (value == 'toggle_offline') {
                controller.setOffline(!chatState.isOffline);
              } else if (value == 'simulate_error') {
                controller.triggerSimulatedError();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'clear',
                child: Row(
                  children: [
                    Icon(Icons.cleaning_services_rounded, size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text('Clear Conversation'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'toggle_offline',
                child: Row(
                  children: [
                    Icon(
                      chatState.isOffline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                      size: 18,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(chatState.isOffline ? 'Set Online Mode' : 'Simulate Offline Mode'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'simulate_error',
                child: Row(
                  children: [
                    Icon(Icons.error_outline_rounded, size: 18, color: AppColors.error),
                    SizedBox(width: 8),
                    Text('Simulate AI Error'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            // Offline Warning Notice Bar
            if (chatState.isOffline)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: AppColors.warning.withOpacity(0.15),
                child: const Row(
                  children: [
                    Icon(Icons.wifi_off_rounded, size: 16, color: AppColors.primary),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Jyoti needs an internet connection to answer new questions.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Scrollable Conversation Area
            Expanded(
              child: ListView(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(vertical: 12),
                physics: const BouncingScrollPhysics(),
                children: [
                  // 1. JYOTI HEADER & GREETING
                  const _JyotiChatHeader(),

                  const SizedBox(height: 16),

                  // 2. SUGGESTED ACTION CHIPS (Shown on empty or at top)
                  if (chatState.messages.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Suggested Actions',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.secondary,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: chatState.suggestions.map((suggestion) {
                              return JyotiSuggestionChip(
                                label: suggestion,
                                onTap: () => controller.selectSuggestion(suggestion),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 12),

                  // 3. MESSAGES STREAM
                  ...chatState.messages.map((msg) {
                    switch (msg.type) {
                      case JyotiMessageType.user:
                        return JyotiUserMessage(message: msg);
                      case JyotiMessageType.jyotiText:
                        return JyotiMessage(message: msg);
                      case JyotiMessageType.actionCard:
                        return msg.action != null
                            ? JyotiActionCardWidget(
                                action: msg.action!,
                                onExecuteAction: _executeAction,
                              )
                            : const SizedBox.shrink();
                      case JyotiMessageType.explanationCard:
                        return msg.explanation != null
                            ? JyotiExplanationCardWidget(
                                explanation: msg.explanation!,
                                onExecuteAction: _executeAction,
                              )
                            : const SizedBox.shrink();
                      case JyotiMessageType.loading:
                        return const JyotiTypingIndicator();
                      case JyotiMessageType.error:
                        return JyotiErrorCard(
                          onTryAgain: () {
                            controller.sendMessage('Explain my birth chart');
                          },
                          onContinueExploring: () {
                            Navigator.of(context).pop();
                          },
                        );
                      case JyotiMessageType.offline:
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.shade300),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg.text,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton(
                                onPressed: () => Navigator.of(context).pop(),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  side: const BorderSide(color: AppColors.primary),
                                ),
                                child: const Text('Continue Exploring Astro Sushil'),
                              ),
                            ],
                          ),
                        );
                    }
                  }),

                  // Typing indicator when thinking
                  if (chatState.isThinking) const JyotiTypingIndicator(),
                ],
              ),
            ),

            // Bottom Input Bar
            JyotiInput(
              onSend: (text) => controller.sendMessage(text),
              onVoiceTap: _showVoiceComingSoonSnackbar,
            ),
          ],
        ),
      ),
    );
  }
}

/// Top greeting section of Jyoti Chat Screen
class _JyotiChatHeader extends StatelessWidget {
  const _JyotiChatHeader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        children: [
          const JyotiAvatar(size: 52),
          const SizedBox(height: 12),
          const Text(
            JyotiMockData.initialGreetingTitle,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            JyotiMockData.initialGreetingSub,
            style: TextStyle(
              fontSize: 13.5,
              height: 1.35,
              color: AppColors.lightTextSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.04),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.primary.withOpacity(0.08),
              ),
            ),
            child: const Column(
              children: [
                Text(
                  JyotiMockData.emptyStatePrompt,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  JyotiMockData.emptyStateDesc,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.lightTextMuted,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
