import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../providers/birth_profile_provider.dart';
import '../widgets/birth_profile_card.dart';
import 'birth_profile_detail_screen.dart';
import 'create_birth_profile_screen.dart';

class BirthProfileListScreen extends ConsumerWidget {
  const BirthProfileListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(birthProfilesListNotifierProvider);

    return Scaffold(
      appBar: AstroAppBar(
        title: 'My Birth Profiles',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: () {
              ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
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
                                Icon(
                                  Icons.account_box_outlined,
                                  size: 64,
                                  color: Theme.of(context).colorScheme.secondary,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No birth profiles created yet',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Theme.of(context).colorScheme.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.add),
                                  label: const Text('Create Birth Profile'),
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
                              itemCount: state.profiles.length,
                              itemBuilder: (context, index) {
                                final profile = state.profiles[index];
                                return BirthProfileCard(
                                  profile: profile,
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
      floatingActionButton: state.profiles.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const CreateBirthProfileScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.add),
              label: const Text('New Profile'),
            )
          : null,
    );
  }
}
