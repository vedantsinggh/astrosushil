import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../widgets/subtle_celestial_background.dart';
import '../../home/screens/home_screen.dart';
import 'simple_screen_kit.dart';

/// Screen displayed when an unknown route, broken deep link, or unavailable path is opened
class NotFoundScreen extends StatelessWidget {
  final String? routePath;

  const NotFoundScreen({
    super.key,
    this.routePath,
  });

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: const SimpleScreenAppBar(),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SimpleStateView(
            icon: Icons.explore_off_outlined,
            iconColor: AppColors.secondary,
            title: isHindi ? 'अंतरिक्ष में खोया हुआ मार्ग' : 'Lost in the Cosmos',
            message: isHindi
                ? 'आप जिस स्क्रीन अथवा लिंक को खोजने का प्रयास कर रहे हैं (${routePath ?? "अज्ञात"}), वह उपलब्ध नहीं है अथवा स्थानांतरित हो चुका है।'
                : 'The celestial coordinates or screen you requested (${routePath ?? "unknown"}) does not exist or has moved.',
            extra: SimpleNote(
              icon: Icons.verified_user_outlined,
              color: AppColors.tintSageText,
              text: isHindi
                  ? 'आपकी जन्म कुंडलियां एवं सहेजे गए दस्तावेज पूरी तरह सुरक्षित हैं।'
                  : 'Your saved birth charts and library dossiers remain safe.',
            ),
            actionLabel: isHindi ? 'मुख्य पृष्ठ पर लौटें' : 'Return to Home',
            actionIcon: Icons.home_rounded,
            onAction: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const HomeScreen()),
                (route) => false,
              );
            },
          ),
        ),
      ),
    );
  }
}
