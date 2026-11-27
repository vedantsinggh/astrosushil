import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/app_date_time.dart';
import '../../core/auth/auth_required_gate.dart';
import '../../core/auth/feature_access_service.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/consultations/models/consultation_errors.dart';
import '../../features/consultations/models/consultation_models.dart';
import '../../features/consultations/providers/consultation_provider.dart';
import '../../features/consultations/widgets/booking_detail_sheet.dart';
import '../../features/consultations/widgets/booking_flow_sheet.dart';
import '../../features/consultations/widgets/consultation_slot_picker.dart';
import '../../features/sushil_explainer/models/explanation_context.dart';
import '../../features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/screens/simple_screen_kit.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_controls.dart' show AstroSegment, AstroSegmentedNavBottom;
import '../../shared/widgets/astro_nav_bar.dart';
import '../../shared/widgets/astro_platform.dart';
import '../../shared/widgets/astro_sheets.dart';

/// The two parts of the Consult tab.
enum ConsultTab { book, bookings }

/// Last tab the user picked on the Consult screen, remembered for the
/// session. Null until they pick one; then the default rule no longer applies.
final consultTabProvider = StateProvider<ConsultTab?>((ref) => null);

/// Consult tab: book a one-on-one session with Sushil Sir and manage bookings.
///
/// Kept deliberately simple for users of all ages. A segmented control pinned
/// under the large title switches between two parts:
/// 1. "Book a session": navy intro card, then one card per service from the
///    server catalogue (mode, duration, earliest slot, price, one "Book Now"
///    button), with mode filter pills when there is more than one mode
/// 2. "My bookings": upcoming bookings with date, time, status and
///    Join / Reschedule / Cancel; past bookings collapsed behind an expander
///
/// Both parts end with "Need help?" (how to prepare, WhatsApp, office
/// contact) and a "Good to know" expander: preparing for and changing a
/// session matter just as much once it is booked.
///
/// Every price, duration, status and meeting link shown here comes from the
/// consultation API. Nothing is invented when data is missing.
class ConsultScreen extends ConsumerStatefulWidget {
  /// Tab to open on (e.g. [ConsultTab.bookings] from a booking reminder).
  /// When null: the tab picked earlier this session, else "My bookings" if
  /// the user has at least one upcoming booking, otherwise "Book a session".
  final ConsultTab? initialTab;

  const ConsultScreen({super.key, this.initialTab});

  @override
  ConsumerState<ConsultScreen> createState() => _ConsultScreenState();
}

enum _LoadPhase { idle, loading, loaded, failed }

/// Office contact details, matching `consultOfficeDetails` in the ARB files.
const String _kOfficePhone = '+919621127233';
const String _kOfficeEmail = 'connect@astrosushil.com';
const String _kWhatsAppNumber = '919621127233';

/// High-contrast text tints for small status text on light tinted surfaces
/// (AppColors.success / error / tint*Text are too faint at 14px).
const Color _kGreenText = Color(0xFF047857);
const Color _kAmberText = Color(0xFF92400E);
const Color _kBlueText = Color(0xFF075985);
const Color _kRedText = Color(0xFFB91C1C);

class _ConsultScreenState extends ConsumerState<ConsultScreen> {
  String _modeFilter = 'ALL';

  /// Tab chosen on this screen instance (from [ConsultScreen.initialTab] or
  /// a tap). Takes precedence over the session memory.
  late ConsultTab? _tab = widget.initialTab;

  /// Default tab, fixed once the bookings have loaded (or failed), so it
  /// does not jump away when the last upcoming booking is cancelled.
  ConsultTab? _settledDefault;

  void _selectTab(ConsultTab tab) {
    setState(() => _tab = tab);
    ref.read(consultTabProvider.notifier).state = tab;
  }

  /// Default rule: "My bookings" when the user has at least one upcoming
  /// booking; otherwise (none, still loading, load failed, signed out)
  /// "Book a session".
  ConsultTab _defaultTab(ConsultationState state, bool isSignedIn) {
    if (_settledDefault != null) return _settledDefault!;
    if (!isSignedIn) return ConsultTab.book;
    switch (_bookingsPhase) {
      case _LoadPhase.loaded:
        return _settledDefault = state.myBookings.any(_isUpcoming) ? ConsultTab.bookings : ConsultTab.book;
      case _LoadPhase.failed:
        return _settledDefault = ConsultTab.book;
      case _LoadPhase.idle:
      case _LoadPhase.loading:
        return ConsultTab.book;
    }
  }

  // The notifier shares one isLoading / errorMessage between the catalogue
  // and the bookings, so loads are run one after another and their outcome is
  // recorded here. Otherwise a bookings load could hide a catalogue error (or
  // the other way round).
  Future<void> _queue = Future<void>.value();
  _LoadPhase _catalogPhase = _LoadPhase.loading;
  _LoadPhase _bookingsPhase = _LoadPhase.idle;

  bool get _isHindi => Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
  String _t(String en, String hi) => _isHindi ? hi : en;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _serial(_recordInitialCatalog);
      _loadBookings();
    });
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  Future<void> _serial(Future<void> Function() task) {
    final next = _queue.then((_) => mounted ? task() : Future<void>.value());
    _queue = next.catchError((Object _) {});
    return next;
  }

  /// Completes once the notifier is no longer loading.
  Future<void> _waitUntilIdle() {
    if (!ref.read(consultationNotifierProvider).isLoading) return Future<void>.value();
    final completer = Completer<void>();
    late final ProviderSubscription<ConsultationState> sub;
    sub = ref.listenManual<ConsultationState>(consultationNotifierProvider, (prev, next) {
      if (!next.isLoading && !completer.isCompleted) {
        completer.complete();
        sub.close();
      }
    });
    return completer.future;
  }

  /// The notifier loads the catalogue on creation; record how that went.
  Future<void> _recordInitialCatalog() async {
    await _waitUntilIdle();
    if (!mounted) return;
    final s = ref.read(consultationNotifierProvider);
    setState(() {
      _catalogPhase = s.catalog.isEmpty && s.errorMessage != null ? _LoadPhase.failed : _LoadPhase.loaded;
    });
  }

  Future<void> _reloadCatalog() {
    setState(() => _catalogPhase = _LoadPhase.loading);
    return _serial(() async {
      await _waitUntilIdle();
      await ref.read(consultationNotifierProvider.notifier).loadCatalog();
      if (!mounted) return;
      final s = ref.read(consultationNotifierProvider);
      setState(() {
        _catalogPhase = s.catalog.isEmpty && s.errorMessage != null ? _LoadPhase.failed : _LoadPhase.loaded;
      });
    });
  }

  Future<void> _loadBookings() {
    if (!ref.read(authStateProvider).isAuthenticated) {
      if (_bookingsPhase != _LoadPhase.idle) setState(() => _bookingsPhase = _LoadPhase.idle);
      return Future<void>.value();
    }
    setState(() => _bookingsPhase = _LoadPhase.loading);
    return _serial(() async {
      await _waitUntilIdle();
      await ref.read(consultationNotifierProvider.notifier).loadMyBookings();
      if (!mounted) return;
      final failed = ref.read(consultationNotifierProvider).errorMessage != null;
      setState(() => _bookingsPhase = failed ? _LoadPhase.failed : _LoadPhase.loaded);
    });
  }

  Future<void> _refreshAll() async {
    final catalog = _reloadCatalog();
    final bookings = _loadBookings();
    await Future.wait([catalog, bookings]);
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  void _book(ConsultationOfferingModel offering) {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.payments,
      featureTitle: context.l10n.consultBookingTitle,
      onAllowed: () async {
        await BookingFlowSheet.show(context, offering);
        if (mounted) unawaited(_loadBookings());
      },
    );
  }

  void _signInForBookings() {
    AuthRequiredGate.showAuthRequiredModal(
      context: context,
      featureTitle: context.l10n.consultTabsMyAppointments,
      onAuthenticated: _loadBookings,
    );
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message, style: const TextStyle(fontSize: 16))));
  }

  Future<void> _copy(String text) async {
    try {
      await Clipboard.setData(ClipboardData(text: text));
    } catch (_) {
      // Clipboard unavailable; the snack bar still shows the value's purpose.
    }
  }

  Future<bool> _tryLaunch(Uri uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  Future<void> _joinSession(String link) async {
    final uri = Uri.tryParse(link);
    final ok = uri != null && (uri.scheme == 'https' || uri.scheme == 'http') && await _tryLaunch(uri);
    if (!ok) {
      unawaited(_copy(link));
      _showSnack(_t(
        'Could not open the link. It is copied, paste it in your browser.',
        'लिंक नहीं खुल सका। लिंक कॉपी हो गया है, इसे ब्राउज़र में खोलें।',
      ));
    }
  }

  Future<void> _openWhatsApp({String? bookingRef}) async {
    final text = bookingRef == null || bookingRef.isEmpty
        ? 'Namaste Astro Sushil Ji, I would like to inquire about an astrological consultation.'
        : 'Namaste Astro Sushil Ji, I would like to reschedule my consultation booking $bookingRef.';
    final uri = Uri.parse('https://wa.me/$_kWhatsAppNumber?text=${Uri.encodeComponent(text)}');
    final ok = await _tryLaunch(uri);
    if (!ok && mounted) _showContactDialog();
  }

  Future<void> _callOffice() async {
    final ok = await _tryLaunch(Uri(scheme: 'tel', path: _kOfficePhone));
    if (!ok) {
      unawaited(_copy(_kOfficePhone));
      _showSnack(_t('Phone number copied', 'फ़ोन नंबर कॉपी हो गया'));
    }
  }

  Future<void> _emailOffice() async {
    final ok = await _tryLaunch(Uri(scheme: 'mailto', path: _kOfficeEmail));
    if (!ok) {
      unawaited(_copy(_kOfficeEmail));
      _showSnack(_t('Email copied', 'ईमेल कॉपी हो गया'));
    }
  }

  // ── Choice sheets ───────────────────────────────────────────────────────
  // Shared adaptive action sheet: native CupertinoActionSheet on iOS / macOS,
  // the matching rounded Material sheet elsewhere.

  bool get _isCupertino => AstroPlatform.isCupertino(context);

  Future<void> _showChoices({
    required String title,
    required String message,
    required List<_Choice> choices,
    required String closeLabel,
  }) async {
    final picked = await showAstroActionSheet<VoidCallback>(
      context: context,
      title: title,
      message: message,
      cancelLabel: closeLabel,
      actions: [
        for (final c in choices)
          AstroSheetAction<VoidCallback>(
            key: c.key,
            label: c.label,
            icon: c.icon,
            value: c.onTap,
            isDestructive: c.destructive,
          ),
      ],
    );
    if (!mounted) return;
    picked?.call();
  }

  void _showContactDialog() {
    final l10n = context.l10n;
    _showChoices(
      title: l10n.consultContactOffice,
      message: l10n.consultOfficeDetails,
      closeLabel: l10n.close,
      choices: [
        _Choice(
          key: const ValueKey('consult_call_office'),
          label: _t('Call office', 'ऑफ़िस को कॉल करें'),
          icon: Icons.call_outlined,
          onTap: _callOffice,
        ),
        _Choice(
          key: const ValueKey('consult_email_office'),
          label: _t('Send email', 'ईमेल भेजें'),
          icon: Icons.mail_outline_rounded,
          onTap: _emailOffice,
        ),
      ],
    );
  }

  void _showDetails(ConsultationBookingModel booking) {
    BookingDetailSheet.show(
      context,
      booking,
      statusLabel: _statusStyle(booking).label,
      modeLabel: _modeLabel(_modeKey(booking.consultationMode)),
    );
  }

  void _confirmCancel(ConsultationBookingModel booking) {
    final l10n = context.l10n;
    final which = booking.bookingReference.isNotEmpty
        ? _t('booking ${booking.bookingReference}', 'बुकिंग ${booking.bookingReference}')
        : _t('this booking', 'यह बुकिंग');
    _showChoices(
      title: l10n.consultCancel,
      message: _t('Are you sure you want to cancel $which? ${l10n.consultBkCancelNoAutoRefund}',
          'क्या आप $which रद्द करना चाहते हैं? ${l10n.consultBkCancelNoAutoRefund}'),
      closeLabel: _t('Keep Appointment', 'बुकिंग रखें'),
      choices: [
        _Choice(
          key: const ValueKey('consult_cancel_confirm'),
          label: _t('Yes, Cancel', 'हाँ, रद्द करें'),
          icon: Icons.cancel_outlined,
          destructive: true,
          onTap: () => _cancel(booking),
        ),
      ],
    );
  }

  Future<void> _cancel(ConsultationBookingModel booking) {
    return _serial(() async {
      await _waitUntilIdle();
      final notifier = ref.read(consultationNotifierProvider.notifier);
      final ok = await notifier.cancelBooking(bookingId: booking.id, reason: 'Client requested via app');
      if (!mounted) return;
      final s = ref.read(consultationNotifierProvider);
      if (ok) {
        _showSnack(_t('Appointment cancelled.', 'बुकिंग रद्द हो गई।'));
      } else {
        // The server's rule, as a message: a cancelled or completed booking
        // cannot be cancelled again.
        final l10n = context.l10n;
        final failure = s.actionFailure;
        final String message;
        if (failure == null || failure.kind == ConsultationErrorKind.unknown) {
          message = l10n.consultBkCancelFailed;
        } else if (failure.kind == ConsultationErrorKind.notAllowedForStatus) {
          message = l10n.consultBkErrAlreadyClosed;
        } else {
          message = consultationFailureMessage(l10n, failure);
        }
        _showSnack(message);
        // The list may be out of date (already cancelled elsewhere).
        if (failure != null && !failure.isRetryable) unawaited(_loadBookings());
      }
      notifier.clearActionFailure();
      notifier.clearError();
      notifier.clearSuccess();
    });
  }

  void _openPreparationGuide(ConsultationState state) {
    final hi = _isHindi;
    SushilExplainerSheet.show(
      context,
      explanationContext: ExplanationContext(
        feature: 'consultation_prep',
        screenTitle: hi ? 'परामर्श की तैयारी' : 'Consultation Preparation',
        language: hi ? 'hi' : 'en',
        data: {
          'availableServices': state.catalog.map((c) => c.title).toList(),
          'note': 'Guidelines on birth time verification, specific queries, and ethical boundaries.',
        },
      ),
    );
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(consultationNotifierProvider);
    ref.watch(localeProvider);
    final isSignedIn = ref.watch(authStateProvider.select((a) => a.isAuthenticated));

    ref.listen<bool>(authStateProvider.select((a) => a.isAuthenticated), (prev, next) {
      if (next != prev) _loadBookings();
    });

    // When pushed as its own page (e.g. from a notification) show a
    // labelled Back button; as a bottom-navigation tab there is nothing to go
    // back to.
    final isPushed = ModalRoute.of(context)?.canPop ?? false;
    final tab = _tab ?? ref.watch(consultTabProvider) ?? _defaultTab(state, isSignedIn);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: DefaultTextStyle.merge(
        // Body font with fallbacks so Devanagari always has a glyph source.
        style:
            const TextStyle(fontFamily: AppTypography.bodyFamily, fontFamilyFallback: AppTypography.bodyFontFamilies),
        child: LayoutBuilder(
          builder: (context, constraints) {
            // Same gutter / tablet width cap as every other tab root.
            const maxContent = AstroMetrics.maxContentWidth;
            final side = constraints.maxWidth > maxContent + 2 * AstroMetrics.gutter
                ? (constraints.maxWidth - maxContent) / 2
                : AstroMetrics.gutter;
            final bottomInset = MediaQuery.paddingOf(context).bottom;
            final cupertino = _isCupertino;
            final scroll = CustomScrollView(
              // iOS: bounce + Cupertino pull-to-refresh. Android: platform
              // default (clamping / stretch) + Material RefreshIndicator.
              physics: cupertino
                  ? const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics())
                  : const AlwaysScrollableScrollPhysics(),
              slivers: [
                AstroSliverNavBar(
                  key: const ValueKey('consult_nav_bar'),
                  title: l10n.navConsult,
                  showBack: isPushed,
                  // Pinned under the large title, so switching stays one tap away.
                  bottom: AstroSegmentedNavBottom<ConsultTab>(
                    controlKey: const ValueKey('consult_tabs'),
                    semanticsLabel: l10n.core2ConsultTabsLabel,
                    selected: tab,
                    onChanged: _selectTab,
                    segments: [
                      AstroSegment(value: ConsultTab.book, label: l10n.core2ConsultTabBook),
                      AstroSegment(value: ConsultTab.bookings, label: l10n.core2ConsultTabBookings),
                    ],
                  ),
                ),
                if (cupertino) CupertinoSliverRefreshControl(onRefresh: _refreshAll),
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(side, 16, side, 32 + bottomInset),
                  sliver: SliverToBoxAdapter(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 180),
                      layoutBuilder: (current, previous) => Stack(
                        alignment: Alignment.topCenter,
                        children: [...previous, if (current != null) current],
                      ),
                      child: KeyedSubtree(
                        key: ValueKey(tab),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (tab == ConsultTab.book) ...[
                              _IntroCard(title: l10n.consultTitle, text: l10n.consultSubtitle),
                              const SizedBox(height: 20),
                              ..._buildServices(state),
                            ] else
                              ..._buildBookings(state, isSignedIn),
                            const SizedBox(height: 28),
                            SimpleSectionLabel(_t('Need help?', 'सहायता चाहिए?')),
                            _buildHelp(state),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
            return cupertino ? scroll : RefreshIndicator(onRefresh: _refreshAll, child: scroll);
          },
        ),
      ),
    );
  }

  // ── Services ────────────────────────────────────────────────────────────

  List<Widget> _buildServices(ConsultationState state) {
    final catalog = state.catalog;

    if (catalog.isEmpty) {
      if (_catalogPhase == _LoadPhase.failed) {
        return [
          _MessageCard(
            key: const ValueKey('consult_catalog_error'),
            icon: Icons.cloud_off_rounded,
            iconColor: _kRedText,
            text: _t('Could not load services. Please check your internet.',
                'सेवाएँ लोड नहीं हो सकीं। कृपया इंटरनेट जाँचें।'),
            actionLabel: context.l10n.retry,
            onAction: _reloadCatalog,
          ),
        ];
      }
      if (_catalogPhase == _LoadPhase.loading || state.isLoading) {
        return [_LoadingCard(text: _t('Loading services…', 'सेवाएँ लोड हो रही हैं…'))];
      }
      return [
        _MessageCard(
          icon: Icons.event_busy_outlined,
          text: _t('No consultations are open for booking right now. Please check back later.',
              'अभी कोई परामर्श बुकिंग के लिए उपलब्ध नहीं है। कृपया बाद में देखें।'),
          actionLabel: context.l10n.retry,
          onAction: _reloadCatalog,
        ),
      ];
    }

    final modes = <String>[];
    for (final o in catalog) {
      final m = _modeKey(o.mode);
      if (!modes.contains(m)) modes.add(m);
    }
    final filter = modes.contains(_modeFilter) ? _modeFilter : 'ALL';
    final visible = filter == 'ALL' ? catalog : catalog.where((o) => _modeKey(o.mode) == filter).toList();

    return [
      if (modes.length > 1) ...[
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            SimpleChoicePill(
              key: const ValueKey('consult_filter_ALL'),
              label: context.l10n.consultFilterAll,
              selected: filter == 'ALL',
              onTap: () => setState(() => _modeFilter = 'ALL'),
            ),
            for (final m in modes)
              SimpleChoicePill(
                key: ValueKey('consult_filter_$m'),
                label: _modeLabel(m),
                selected: filter == m,
                onTap: () => setState(() => _modeFilter = m),
              ),
          ],
        ),
        const SizedBox(height: 14),
      ],
      for (final o in visible) ...[
        _ServiceCard(
          key: ValueKey('consult_service_${o.sku}'),
          offering: o,
          title: _isHindi && (o.hindiTitle?.isNotEmpty ?? false) ? o.hindiTitle! : o.title,
          description: _isHindi && (o.hindiDescription?.isNotEmpty ?? false) ? o.hindiDescription! : o.description,
          modeIcon: _modeIcon(_modeKey(o.mode)),
          tint: _ModeTint.of(_modeKey(o.mode)),
          modeLabel: _modeLabel(_modeKey(o.mode)),
          durationLabel: o.durationMinutes > 0 ? context.l10n.consultDurationMin(o.durationMinutes) : null,
          noticeLabel: o.responseDaysNotice > 0
              ? _t('Earliest in ${o.responseDaysNotice} days', 'सबसे जल्दी ${o.responseDaysNotice} दिन में')
              : null,
          // What the customer pays, GST included (added on top of the listed
          // price when the consultation's GST is exclusive).
          priceLabel: o.pricePaise > 0 ? formatInrPaise(o.pricePaise) : null,
          taxLabel: _taxLabel(o),
          noPriceLabel: _t('Price not available', 'कीमत उपलब्ध नहीं'),
          unavailableLabel: _t('Not available now', 'अभी उपलब्ध नहीं'),
          bookLabel: context.l10n.consultBookNow,
          onBook: o.isAvailable && o.pricePaise > 0 ? () => _book(o) : null,
        ),
        const SizedBox(height: 12),
      ],
    ];
  }

  // ── Bookings ────────────────────────────────────────────────────────────

  List<Widget> _buildBookings(ConsultationState state, bool isSignedIn) {
    if (!isSignedIn) {
      return [
        _MessageCard(
          key: const ValueKey('consult_bookings_signin'),
          icon: Icons.lock_outline_rounded,
          text: _t('Sign in to see your bookings.', 'अपनी बुकिंग देखने के लिए साइन इन करें।'),
          actionLabel: context.l10n.signIn,
          actionIcon: Icons.login_rounded,
          onAction: _signInForBookings,
        ),
      ];
    }

    final bookings = state.myBookings;
    if (bookings.isEmpty) {
      if (_bookingsPhase == _LoadPhase.failed) {
        return [
          _MessageCard(
            key: const ValueKey('consult_bookings_error'),
            icon: Icons.cloud_off_rounded,
            iconColor: _kRedText,
            text: _t('Could not load your bookings.', 'आपकी बुकिंग लोड नहीं हो सकी।'),
            actionLabel: context.l10n.retry,
            onAction: _loadBookings,
          ),
        ];
      }
      if (_bookingsPhase != _LoadPhase.loaded) {
        return [_LoadingCard(text: _t('Loading your bookings…', 'आपकी बुकिंग लोड हो रही है…'))];
      }
    }

    final upcoming = bookings.where(_isUpcoming).toList();
    final past = bookings.where((b) => !_isUpcoming(b)).toList();

    return [
      if (_bookingsPhase == _LoadPhase.failed && bookings.isNotEmpty) ...[
        SimpleNote(
          icon: Icons.info_outline_rounded,
          color: _kAmberText,
          text: _t('Could not refresh. Pull down to try again.',
              'रीफ़्रेश नहीं हो सका। फिर से कोशिश करने के लिए नीचे खींचें।'),
        ),
        const SizedBox(height: 12),
      ],
      if (bookings.isEmpty)
        _EmptyBookingsCard(
          key: const ValueKey('consult_bookings_empty'),
          title: context.l10n.core2ConsultBookingsEmptyTitle,
          text: context.l10n.core2ConsultBookingsEmptyBody,
          actionLabel: context.l10n.core2ConsultTabBook,
          onAction: () => _selectTab(ConsultTab.book),
        )
      else if (upcoming.isEmpty)
        _MessageCard(
          key: const ValueKey('consult_bookings_empty'),
          icon: Icons.event_note_outlined,
          text: _t('No upcoming bookings.', 'कोई आने वाली बुकिंग नहीं।'),
        )
      else
        // iOS inset-grouped section: one rounded group, rows split by hairlines.
        SimpleGroupCard(
          key: const ValueKey('consult_upcoming_group'),
          children: [for (final b in upcoming) _bookingCard(b, showActions: true)],
        ),
      if (past.isNotEmpty) ...[
        const SizedBox(height: 4),
        SimpleExpander(
          key: const ValueKey('consult_past_bookings'),
          label: _t('Past bookings (${past.length})', 'पिछली बुकिंग (${past.length})'),
          child: SimpleGroupCard(
            children: [for (final b in past) _bookingCard(b, showActions: false)],
          ),
        ),
      ],
    ];
  }

  /// An unpaid booking whose 15-minute hold has run out is no longer coming
  /// up: its time is free again (the server cancels it shortly after).
  bool _isUpcoming(ConsultationBookingModel b) =>
      b.isConfirmed || b.isRescheduled || (b.isPendingPayment && !b.isHoldExpired());

  /// GST line under a price. Null when the consultation carries no GST.
  String? _taxLabel(ConsultationOfferingModel o) {
    final l10n = context.l10n;
    // Older catalogue entries without a GST breakdown.
    if (o.gstPaise == null) return l10n.consultInclusiveGST;
    if (!o.hasGst) return null;
    if (o.gstAddedOnTop) {
      return l10n.consultBkCardGstAdded(formatInrPaise(o.amountBeforeGstPaise), formatInrPaise(o.gstPaise!));
    }
    final percent = o.gstPercentLabel;
    return percent == null ? l10n.consultBkGstIncludedPlain : l10n.consultBkCardGstIncluded(percent);
  }

  Widget _bookingCard(ConsultationBookingModel b, {required bool showActions}) {
    final l10n = context.l10n;
    final status = _statusStyle(b);
    final mode = _modeKey(b.consultationMode);
    final hasLink = b.meetingLink != null && b.meetingLink!.trim().isNotEmpty;
    final canJoin = (b.isConfirmed || b.isRescheduled) && hasLink;
    final canCancel = b.isConfirmed || b.isPendingPayment || b.isRescheduled;

    String? hint;
    // A message consultation's answer is shown on past (answered) bookings too.
    if (showActions || mode == 'CHAT') {
      if (mode == 'CHAT') {
        // WhatsApp message consultation: no session to join; the answer appears here.
        hint = b.responseText != null && b.responseText!.trim().isNotEmpty
            ? _t('Answer from Astro Sushil:\n${b.responseText!.trim()}', 'एस्ट्रो सुशील का उत्तर:\n${b.responseText!.trim()}')
            : _t('Send your question on WhatsApp. The written answer will appear here.', 'अपना प्रश्न व्हाट्सऐप पर भेजें। लिखित उत्तर यहाँ दिखेगा।');
      } else if ((b.isConfirmed || b.isRescheduled) && !hasLink && mode != 'IN_PERSON') {
        hint = _t('The Join button appears here before your session.', 'सत्र से पहले यहाँ जुड़ने का बटन दिखेगा।');
      } else if (b.isPendingPayment) {
        final heldUntil = b.reservationExpiresAt;
        hint = heldUntil == null
            ? _t('Payment is not complete yet.', 'भुगतान अभी पूरा नहीं हुआ है।')
            : l10n.consultBkHintHeldUntil(consultationIstTime(heldUntil));
      }
    } else if (b.isReservationExpired || b.isHoldExpired()) {
      hint = l10n.consultBkHintHoldEnded;
    }

    return _BookingCard(
      key: ValueKey('consult_booking_${b.id}'),
      title: b.serviceTitle,
      statusLabel: status.label,
      statusText: status.text,
      statusBg: status.bg,
      reference:
          b.bookingReference.isNotEmpty ? _t('Ref: ${b.bookingReference}', 'संदर्भ: ${b.bookingReference}') : null,
      dateLabel: _formatDate(b.appointmentDate),
      timeLabel:
          b.startTime.isEmpty ? null : (b.endTime.isEmpty ? '${b.startTime} IST' : '${b.startTime} – ${b.endTime} IST'),
      modeIcon: _modeIcon(mode),
      modeLabel: _modeLabel(mode),
      query: b.query,
      hint: hint,
      onDetails: () => _showDetails(b),
      detailsKey: ValueKey('consult_details_${b.id}'),
      detailsLabel: l10n.consultBkViewDetails,
      actions: !showActions
          ? const []
          : [
              if (canJoin)
                _JoinButton(
                  key: ValueKey('consult_join_${b.id}'),
                  label: l10n.consultJoinSession,
                  icon: mode == 'AUDIO' ? Icons.call_rounded : Icons.videocam_rounded,
                  onPressed: () => _joinSession(b.meetingLink!.trim()),
                ),
              if (canCancel)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _SmallOutlineButton(
                      key: ValueKey('consult_cancel_${b.id}'),
                      label: l10n.consultCancel,
                      icon: Icons.close_rounded,
                      color: _kRedText,
                      onPressed: () => _confirmCancel(b),
                    ),
                  ],
                ),
            ],
    );
  }

  // ── Help ────────────────────────────────────────────────────────────────

  Widget _buildHelp(ConsultationState state) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SimpleGroupCard(
          children: [
            SimpleListRow(
              key: const ValueKey('consult_prepare'),
              icon: Icons.record_voice_over_outlined,
              title: _t('How to prepare for consultation', 'परामर्श की तैयारी कैसे करें?'),
              onTap: () => _openPreparationGuide(state),
            ),
            SimpleListRow(
              key: const ValueKey('consult_whatsapp'),
              icon: Icons.chat_outlined,
              iconColor: _kGreenText,
              title: l10n.consultInquireWhatsApp,
              onTap: () => _openWhatsApp(),
            ),
            SimpleListRow(
              key: const ValueKey('consult_contact'),
              icon: Icons.support_agent_rounded,
              title: l10n.consultContactOffice,
              onTap: () => _showContactDialog(),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SimpleExpander(
          key: const ValueKey('consult_good_to_know'),
          label: _t('Good to know', 'ज़रूरी जानकारी'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final line in [
                l10n.consultTimeZoneNotice,
                l10n.consultPrepare1,
                l10n.consultPrepare2,
                l10n.consultBkChangePolicy,
                l10n.consultPrivacyReassurance,
              ])
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Icon(Icons.circle, size: 6, color: AppColors.textSecondary),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(line,
                            style: const TextStyle(fontSize: 16, height: 1.45, color: AppColors.textPrimary)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /// Normalises API modes (AUDIO / VIDEO / IN_PERSON, plus legacy
  /// ONLINE_VOICE / ONLINE_VIDEO) to one key.
  static String _modeKey(String mode) {
    final m = mode.toUpperCase();
    if (m.contains('PERSON')) return 'IN_PERSON';
    if (m.contains('AUDIO') || m.contains('VOICE') || m.contains('PHONE')) return 'AUDIO';
    if (m.contains('CHAT') || m.contains('MESSAGE')) return 'CHAT';
    return 'VIDEO';
  }

  String _modeLabel(String key) {
    switch (key) {
      case 'AUDIO':
        return _t('Phone call', 'फ़ोन कॉल');
      case 'IN_PERSON':
        return _t('In person', 'आमने-सामने');
      case 'CHAT':
        return _t('WhatsApp message', 'व्हाट्सऐप संदेश');
      default:
        return _t('Video call', 'वीडियो कॉल');
    }
  }

  static IconData _modeIcon(String key) {
    switch (key) {
      case 'AUDIO':
        return Icons.phone_in_talk_outlined;
      case 'IN_PERSON':
        return Icons.handshake_outlined;
      case 'CHAT':
        return Icons.chat_bubble_outline_rounded;
      default:
        return Icons.videocam_outlined;
    }
  }

  ({String label, Color text, Color bg}) _statusStyle(ConsultationBookingModel b) {
    final l10n = context.l10n;
    switch (b.status) {
      case 'CONFIRMED':
        return (label: l10n.consultStatusConfirmed, text: _kGreenText, bg: AppColors.tintSageBg);
      case 'PENDING_PAYMENT':
      case 'RESERVED':
        if (b.isHoldExpired()) {
          return (label: l10n.consultBkStatusNotPaid, text: AppColors.textSecondary, bg: AppColors.disabledSurface);
        }
        return (label: l10n.consultStatusPending, text: _kAmberText, bg: AppColors.tintAmberBg);
      case 'RESCHEDULED':
        return (label: l10n.consultStatusRescheduled, text: _kBlueText, bg: AppColors.tintSkyBg);
      case 'CANCELLED':
        return (label: l10n.consultStatusCancelled, text: _kRedText, bg: AppColors.tintRoseBg);
      case 'COMPLETED':
        return (label: l10n.consultStatusCompleted, text: AppColors.textSecondary, bg: AppColors.disabledSurface);
      case 'NO_SHOW':
        return (label: _t('Missed', 'छूट गया'), text: _kAmberText, bg: AppColors.tintAmberBg);
      case 'REFUNDED':
        return (label: _t('Refunded', 'राशि वापस'), text: AppColors.textSecondary, bg: AppColors.disabledSurface);
      default:
        final raw = b.status.replaceAll('_', ' ').toLowerCase();
        final label = raw.isEmpty ? '-' : '${raw[0].toUpperCase()}${raw.substring(1)}';
        return (label: label, text: AppColors.textSecondary, bg: AppColors.disabledSurface);
    }
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return _t('Date to be confirmed', 'तारीख तय होनी है');
    // appointmentDate is an IST calendar date (yyyy-MM-dd); never shift it.
    return AppDateTime.formatCalendarDate(iso, 'EEE, d MMM yyyy');
  }
}

// ── Presentation widgets ──────────────────────────────────────────────────

class _IntroCard extends StatelessWidget {
  final String title;
  final String text;

  const _IntroCard({required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.indigoDark, AppColors.tertiary],
        ),
        boxShadow: [
          BoxShadow(color: AppColors.primary.withValues(alpha: 0.10), blurRadius: 16, offset: const Offset(0, 4)),
        ],
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 68,
                  height: 68,
                  padding: const EdgeInsets.all(2.5),
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.gold),
                  child: ClipOval(
                    child: Container(
                      color: AppColors.cardSurface,
                      child: Image.asset(
                        AppAssets.sushilAvatar,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            const Icon(Icons.person_rounded, size: 34, color: AppColors.primary),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 28,
                        height: 3,
                        decoration: BoxDecoration(color: AppColors.gold, borderRadius: BorderRadius.circular(2)),
                      ),
                      const SizedBox(height: 10),
                      MediaQuery.withClampedTextScaling(
                        maxScaleFactor: 1.5,
                        child: Text(
                          title,
                          style: const TextStyle(
                              fontSize: 21, height: 1.25, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              text,
              style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textInverseSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  final Widget child;
  final bool elevated;

  const _CardShell({required this.child, this.elevated = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: elevated ? AppColors.cardBorderSubtle : AppColors.cardBorder),
        boxShadow: elevated
            ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 3))]
            : null,
      ),
      child: child,
    );
  }
}

class _Choice {
  final Key key;
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool destructive;

  const _Choice({
    required this.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.destructive = false,
  });
}

/// Tinted icon square colours per consultation mode (text-safe contrast).
class _ModeTint {
  final Color fg;
  final Color bg;

  const _ModeTint(this.fg, this.bg);

  static _ModeTint of(String key) {
    switch (key) {
      case 'AUDIO':
        return const _ModeTint(Color(0xFF0369A1), AppColors.tintSkyBg);
      case 'IN_PERSON':
        return const _ModeTint(Color(0xFFB45309), AppColors.tintAmberBg);
      case 'CHAT':
        return const _ModeTint(_kGreenText, AppColors.tintSageBg);
      default:
        return const _ModeTint(AppColors.tintVioletText, AppColors.tintVioletBg);
    }
  }
}

class _InfoLine extends StatelessWidget {
  final IconData icon;
  final String text;
  final int? maxLines;
  final bool emphasise;

  const _InfoLine({required this.icon, required this.text, this.maxLines, this.emphasise = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(icon, size: 20, color: AppColors.textSecondary),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              maxLines: maxLines,
              overflow: maxLines == null ? null : TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                height: 1.35,
                fontWeight: emphasise ? FontWeight.w600 : FontWeight.w400,
                color: emphasise ? AppColors.textPrimary : AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final ConsultationOfferingModel offering;
  final String title;
  final String description;
  final IconData modeIcon;
  final _ModeTint tint;
  final String modeLabel;
  final String? durationLabel;
  final String? noticeLabel;
  final String? priceLabel;
  final String? taxLabel;
  final String noPriceLabel;
  final String unavailableLabel;
  final String bookLabel;
  final VoidCallback? onBook;

  const _ServiceCard({
    super.key,
    required this.offering,
    required this.title,
    required this.description,
    required this.modeIcon,
    required this.tint,
    required this.modeLabel,
    required this.durationLabel,
    required this.noticeLabel,
    required this.priceLabel,
    required this.taxLabel,
    required this.noPriceLabel,
    required this.unavailableLabel,
    required this.bookLabel,
    required this.onBook,
  });

  @override
  Widget build(BuildContext context) {
    final meta = [modeLabel, if (durationLabel != null) durationLabel!].join(' · ');
    return _CardShell(
      elevated: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SimpleIconBadge(icon: modeIcon, color: tint.fg, background: tint.bg, size: 52),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    height: 1.3,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              description,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary),
            ),
          ],
          const SizedBox(height: 6),
          _InfoLine(icon: Icons.schedule_rounded, text: meta, emphasise: true),
          if (noticeLabel != null) _InfoLine(icon: Icons.event_available_outlined, text: noticeLabel!),
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.cardBorderSubtle),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 12,
              children: [
                if (priceLabel != null)
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        priceLabel!,
                        style: const TextStyle(
                          fontSize: 26,
                          height: 1.15,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                          color: AppColors.primary,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      if (taxLabel != null) ...[
                        const SizedBox(height: 2),
                        Text(taxLabel!, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                      ],
                    ],
                  )
                else
                  Text(noPriceLabel, style: const TextStyle(fontSize: 16, color: AppColors.textSecondary)),
                if (!offering.isAvailable)
                  Text(unavailableLabel,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textSecondary))
                else
                  ElevatedButton(
                    key: ValueKey('consult_book_${offering.sku}'),
                    onPressed: onBook,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: AppColors.disabledSurface,
                      disabledForegroundColor: AppColors.textSecondary,
                      elevation: 0,
                      minimumSize: const Size(128, 52),
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(bookLabel, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final String title;
  final String statusLabel;
  final Color statusText;
  final Color statusBg;
  final String? reference;
  final String dateLabel;
  final String? timeLabel;
  final IconData modeIcon;
  final String modeLabel;
  final String? query;
  final String? hint;
  final VoidCallback onDetails;
  final Key detailsKey;
  final String detailsLabel;
  final List<Widget> actions;

  const _BookingCard({
    super.key,
    required this.title,
    required this.statusLabel,
    required this.statusText,
    required this.statusBg,
    required this.reference,
    required this.dateLabel,
    required this.timeLabel,
    required this.modeIcon,
    required this.modeLabel,
    required this.query,
    required this.hint,
    required this.onDetails,
    required this.detailsKey,
    required this.detailsLabel,
    required this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(8)),
                child: Text(
                  statusLabel,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: statusText),
                ),
              ),
              if (reference != null)
                Text(reference!, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style:
                const TextStyle(fontSize: 18, height: 1.3, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 2),
          _InfoLine(icon: Icons.calendar_today_outlined, text: dateLabel, emphasise: true),
          if (timeLabel != null) _InfoLine(icon: Icons.schedule_rounded, text: timeLabel!, emphasise: true),
          _InfoLine(icon: modeIcon, text: modeLabel),
          if (query != null && query!.trim().isNotEmpty)
            _InfoLine(icon: Icons.help_outline_rounded, text: query!.trim(), maxLines: 2),
          if (hint != null) ...[
            const SizedBox(height: 10),
            Text(hint!, style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary)),
          ],
          for (final a in actions) ...[
            const SizedBox(height: 12),
            a,
          ],
          const SizedBox(height: 4),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: detailsKey,
              onPressed: onDetails,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                minimumSize: const Size(48, 48),
                padding: const EdgeInsets.symmetric(horizontal: 4),
              ),
              icon: const Icon(Icons.receipt_long_outlined, size: 20),
              label: Text(detailsLabel, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

class _JoinButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _JoinButton({super.key, required this.label, required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: _kGreenText,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size.fromHeight(54),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        icon: Icon(icon, size: 22),
        label:
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _SmallOutlineButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _SmallOutlineButton({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        side: BorderSide(color: color.withValues(alpha: 0.6), width: 1.3),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      icon: Icon(icon, size: 20),
      label: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
    );
  }
}

class _MessageCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String text;
  final String? actionLabel;
  final IconData actionIcon;
  final VoidCallback? onAction;

  const _MessageCard({
    super.key,
    required this.icon,
    required this.text,
    this.iconColor = AppColors.secondary,
    this.actionLabel,
    this.actionIcon = Icons.refresh_rounded,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SimpleIconBadge(icon: icon, color: iconColor),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(text, style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary)),
                ),
              ),
            ],
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 14),
            SimpleSecondaryButton(label: actionLabel!, icon: actionIcon, onPressed: onAction),
          ],
        ],
      ),
    );
  }
}

/// "No bookings yet" with one button that switches to "Book a session".
class _EmptyBookingsCard extends StatelessWidget {
  final String title;
  final String text;
  final String actionLabel;
  final VoidCallback onAction;

  const _EmptyBookingsCard({
    super.key,
    required this.title,
    required this.text,
    required this.actionLabel,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SimpleIconBadge(icon: Icons.event_note_outlined, color: AppColors.secondary),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(fontSize: 20, height: 1.25, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(text, style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textSecondary)),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: SimplePrimaryButton(
              key: const ValueKey('consult_bookings_empty_book'),
              label: actionLabel,
              icon: Icons.arrow_forward_rounded,
              onPressed: onAction,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  final String text;

  const _LoadingCard({required this.text});

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      child: Row(
        children: [
          const SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator.adaptive(strokeWidth: 3),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 16, color: AppColors.textSecondary))),
        ],
      ),
    );
  }
}
