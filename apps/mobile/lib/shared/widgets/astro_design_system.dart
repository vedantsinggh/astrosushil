/// Barrel export for Astro Sushil Global Visual Design System components.
///
/// Notes for screens using the iOS-first adaptive components:
///
/// * Revealing content: don't use `Scrollable.ensureVisible` to jump to a
///   section. At best it parks the target flush against (and, for bars it
///   can't see, under) the pinned frosted `AstroSliverNavBar` and its pinned
///   `bottom`. Use `AstroScroll.reveal(key.currentContext!, duration: ...)`:
///   it subtracts the collapsed pinned height and leaves a small gap.
/// * Pinned segmented controls: pass `AstroSegmentedNavBottom` as
///   `AstroPage.navBottom` so the slot is sized to the control's real
///   layout (one row, scaled row or wrapped pills) at any width / text size.
/// * Media-led screens: `AstroPage(largeTitle: false, ...)` shows only the
///   compact bar.
/// * Touch targets: 44pt on iOS, 48dp on Android (`AppTouchTargets`).
library astro_design_system;

export '../theme/app_colors.dart';
export '../theme/app_typography.dart';
export '../theme/app_theme_tokens.dart';
export '../theme/app_theme.dart';
export '../assets/app_assets.dart';

export 'astro_card.dart';
export 'astro_hero_card.dart';
export 'astro_feature_tile.dart';
export 'astro_data_summary_card.dart';
export 'astro_chart_preview_card.dart';
export 'astro_promotional_card.dart';
export 'astro_product_card.dart';
export 'astro_course_card.dart';
export 'astro_report_card.dart';
export 'astro_section_header.dart';
export 'astro_badge.dart';
export 'astro_button.dart';
export 'astro_input.dart';
export 'astro_dialog.dart';
export 'astro_skeleton.dart';
export 'astro_assistant_fab.dart';
export 'astro_bottom_navigation.dart';
export 'astro_empty_state.dart';
export 'astro_error_state.dart';
export 'astro_chip.dart';
export 'custom_button.dart';

// iOS-first / platform-adaptive design system (see docs in each file).
export 'astro_platform.dart';
export 'astro_nav_bar.dart';
export 'astro_page.dart';
export 'astro_controls.dart';
export 'astro_lists.dart';
export 'astro_surfaces.dart';
export 'astro_sheets.dart';
export 'astro_app_bar.dart';
export 'astro_scroll.dart';
