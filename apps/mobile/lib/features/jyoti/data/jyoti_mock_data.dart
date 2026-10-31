import '../models/jyoti_message.dart';

/// Isolated mock data provider for Jyoti Phase 1 UI/UX Demonstration.
///
/// NOTE: In Phase 2, this source will be replaced by Gemini / backend integration
/// while leaving the UI components completely intact.
class JyotiMockData {
  JyotiMockData._();

  /// Default suggestion chips displayed on empty state or top of chat
  static const List<String> defaultSuggestions = [
    'Generate my Kundli',
    'Explain my birth chart',
    'What is my Moon sign?',
    'Tell me about my planets',
    'What does my 7th house mean?',
    "Today's Rashi Bhavishya",
    'Explain this screen',
    'Help me find something',
  ];

  /// First-time empty state greeting strings
  static const String initialGreetingTitle = "Hi, I'm Jyoti.";
  static const String initialGreetingSub =
      "I can help you understand your astrology and find your way around Astro Sushil.";
  static const String emptyStatePrompt = "How can I help you?";
  static const String emptyStateDesc =
      "Ask me about your birth chart, planets, houses, or anything you want to explore.";

  /// Generates a realistic mock response matching user input.
  static List<JyotiMessageModel> generateMockResponse(String query) {
    final lower = query.toLowerCase();
    final now = DateTime.now();
    final id = now.millisecondsSinceEpoch.toString();

    if (lower.contains('kundli') || lower.contains('generate')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "Sure. I'll take you directly to your Birth Chart so you can view your Kundli and planetary positions.",
        ),
        JyotiMessageModel.action(
          '${id}_2',
          "Here is your shortcut to view or generate your birth chart:",
          const JyotiAction(
            type: JyotiActionType.openBirthChart,
            title: '✦ Birth Chart & Kundli',
            subtitle: 'View your personalized birth chart and planetary degrees.',
            buttonText: 'Open Birth Chart →',
          ),
        ),
      ];
    }

    if (lower.contains('7th house') || lower.contains('seventh house')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "The 7th house is traditionally associated with partnerships, marriage, and one-to-one relationships in your horoscope.",
        ),
        JyotiMessageModel.explanation(
          '${id}_2',
          "Here is a deeper look into the 7th house:",
          const JyotiExplanation(
            title: 'Your 7th House',
            category: 'Relationships & Partnership',
            summary:
                'The 7th house governs long-term commitments, marriage compatibility, and business alliances.',
            detailedText:
                'In Vedic Astrology (Jyotish), the 7th house sits directly opposite the 1st house of Self. It reflects how you interact with key partners, your expectations in marriage, and the cosmic energies influencing your close relationships.',
            actionButtonText: 'Explore 7th House →',
            actionType: JyotiActionType.openHouses,
          ),
        ),
      ];
    }

    if (lower.contains('planet') || lower.contains('planets')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "Planets (Grahas) play a pivotal role in shaping your tendencies, cosmic strength, and life dasha periods.",
        ),
        JyotiMessageModel.action(
          '${id}_2',
          "Explore detailed planetary positions in your chart:",
          const JyotiAction(
            type: JyotiActionType.openPlanets,
            title: '✦ Planetary Positions',
            subtitle: 'Examine Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu & Ketu.',
            buttonText: 'View Planets →',
          ),
        ),
      ];
    }

    if (lower.contains('moon sign') || lower.contains('rashi')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "Your Moon sign represents your emotional nature, instincts, and inner world. It dictates your Rashi for daily predictions.",
        ),
        JyotiMessageModel.action(
          '${id}_2',
          "Check today's Rashi Bhavishya for your sign:",
          const JyotiAction(
            type: JyotiActionType.openRashiBhavishya,
            title: '✦ Rashi Bhavishya',
            subtitle: "Daily predictions for career, health, finances and personal life.",
            buttonText: "Open Rashi Bhavishya →",
          ),
        ),
      ];
    }

    if (lower.contains('nakshatra')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "Nakshatras (Lunar Mansions) provide fine-grained insights into your birth chart, dasha timings, and soul characteristics.",
        ),
        JyotiMessageModel.action(
          '${id}_2',
          "View your Nakshatra details in your Kundli:",
          const JyotiAction(
            type: JyotiActionType.openNakshatra,
            title: '✦ Nakshatra Insights',
            subtitle: 'Discover your birth star, pada, and ruling deity.',
            buttonText: 'Open Nakshatra →',
          ),
        ),
      ];
    }

    if (lower.contains('screen') || lower.contains('explain this')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "You are currently viewing the Jyoti Assistant. In the future, tapping 'Explain this screen' from any section of Astro Sushil will analyze the specific chart, planet, or report on your display.",
        ),
        JyotiMessageModel.explanation(
          '${id}_2',
          "Screen Context Explanation (Preview):",
          const JyotiExplanation(
            title: 'Screen Analysis Preview',
            category: 'AI Assistance',
            summary:
                'Jyoti can explain charts, tables, planetary strengths, and dasha periods shown on your display.',
            detailedText:
                'When viewing your Kundli, Planets, or Rashi Bhavishya, Jyoti will summarize key details and highlights directly tailored to what you are looking at.',
            actionButtonText: 'Explore Features →',
            actionType: JyotiActionType.openBirthChart,
          ),
        ),
      ];
    }

    if (lower.contains('find') || lower.contains('help') || lower.contains('navigate')) {
      return [
        JyotiMessageModel.jyotiText(
          '${id}_1',
          "I can guide you anywhere in Astro Sushil! You can ask me to open your birth profile, inspect Vastu remedies, or view daily horoscopes.",
        ),
        JyotiMessageModel.action(
          '${id}_2',
          "Here are quick shortcuts to key areas of the app:",
          const JyotiAction(
            type: JyotiActionType.openVastu,
            title: '✦ Vastu Guidance',
            subtitle: 'Discover directional energy balance for home and work.',
            buttonText: 'Explore Vastu →',
          ),
        ),
      ];
    }

    // Default general response
    return [
      JyotiMessageModel.jyotiText(
        '${id}_1',
        "I understand you'd like to explore '$query'. In astrology, every celestial position holds unique meaning for your personal journey.",
      ),
      JyotiMessageModel.explanation(
        '${id}_2',
        "Here is a summary of cosmic insights:",
        const JyotiExplanation(
          title: 'Understanding Cosmic Influences',
          category: 'Astrology Foundations',
          summary: 'Your natal chart maps the precise astronomical positions at your moment of birth.',
          detailedText:
              "Vedic Astrology combines Graha (Planet), Rashi (Sign), Bhava (House), and Nakshatra (Lunar Mansion) to provide deterministic guidance for your path.",
          actionButtonText: 'View Birth Chart →',
          actionType: JyotiActionType.openBirthChart,
        ),
      ),
    ];
  }
}
