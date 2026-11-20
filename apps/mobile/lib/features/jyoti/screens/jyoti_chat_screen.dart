import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/providers/home_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
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
import '../data/jyoti_ui_copy.dart';
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
  final String? initialPrompt;
  final String? initialScreen;

  const JyotiChatScreen({
    super.key,
    this.initialPrompt,
    this.initialScreen,
  });

  @override
  ConsumerState<JyotiChatScreen> createState() => _JyotiChatScreenState();
}

class _JyotiChatScreenState extends ConsumerState<JyotiChatScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    if (widget.initialPrompt != null && widget.initialPrompt!.trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(jyotiControllerProvider.notifier).sendMessage(
              widget.initialPrompt!.trim(),
              currentScreen: widget.initialScreen,
            );
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController
            .animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        )
            .then((_) {
          // Tall bubbles can grow the list while animating; settle on the
          // real bottom so the newest message is always fully visible.
          if (!mounted || !_scrollController.hasClients) return;
          final position = _scrollController.position;
          if (position.pixels < position.maxScrollExtent) {
            _scrollController.jumpTo(position.maxScrollExtent);
          }
        });
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
    showAstroConfirm(
      context: context,
      title: 'Log Out?',
      message: 'Are you sure you want to log out of Astro Sushil?',
      confirmLabel: 'Log Out',
      destructive: true,
    ).then((confirmed) async {
      if (!confirmed) return;
      await ref.read(authStateProvider.notifier).logout();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const OnboardingScreen()),
          (route) => false,
        );
      }
    });
  }

  void _showHelpBottomSheet() {
    showAstroSheet<void>(
      context: context,
      title: 'Astro Sushil Assistance',
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AstroIconSquare(icon: Icons.help_outline_rounded, tint: AstroTint.indigo),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Jyoti is here to assist you with astrology concepts, your birth chart, daily horoscopes, reports, and app navigation. If you need account or payment support, you can access options in your Profile.',
                  style: TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.45),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          AstroPrimaryButton(label: 'Got it', onPressed: () => Navigator.of(ctx).pop()),
        ],
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
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => hasProfile ? const BirthChartScreen(initialTabIndex: 0) : const CreateBirthProfileScreen(),
          ),
        );
        return;

      case JyotiActionType.openHouses:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => hasProfile ? const BirthChartScreen(initialTabIndex: 2) : const CreateBirthProfileScreen(),
          ),
        );
        return;

      case JyotiActionType.openNakshatra:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => hasProfile ? const BirthChartScreen(initialTabIndex: 3) : const CreateBirthProfileScreen(),
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
      if (next.messages.length != (prev?.messages.length ?? 0) || next.isThinking != prev?.isThinking) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroNavBar(
        toolbarHeight: 64,
        titleWidget: MediaQuery.withClampedTextScaling(
          maxScaleFactor: 1.3,
          child: _JyotiChatTitle(
            isThinking: chatState.isThinking,
            isOffline: chatState.isOffline,
          ),
        ),
        actions: [
          AstroNavAction(
            icon: AstroIcons.more(context),
            tooltip: 'More options',
            onPressed: () async {
              final value = await showAstroActionSheet<String>(
                context: context,
                actions: [
                  const AstroSheetAction(
                    label: 'Clear Conversation',
                    value: 'clear',
                    icon: Icons.cleaning_services_rounded,
                  ),
                  AstroSheetAction(
                    label: chatState.isOffline ? 'Set Online Mode' : 'Simulate Offline Mode',
                    value: 'toggle_offline',
                    icon: chatState.isOffline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
                  ),
                  const AstroSheetAction(
                    label: 'Simulate AI Error',
                    value: 'simulate_error',
                    icon: Icons.error_outline_rounded,
                    isDestructive: true,
                  ),
                ],
              );
              if (value == 'clear') {
                controller.clearChat();
              } else if (value == 'toggle_offline') {
                controller.setOffline(!chatState.isOffline);
              } else if (value == 'simulate_error') {
                controller.triggerSimulatedError();
              }
            },
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
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: AppColors.warningBg,
                  border: Border(
                    bottom: BorderSide(color: AppColors.warningBorder, width: 0.5),
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.wifi_off_rounded, size: 22, color: AppColors.primary),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Jyoti needs an internet connection to answer new questions.',
                        style: TextStyle(
                          fontSize: 15,
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
                children: [
                  if (chatState.messages.isEmpty)
                    // Empty chat: greeting + tappable suggested questions
                    _JyotiEmptyIntro(
                      suggestions: chatState.suggestions.take(4).toList(),
                      onSuggestionTap: controller.selectSuggestion,
                    )
                  else
                    const _JyotiDisclosure(),

                  // MESSAGES STREAM
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
                            controller.retryLastMessage();
                          },
                          onContinueExploring: () {
                            Navigator.of(context).pop();
                          },
                        );
                      case JyotiMessageType.offline:
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.warningBg,
                            borderRadius: BorderRadius.circular(AstroMetrics.cardRadius),
                            border: Border.all(color: AppColors.warningBorder, width: 0.5),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.wifi_off_rounded, size: 22, color: AppColors.primary),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      msg.text,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        height: 1.4,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              AstroSecondaryButton(
                                label: 'Continue Exploring Astro Sushil',
                                variant: AstroSecondaryVariant.outlined,
                                onPressed: () => Navigator.of(context).pop(),
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

/// Chat-app style title: Jyoti's avatar, name, and a live status line
/// ("AI astrology assistant", or "Thinking…" while an answer is on its way).
class _JyotiChatTitle extends StatelessWidget {
  final bool isThinking;
  final bool isOffline;

  const _JyotiChatTitle({required this.isThinking, required this.isOffline});

  @override
  Widget build(BuildContext context) {
    final String status;
    final Color statusColor;
    if (isThinking) {
      status = 'Thinking…';
      statusColor = AppColors.goldDark;
    } else if (isOffline) {
      status = 'Offline';
      statusColor = AppColors.lightTextSecondary;
    } else {
      status = 'AI astrology assistant';
      statusColor = AppColors.lightTextSecondary;
    }

    // Hugs its content so iOS can centre it (Messages-style); Android keeps
    // it start-aligned next to the back arrow.
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const JyotiAvatar(size: 40, showSparkle: false),
        const SizedBox(width: 10),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Jyoti',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              Semantics(
                liveRegion: true,
                child: Text(
                  status,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodyMedium.copyWith(
                    fontSize: 14,
                    fontWeight: isThinking ? FontWeight.w700 : FontWeight.w500,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Short AI disclosure line kept at the top of every conversation.
class _JyotiDisclosure extends StatelessWidget {
  const _JyotiDisclosure();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(24, 4, 24, 8),
      child: Text(
        'Automated AI Guidance · Based on Vedic Jyotish principles',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 14,
          height: 1.4,
          color: AppColors.lightTextSecondary,
        ),
      ),
    );
  }
}

/// Greeting and suggested questions shown before the first message.
class _JyotiEmptyIntro extends StatelessWidget {
  final List<String> suggestions;
  final ValueChanged<String> onSuggestionTap;

  const _JyotiEmptyIntro({
    required this.suggestions,
    required this.onSuggestionTap,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero welcome card.
              const AstroGradientCard(
                padding: EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Column(
                  children: [
                    JyotiAvatar(size: 64, showSparkle: false),
                    SizedBox(height: 14),
                    Text(
                      JyotiUiCopy.initialGreetingTitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: AppTypography.headingFamily,
                        fontFamilyFallback: AppTypography.headingFontFamilies,
                        fontSize: 24,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      JyotiUiCopy.initialGreetingSub,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16, height: 1.45, color: AppColors.textInverseSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              const _JyotiDisclosure(),
              const SizedBox(height: 16),
              Semantics(
                header: true,
                child: Text(
                  JyotiUiCopy.emptyStatePrompt,
                  style: AppTypography.headlineLarge.copyWith(fontSize: 20, height: 1.3),
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Tap a question to ask it, or type your own below.',
                style: TextStyle(
                  fontSize: 15,
                  height: 1.4,
                  color: AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 12),
              for (final suggestion in suggestions) ...[
                JyotiSuggestionChip(
                  label: suggestion,
                  onTap: () => onSuggestionTap(suggestion),
                ),
                const SizedBox(height: 10),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
