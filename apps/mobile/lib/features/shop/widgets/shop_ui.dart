import 'package:flutter/material.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/astro_controls.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/astro_surfaces.dart';

/// Small presentation-only building blocks shared by the shop screens.
///
/// Goal: calm, readable screens for users of every age — large text,
/// labelled buttons of at least 48px, one gold primary action per screen,
/// flat rounded cards with a thin border instead of heavy decoration.

/// Readable green for "FREE" / success text on light surfaces.
const Color kShopSuccessText = AppColors.successText;

/// "Step X of Y" checkout progress.
///
/// Physical (or mixed) carts: Cart → Address → Pay (3 steps).
/// Digital-only carts skip the address step: Cart → Pay (2 steps).
/// Delegates to the shared [AstroStepIndicator].
class ShopStepIndicator extends StatelessWidget {
  /// 1-based index of the current step within the visible steps.
  final int current;

  /// Kept for API compatibility; labels come from the app localizations.
  final bool isHindi;

  /// Whether the flow has an address step (the cart needs shipping).
  final bool includeAddress;

  const ShopStepIndicator({super.key, required this.current, required this.isHindi, this.includeAddress = true});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final labels = [l10n.comm2StepCart, if (includeAddress) l10n.comm2StepAddress, l10n.comm2StepPay];
    return AstroStepIndicator(current: current, total: labels.length, labels: labels);
  }
}

/// Centered empty / error state with a single action.
/// Delegates to the shared [AstroStateView].
class ShopStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final IconData? actionIcon;
  final VoidCallback? onAction;
  final bool isError;

  const ShopStateView({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
    this.isError = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isError) {
      return AstroStateView.error(
        icon: icon,
        title: title,
        message: message,
        onRetry: onAction,
        retryLabel: actionLabel,
      );
    }
    return AstroStateView.empty(
      icon: icon,
      title: title,
      message: message,
      actionLabel: actionLabel,
      actionIcon: actionIcon,
      onAction: onAction,
    );
  }
}

/// Sticky footer that holds the screen's primary button.
class ShopBottomBar extends StatelessWidget {
  final Widget child;
  const ShopBottomBar({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurface,
        border: Border(top: BorderSide(color: AppColors.cardBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// Label / value row in a price summary. Wraps instead of overflowing.
class ShopPriceRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const ShopPriceRow({super.key, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.3)),
          ),
          const SizedBox(width: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Big, unmistakable total line.
class ShopTotalRow extends StatelessWidget {
  final String label;
  final String value;

  const ShopTotalRow({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 12,
        runSpacing: 4,
        children: [
          Text(label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
          Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.primary)),
        ],
      ),
    );
  }
}

/// Product artwork: bundled asset first, then network image, then a calm placeholder.
class ShopProductImage extends StatelessWidget {
  final String assetKey;
  final String? imageUrl;
  final bool isPhysical;
  final BoxFit fit;
  final double iconSize;

  const ShopProductImage({
    super.key,
    required this.assetKey,
    this.imageUrl,
    this.isPhysical = false,
    this.fit = BoxFit.cover,
    this.iconSize = 36,
  });

  @override
  Widget build(BuildContext context) {
    final bundled = AppAssets.getProductAsset(assetKey);
    return Container(
      color: AppColors.cardSurfaceParchment,
      child: bundled != null ? Image.asset(bundled, fit: fit, errorBuilder: (_, __, ___) => _network()) : _network(),
    );
  }

  Widget _network() {
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Image.network(imageUrl!, fit: fit, errorBuilder: (_, __, ___) => _placeholder());
    }
    return _placeholder();
  }

  Widget _placeholder() => Center(
        child: Icon(
          isPhysical ? Icons.spa_outlined : Icons.image_outlined,
          color: AppColors.gold,
          size: iconSize,
        ),
      );
}

/// Small rounded tag (e.g. "Digital", "Default").
class ShopTag extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color background;
  final Color foreground;

  const ShopTag({
    super.key,
    required this.label,
    this.icon,
    this.background = AppColors.cardSurfaceParchment,
    this.foreground = AppColors.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: foreground),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: foreground),
            ),
          ),
        ],
      ),
    );
  }
}

/// Centers and caps the content width on tablets / landscape.
class ShopContentWidth extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  const ShopContentWidth({super.key, required this.child, this.maxWidth = 640});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: child),
    );
  }
}
