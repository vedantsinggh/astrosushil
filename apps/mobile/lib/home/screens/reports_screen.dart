import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/content_language.dart';
import '../../core/localization/locale_provider.dart';
import '../../core/utils/app_date_time.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/reports/models/report_brand_assets.dart';
import '../../features/reports/models/report_catalog_model.dart';
import '../../features/reports/models/report_language.dart';
import '../../features/reports/models/user_report_item_model.dart';
import '../../features/reports/providers/report_catalog_provider.dart';
import '../../features/reports/providers/reports_provider.dart';
import '../../features/reports/screens/report_detail_screen.dart';
import '../../features/reports/screens/report_generation_screen.dart';
import '../../features/reports/screens/report_pdf_viewer_screen.dart';
import '../../shared/widgets/astro_design_system.dart';

/// Optional override for the birth profile new reports are bought for.
/// When null, the app-wide active profile is used.
final selectedReportProfileIdProvider = StateProvider<String?>((ref) => null);

/// The two parts of the Reports tab.
enum ReportsTab { mine, get }

/// Last tab the user picked on the Reports screen, remembered for the
/// session. Null until they pick one; then the default rule no longer applies.
final reportsTabProvider = StateProvider<ReportsTab?>((ref) => null);

enum _ReportFilter { all, ready, preparing, failed }

/// Reports tab.
///
/// 1. Heading
/// 2. "My reports": every report the user owns (ready, being prepared,
///    failed), each with one clear action
/// 3. "Get a report": all 13 canonical Astro Sushil reports with portrait WebP
///    cover art, jewel-tone motif accents, live server pricing, and "Coming Soon"
///    badges for reports without active pricing.
class ReportsScreen extends ConsumerStatefulWidget {
  /// Tab to open on (e.g. [ReportsTab.get] when opened to buy a report).
  /// When null: the tab picked earlier this session, else "My reports" if
  /// the user has at least one report, otherwise "Get a report".
  final ReportsTab? initialTab;

  const ReportsScreen({super.key, this.initialTab});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  _ReportFilter _filter = _ReportFilter.all;

  /// Tab chosen on this screen instance (from [ReportsScreen.initialTab] or
  /// a tap). Takes precedence over the session memory.
  late ReportsTab? _tab = widget.initialTab;

  String? _retryingReportId;

  bool get _isHindi => Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
  String _t(String en, String hi) => _isHindi ? hi : en;

  void _selectTab(ReportsTab tab) {
    setState(() => _tab = tab);
    ref.read(reportsTabProvider.notifier).state = tab;
  }

  /// Default rule: "My reports" when there is at least one report (or while
  /// they are still loading), otherwise "Get a report".
  ReportsTab _defaultTab(AsyncValue<List<UserReportItemModel>> reportsAsync) {
    if (reportsAsync.hasValue) {
      return reportsAsync.value!.isNotEmpty ? ReportsTab.mine : ReportsTab.get;
    }
    return reportsAsync.isLoading ? ReportsTab.mine : ReportsTab.get;
  }

  /// Reloads "My reports" after the user returns from any report flow, so
  /// newly bought or finished reports show up without a restart.
  void _refreshReports() {
    if (!mounted) return;
    ref.invalidate(userReportsProvider);
  }

  Future<void> _push(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    _refreshReports();
  }

  void _addBirthProfile() {
    _push(const CreateBirthProfileScreen());
  }

  void _openEntry(ReportCatalogDisplayEntry entry, BirthProfileModel? profile) {
    if (profile == null) {
      _addBirthProfile();
      return;
    }
    final brand = entry.brand;
    _push(
      ReportDetailScreen(
        reportType: brand.reportType,
        title: entry.title,
        tagline: _isHindi ? brand.taglineHi : brand.tagline,
        description: entry.description,
        priceText: entry.priceText,
        pricePaise: entry.pricePaise,
        icon: brand.icon,
        accentColor: brand.textAccentColor,
        initialProfile: profile,
        includedSections: brand.includedSections,
        availableLanguages: entry.availableLanguages,
        isAvailable: entry.isAvailable,
      ),
    );
  }

  void _openReport(UserReportItemModel report) {
    _push(
      ReportPdfViewerScreen(
        reportId: report.id,
        reportTitle: report.displayTitle,
        clientName: _forNames(report),
        language: report.language,
      ),
    );
  }

  BirthProfileModel? _profileById(List<BirthProfileModel> profiles, String? id) {
    if (id == null) return null;
    for (final p in profiles) {
      if (p.id == id) return p;
    }
    return null;
  }

  void _showProgress(UserReportItemModel report, List<BirthProfileModel> profiles) {
    final profile = _profileById(profiles, report.birthProfileId);
    if (profile == null) {
      _refreshReports();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_t('Status updated.', 'स्थिति अपडेट की गई।'))),
      );
      return;
    }
    _push(
      ReportGenerationScreen(
        reportId: report.id,
        reportType: report.reportType,
        reportTitle: report.displayTitle,
        profile: profile,
        partnerProfile: _profileById(profiles, report.partnerProfileId),
        language: report.language,
      ),
    );
  }

  Future<void> _retry(UserReportItemModel report, List<BirthProfileModel> profiles) async {
    setState(() => _retryingReportId = report.id);
    final notifier = ref.read(reportGenerationNotifierProvider.notifier);
    final newId = await notifier.createReportJob(
      birthProfileId: report.birthProfileId,
      reportType: report.reportType,
      partnerProfileId: report.partnerProfileId,
      forceRegenerate: true,
    );
    if (!mounted) return;
    setState(() => _retryingReportId = null);

    if (newId == null) {
      final genState = ref.read(reportGenerationNotifierProvider);
      final message = reportLanguageErrorText(context.l10n, genState.errorCode) ??
          genState.errorMessage ??
          'Unable to start report generation. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      return;
    }

    _refreshReports();
    final profile = _profileById(profiles, report.birthProfileId);
    if (profile == null) return;
    _push(
      ReportGenerationScreen(
        reportId: newId,
        reportType: report.reportType,
        reportTitle: report.displayTitle,
        profile: profile,
        partnerProfile: _profileById(profiles, report.partnerProfileId),
        language: report.language,
      ),
    );
  }

  Future<void> _onPullToRefresh() async {
    ref.invalidate(reportCatalogProvider);
    ref.invalidate(userReportsProvider);
    try {
      await ref.read(userReportsProvider.future);
    } catch (_) {
      // The error state is shown in the list itself.
    }
  }

  String _forNames(UserReportItemModel r) {
    final partner = r.partnerName;
    if (partner != null && partner.isNotEmpty) return '${r.profileName} & $partner';
    return r.profileName;
  }

  @override
  Widget build(BuildContext context) {
    final profiles = ref.watch(birthProfilesListNotifierProvider).profiles;
    final overrideId = ref.watch(selectedReportProfileIdProvider);
    final activeId = overrideId ?? ref.watch(selectedBirthProfileProvider)?.id;
    final BirthProfileModel? activeProfile = profiles.isEmpty
        ? null
        : (_profileById(profiles, activeId) ?? profiles.first);

    final reportsAsync = ref.watch(userReportsProvider);
    final catalogAsync = ref.watch(reportCatalogProvider);
    final hasReports = reportsAsync.valueOrNull?.isNotEmpty ?? false;
    final canPop = ModalRoute.of(context)?.canPop ?? false;

    final l10n = context.l10n;
    final showTabs = activeProfile != null || hasReports;
    final tab = showTabs ? (_tab ?? ref.watch(reportsTabProvider) ?? _defaultTab(reportsAsync)) : ReportsTab.get;

    final intro = _t(
      'Detailed PDF reports made from your birth chart.',
      'आपकी जन्म कुंडली से बनी विस्तृत PDF रिपोर्ट।',
    );

    return AstroPage(
      title: _t('Reports', 'रिपोर्ट'),
      subtitle: showTabs ? null : intro,
      showBack: canPop,
      onRefresh: _onPullToRefresh,
      navBottom: showTabs
          ? AstroSegmentedNavBottom<ReportsTab>(
              controlKey: const ValueKey('reports-tabs'),
              semanticsLabel: l10n.core2ReportsTabsLabel,
              selected: tab,
              onChanged: _selectTab,
              segments: [
                AstroSegment(value: ReportsTab.mine, label: l10n.core2ReportsTabMine),
                AstroSegment(value: ReportsTab.get, label: l10n.core2ReportsTabGet),
              ],
            )
          : null,
      padding: EdgeInsets.fromLTRB(
        AstroMetrics.gutter,
        showTabs ? 16 : 8,
        AstroMetrics.gutter,
        32 + MediaQuery.paddingOf(context).bottom,
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        child: KeyedSubtree(
          key: ValueKey(tab),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (activeProfile == null) ...[
                _buildNoProfileCard(),
                const SizedBox(height: 24),
              ],
              if (tab == ReportsTab.mine)
                _buildMyReports(reportsAsync, profiles)
              else ...[
                if (showTabs) ...[
                  Text(intro, style: AppTypography.rowSubtitle),
                  const SizedBox(height: 14),
                ],
                _buildCatalog(catalogAsync, activeProfile),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // No birth profile
  // ---------------------------------------------------------------------

  Widget _buildNoProfileCard() {
    return AstroGradientCard(
      key: const ValueKey('reports-no-profile'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.gold.withValues(alpha: 0.14),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
            ),
            child: const Icon(Icons.person_add_alt_1_rounded, color: AppColors.gold, size: 26),
          ),
          const SizedBox(height: 16),
          Text(
            _t('Add your birth details first', 'पहले अपना जन्म विवरण जोड़ें'),
            style: AppTypography.headlineLarge.copyWith(fontSize: 22, color: Colors.white, height: 1.25),
          ),
          const SizedBox(height: 6),
          Text(
            _t(
              'Reports are made from your date, time and place of birth.',
              'रिपोर्ट आपकी जन्म तिथि, समय और स्थान से बनती है।',
            ),
            style: const TextStyle(fontSize: 16, height: 1.45, color: AppColors.textInverseSecondary),
          ),
          const SizedBox(height: 20),
          AstroPrimaryButton(
            label: _t('Add birth details', 'जन्म विवरण जोड़ें'),
            icon: Icons.add_rounded,
            onPressed: _addBirthProfile,
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // My reports
  // ---------------------------------------------------------------------

  Widget _buildMyReports(AsyncValue<List<UserReportItemModel>> reportsAsync, List<BirthProfileModel> profiles) {
    return reportsAsync.when(
      loading: () => _LoadingCard(label: _t('Loading your reports…', 'आपकी रिपोर्ट लोड हो रही हैं…')),
      error: (_, __) => _ErrorCard(
        key: const ValueKey('my-reports-error'),
        message: _t("We couldn't load your reports.", 'आपकी रिपोर्ट लोड नहीं हो सकीं।'),
        retryLabel: context.l10n.commonTryAgain,
        onRetry: () => ref.invalidate(userReportsProvider),
      ),
      data: (reports) {
        if (reports.isEmpty) return _buildEmptyReports();

        final ready = reports.where((r) => r.isCompleted).length;
        final preparing = reports.where((r) => r.isProcessing).length;
        final failed = reports.where((r) => r.isFailed).length;
        final filtered = reports.where((r) {
          switch (_filter) {
            case _ReportFilter.ready:
              return r.isCompleted;
            case _ReportFilter.preparing:
              return r.isProcessing;
            case _ReportFilter.failed:
              return r.isFailed;
            case _ReportFilter.all:
              return true;
          }
        }).toList();

        Widget pill(_ReportFilter f, String label) => AstroPill(
              key: ValueKey('reports-filter-${f.name}'),
              label: label,
              selected: _filter == f,
              onTap: () => setState(() => _filter = f),
            );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (reports.length >= 3) ...[
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  pill(_ReportFilter.all, '${_t('All', 'सभी')} (${reports.length})'),
                  if (ready > 0) pill(_ReportFilter.ready, '${_t('Ready', 'तैयार')} ($ready)'),
                  if (preparing > 0)
                    pill(_ReportFilter.preparing, '${_t('Being prepared', 'बन रही हैं')} ($preparing)'),
                  if (failed > 0) pill(_ReportFilter.failed, '${_t('Failed', 'असफल')} ($failed)'),
                ],
              ),
              const SizedBox(height: 14),
            ],
            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Text(
                  _t('No reports in this group.', 'इस समूह में कोई रिपोर्ट नहीं।'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
                ),
              )
            else
              for (final r in filtered) ...[
                _buildReportItem(r, profiles),
                const SizedBox(height: 12),
              ],
          ],
        );
      },
    );
  }

  Widget _buildEmptyReports() {
    return AstroSurfaceCard(
      key: const ValueKey('my-reports-empty'),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AstroIconSquare(icon: Icons.description_outlined, tint: AstroTint.amber, size: 46),
          const SizedBox(height: 14),
          Text(
            _t('No reports yet', 'अभी कोई रिपोर्ट नहीं'),
            style: AppTypography.headlineLarge.copyWith(fontSize: 20, height: 1.25),
          ),
          const SizedBox(height: 6),
          Text(
            _t('Reports you buy are saved here.', 'आपकी खरीदी गई रिपोर्ट यहाँ रहेंगी।'),
            style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 18),
          AstroPrimaryButton(
            label: _t('Choose a report', 'रिपोर्ट चुनें'),
            icon: Icons.arrow_forward_rounded,
            onPressed: () => _selectTab(ReportsTab.get),
          ),
        ],
      ),
    );
  }

  Widget _buildReportItem(UserReportItemModel report, List<BirthProfileModel> profiles) {
    final date = AppDateTime.formatLocal(report.createdAt, 'd MMM yyyy');
    final names = _forNames(report);
    final isRetrying = _retryingReportId == report.id;
    final languageLine = reportLanguageLine(context.l10n, report.language);
    final brand = report.brandInfo;

    final _StatusStyle status;
    final Widget action;
    if (report.isCompleted) {
      status = _StatusStyle(
        label: _t('Ready', 'तैयार'),
        icon: Icons.check_circle_rounded,
        color: AppColors.tintSageText,
        background: AppColors.successBg,
      );
      action = AstroSecondaryButton(
        key: ValueKey('my-report-open-${report.id}'),
        label: _t('Open report', 'रिपोर्ट खोलें'),
        icon: Icons.picture_as_pdf_rounded,
        onPressed: () => _openReport(report),
      );
    } else if (report.isProcessing) {
      final pct = report.progress.clamp(0, 100);
      status = _StatusStyle(
        label: '${_t('Being prepared', 'बन रही है')} · $pct%',
        icon: Icons.hourglass_top_rounded,
        color: AppColors.goldDark,
        background: AppColors.warningBg,
      );
      action = AstroSecondaryButton(
        key: ValueKey('my-report-progress-${report.id}'),
        label: _t('See progress', 'प्रगति देखें'),
        icon: Icons.autorenew_rounded,
        onPressed: () => _showProgress(report, profiles),
      );
    } else {
      status = _StatusStyle(
        label: _t('Failed', 'असफल'),
        icon: Icons.error_outline_rounded,
        color: AppColors.tintRoseText,
        background: AppColors.errorBg,
      );
      action = AstroSecondaryButton(
        key: ValueKey('my-report-retry-${report.id}'),
        label: isRetrying ? _t('Starting…', 'शुरू हो रही है…') : context.l10n.commonTryAgain,
        icon: Icons.refresh_rounded,
        onPressed: isRetrying ? null : () => _retry(report, profiles),
      );
    }

    return AstroSurfaceCard(
      key: ValueKey('my-report-${report.id}'),
      radius: 18,
      padding: const EdgeInsets.all(16),
      borderColor: brand?.accentColor.withValues(alpha: 0.28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MergeSemantics(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (brand != null)
                  _CoverPreviewThumb(
                    brand: brand,
                    width: 48,
                    cacheWidth: 160,
                    semanticLabel: '${report.displayTitle} cover',
                  )
                else
                  AstroIconSquare(icon: report.icon, tint: AstroTint.indigo, size: 44),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.displayTitle,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        names.isEmpty ? date : '${_t('For', 'के लिए:')} $names · $date',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, height: 1.35, color: AppColors.textSecondary),
                      ),
                      if (languageLine != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          languageLine,
                          key: ValueKey('my-report-language-${report.id}'),
                          style: const TextStyle(fontSize: 14, height: 1.35, color: AppColors.textSecondary),
                        ),
                      ],
                      const SizedBox(height: 10),
                      _StatusChip(style: status),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (report.isFailed && (report.errorMessage?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 6),
            AstroExpander(
              label: _t('Details', 'विवरण'),
              child: Text(
                report.errorMessage!,
                style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary),
              ),
            ),
          ],
          const SizedBox(height: 14),
          action,
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Get a new report (13 canonical Astro Sushil reports + live pricing)
  // ---------------------------------------------------------------------

  Widget _buildCatalog(AsyncValue<Map<String, ReportCatalogItem>> catalogAsync, BirthProfileModel? profile) {
    return catalogAsync.when(
      loading: () => _LoadingCard(label: _t('Loading reports…', 'रिपोर्ट लोड हो रही हैं…')),
      error: (_, __) => _ErrorCard(
        key: const ValueKey('report-catalog-error'),
        message: _t("We couldn't load the reports on offer.", 'उपलब्ध रिपोर्ट लोड नहीं हो सकीं।'),
        retryLabel: context.l10n.commonTryAgain,
        onRetry: () => ref.invalidate(reportCatalogProvider),
      ),
      data: (catalog) {
        final entries = buildCanonicalReportCatalog(catalog);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final entry in entries) ...[
              _OfferCard(
                key: ValueKey('report-offer-${entry.brand.reportType}'),
                entry: entry,
                isHindi: _isHindi,
                comingSoonLabel: _t('Coming Soon', 'जल्द आ रहा है'),
                hindiBadgeLabel: _t('Hindi & English', 'हिन्दी व अंग्रेज़ी'),
                onTap: () => _openEntry(entry, profile),
              ),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}

class _CoverPreviewThumb extends StatelessWidget {
  final ReportBrandInfo brand;
  final double width;
  final int cacheWidth;
  final String semanticLabel;

  const _CoverPreviewThumb({
    required this.brand,
    required this.width,
    required this.cacheWidth,
    required this.semanticLabel,
  });

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: SizedBox(
        width: width,
        child: AspectRatio(
          aspectRatio: 210 / 297,
          child: Container(
            decoration: BoxDecoration(
              color: brand.primaryColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: brand.accentColor.withValues(alpha: 0.5), width: 1),
              boxShadow: [
                BoxShadow(
                  color: brand.primaryColor.withValues(alpha: 0.16),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Image.asset(
              brand.coverAsset,
              fit: BoxFit.cover,
              cacheWidth: cacheWidth,
              filterQuality: FilterQuality.medium,
              semanticLabel: semanticLabel,
              errorBuilder: (_, __, ___) => DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [brand.primaryColor, brand.primaryColor.withValues(alpha: 0.85)],
                  ),
                ),
                child: Center(
                  child: Icon(brand.icon, color: brand.accentColor, size: width * 0.42),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusStyle {
  final String label;
  final IconData icon;
  final Color color;
  final Color background;

  const _StatusStyle({
    required this.label,
    required this.icon,
    required this.color,
    required this.background,
  });
}

class _StatusChip extends StatelessWidget {
  final _StatusStyle style;

  const _StatusChip({required this.style});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 18, color: style.color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              style.label,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: style.color),
            ),
          ),
        ],
      ),
    );
  }
}

/// One of the 13 canonical Astro Sushil report cards: portrait WebP cover
/// preview (`210:297`), jewel-tone motif accent, title, plain-language tagline,
/// and either the live server price or a "Coming Soon" badge.
class _OfferCard extends StatelessWidget {
  final ReportCatalogDisplayEntry entry;
  final bool isHindi;
  final String comingSoonLabel;
  final String hindiBadgeLabel;
  final VoidCallback onTap;

  const _OfferCard({
    super.key,
    required this.entry,
    required this.isHindi,
    required this.comingSoonLabel,
    required this.hindiBadgeLabel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final brand = entry.brand;
    final tagline = isHindi ? brand.taglineHi : brand.tagline;
    final hasHindi = entry.availableLanguages.contains(ContentLanguage.hindi);
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final thumbWidth = textScale > 1.5 ? 62.0 : 76.0;

    final statusAnnouncement = entry.isAvailable ? entry.priceText : comingSoonLabel;
    final semanticsLabel = '${entry.title}, $tagline, $statusAnnouncement. ${brand.motifDescription}';

    return Semantics(
      button: true,
      label: semanticsLabel,
      excludeSemantics: true,
      child: AstroSurfaceCard(
        onTap: onTap,
        radius: 18,
        borderColor: brand.accentColor.withValues(alpha: 0.35),
        padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CoverPreviewThumb(
                brand: brand,
                width: thumbWidth,
                cacheWidth: 240,
                semanticLabel: '${entry.title} cover',
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Subtle jewel-tone motif accent strip
                    Container(
                      width: 28,
                      height: 3.5,
                      decoration: BoxDecoration(
                        color: brand.accentColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      entry.title,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700, height: 1.25),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tagline,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.rowSubtitle,
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (entry.isAvailable)
                          Text(
                            entry.priceText,
                            style: AppTypography.headlineMedium.copyWith(
                              fontSize: 19,
                              color: brand.textAccentColor,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: brand.tintColor,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: brand.accentColor.withValues(alpha: 0.45)),
                            ),
                            child: Text(
                              comingSoonLabel,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: brand.textAccentColor,
                              ),
                            ),
                          ),
                        if (entry.isAvailable && hasHindi)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: brand.tintColor,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              hindiBadgeLabel,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: brand.textAccentColor,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Icon(Icons.chevron_right_rounded, color: brand.textAccentColor.withValues(alpha: 0.7), size: 26),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  final String label;

  const _LoadingCard({required this.label});

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 22),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(width: 24, height: 24, child: CircularProgressIndicator.adaptive(strokeWidth: 2.5)),
          const SizedBox(width: 14),
          Flexible(child: Text(label, style: const TextStyle(fontSize: 16, color: AppColors.textSecondary))),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final String retryLabel;
  final VoidCallback onRetry;

  const _ErrorCard({
    super.key,
    required this.message,
    required this.retryLabel,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AstroIconSquare(icon: Icons.cloud_off_rounded, tint: AstroTint.rose),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(message, style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          AstroSecondaryButton(label: retryLabel, icon: Icons.refresh_rounded, onPressed: onRetry),
        ],
      ),
    );
  }
}
