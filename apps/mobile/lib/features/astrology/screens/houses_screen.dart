import 'package:flutter/material.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import 'birth_chart_screen.dart';

/// Standalone entrypoint for Houses / Bhava Screen.
/// Provides direct route access to the 12-house Vedic astrological presentation (initialTabIndex: 2).
class HousesScreen extends StatelessWidget {
  final BirthProfileModel? profile;

  const HousesScreen({super.key, this.profile});

  @override
  Widget build(BuildContext context) {
    return BirthChartScreen(
      profile: profile,
      initialTabIndex: 2,
    );
  }
}
