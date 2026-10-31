import 'package:flutter/material.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import 'birth_chart_screen.dart';

/// Standalone entrypoint for Nakshatras Screen.
/// Provides direct route access to the Lunar Mansions (Nakshatras) presentation (initialTabIndex: 3).
class NakshatrasScreen extends StatelessWidget {
  final BirthProfileModel? profile;

  const NakshatrasScreen({super.key, this.profile});

  @override
  Widget build(BuildContext context) {
    return BirthChartScreen(
      profile: profile,
      initialTabIndex: 3,
    );
  }
}
