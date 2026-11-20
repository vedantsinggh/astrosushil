import 'package:flutter/cupertino.dart' show CupertinoSliverRefreshControl;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/screens/simple_screen_kit.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/birth_profile_provider.dart';
import '../widgets/birth_profile_card.dart';
import 'birth_profile_detail_screen.dart';
import 'create_birth_profile_screen.dart';

class BirthProfileListScreen extends ConsumerWidget {
  const BirthProfileListScreen({super.key});

  void _openCreate(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const CreateBirthProfileScreen(),
      ),
    );
  }

  Widget _navBar(bool empty, Future<void> Function() refresh) {
    return AstroSliverNavBar(
      title: 'My Birth Profiles',
      subtitle: empty ? null : 'Tap a profile to see or edit it.',
      actions: [
        AstroNavAction(icon: Icons.refresh_rounded, tooltip: 'Refresh Profiles', onPressed: refresh),
      ],
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    Future<void> refresh() => ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles();

    final List<Widget> content;
    if (state.isLoading && state.profiles.isEmpty) {
      content = [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: AstroStateView.loading(message: 'Loading birth profiles...'),
        ),
      ];
    } else {
      content = [
        if (state.errorMessage != null)
          AstroSliverContent(
            bottom: 12,
            sliver: SliverToBoxAdapter(
              child: ErrorBanner(message: state.errorMessage!, onRetry: refresh),
            ),
          ),
        if (state.profiles.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: SimpleStateView(
              icon: Icons.account_box_outlined,
              iconColor: AppColors.primary,
              title: 'No birth profiles created yet',
              message: 'Add your birth details or create profiles for family members.',
              actionLabel: 'Create Birth Profile',
              actionIcon: Icons.add_rounded,
              onAction: () => _openCreate(context),
            ),
          )
        else
          AstroSliverContent(
            top: 8,
            bottom: 24,
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
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
                          builder: (_) => BirthProfileDetailScreen(profileId: profile.id),
                        ),
                      );
                    },
                  );
                },
                childCount: state.profiles.length,
              ),
            ),
          ),
      ];
    }

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: AstroPlatform.isCupertino(context)
            ? CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  _navBar(state.profiles.isEmpty, refresh),
                  CupertinoSliverRefreshControl(onRefresh: refresh),
                  ...content,
                ],
              )
            : RefreshIndicator(
                onRefresh: refresh,
                edgeOffset: MediaQuery.paddingOf(context).top + AstroMetrics.navBarHeight,
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [_navBar(state.profiles.isEmpty, refresh), ...content],
                ),
              ),
      ),
      bottomNavigationBar: state.profiles.isNotEmpty
          ? SafeArea(
              top: false,
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.navBarFrost,
                  border: Border(top: BorderSide(color: AppColors.separator, width: 0.5)),
                ),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Center(
                  heightFactor: 1,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: AstroMetrics.maxContentWidth),
                    child: SimplePrimaryButton(
                      label: 'New Profile',
                      icon: Icons.add_rounded,
                      onPressed: () => _openCreate(context),
                    ),
                  ),
                ),
              ),
            )
          : null,
    );
  }
}
