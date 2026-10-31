import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/birth_profile_provider.dart';
import '../widgets/birth_profile_card.dart';
import 'birth_profile_detail_screen.dart';
import 'create_birth_profile_screen.dart';

class BirthProfileListScreen extends ConsumerWidget {
  const BirthProfileListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'My Birth Profiles',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            tooltip: 'Refresh Profiles',
            onPressed: () {
              ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles();
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.errorMessage != null) ...[
                  ErrorBanner(
                    message: state.errorMessage!,
                    onRetry: () =>
                        ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles(),
                  ),
                  const SizedBox(height: 16),
                ],
                Expanded(
                  child: state.isLoading && state.profiles.isEmpty
                      ? const LoadingIndicator(message: 'Loading birth profiles...')
                      : state.profiles.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 80,
                                    height: 80,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppColors.primary.withOpacity(0.06),
                                      border: Border.all(color: AppColors.primary.withOpacity(0.15)),
                                    ),
                                    child: const Icon(
                                      Icons.account_box_outlined,
                                      size: 40,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No birth profiles created yet',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.lightTextPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Add your birth details or create profiles for family members.',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.lightTextSecondary,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 24),
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.add),
                                    label: const Text('Create Birth Profile'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => const CreateBirthProfileScreen(),
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: () async {
                                await ref
                                    .read(birthProfilesListNotifierProvider.notifier)
                                    .fetchProfiles();
                              },
                              child: ListView.builder(
                                physics: const AlwaysScrollableScrollPhysics(
                                  parent: BouncingScrollPhysics(),
                                ),
                                itemCount: state.profiles.length,
                                itemBuilder: (context, index) {
                                  final profile = state.profiles[index];
                                  final isCurrentActive = profile.id == activeProfile?.id;

                                  return BirthProfileCard(
                                    profile: profile,
                                    isActive: isCurrentActive,
                                    onSelectActive: () {
                                      ref.read(selectedBirthProfileIdProvider.notifier).state = profile.id;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('${profile.name} set as active profile'),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    onTap: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              BirthProfileDetailScreen(profileId: profile.id),
                                        ),
                                      );
                                    },
                                  );
                                },
                              ),
                            ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: state.profiles.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const CreateBirthProfileScreen(),
                  ),
                );
              },
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.premiumAccent,
              icon: const Icon(Icons.add),
              label: const Text('New Profile', style: TextStyle(fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }
}
