/// Static Jyoti UI copy (greeting and empty-state text). Contains no
/// astrological content; every answer comes from the backend `/jyoti/chat`.
class JyotiUiCopy {
  JyotiUiCopy._();

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
}
