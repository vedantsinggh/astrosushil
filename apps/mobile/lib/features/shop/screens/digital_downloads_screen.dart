import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/digital_download_model.dart';
import '../providers/shop_provider.dart';
import '../widgets/shop_ui.dart';
import 'shop_catalog_screen.dart';

/// Digital library: one card per purchase with a large Download button
/// (one per file for bundles). The security explanation sits behind
/// a "Learn more" expander.
class DigitalDownloadsScreen extends ConsumerWidget {
  const DigitalDownloadsScreen({super.key});

  Future<void> _handleDownload(
    BuildContext context,
    WidgetRef ref,
    DigitalDownloadModel download, {
    int? assetIndex,
    String? assetName,
  }) async {
    try {
      final service = ref.read(shopServiceProvider);
      final result = await service.getSecureDownloadUrl(download.id, assetIndex: assetIndex);
      final downloadUrl = result['downloadUrl'] as String? ?? '';

      if (downloadUrl.isNotEmpty) {
        final uri = Uri.parse(downloadUrl);
        final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (!launched && context.mounted) {
          _showLinkDialog(context, result['assetName'] ?? assetName ?? download.productTitle, downloadUrl);
        }
      }
      ref.invalidate(digitalDownloadsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download error: ${e.toString()}')),
        );
      }
    }
  }

  void _showLinkDialog(BuildContext context, String title, String url) {
    showAstroSheet<void>(
      context: context,
      title: title,
      builder: (ctx) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Your secure 15-minute expiring download link is ready:',
            style: TextStyle(fontSize: 16, color: AppColors.textPrimary, height: 1.4),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardSurface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: SelectableText(
              url,
              style: const TextStyle(fontSize: 14, color: AppColors.accent),
            ),
          ),
          const SizedBox(height: 16),
          AstroPrimaryButton(
            label: 'Copy Link',
            icon: Icons.copy_rounded,
            onPressed: () {
              Clipboard.setData(ClipboardData(text: url));
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Download link copied to clipboard')),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final downloadsAsync = ref.watch(digitalDownloadsProvider);

    final securityNote = AstroSurfaceCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.shield_outlined, tint: AstroTint.sage),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isHindi ? 'सुरक्षित 15-मिनट डिजिटल डाउनलोड्स' : 'Secure 15-Minute Signed Downloads',
                  style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          AstroExpander(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                isHindi
                    ? 'आपके खरीदे गए वॉलपेपर, कला एवं गुप्त मंत्र सुरक्षित निजी स्टोरेज से वितरित किए जाते हैं।'
                    : 'Purchased wallpapers, 4K art, and mantras are delivered via expiring HMAC signed security tokens.',
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 16, height: 1.4),
              ),
            ),
          ),
        ],
      ),
    );

    Widget fill(Widget child) => SliverFillRemaining(hasScrollBody: false, child: child);

    return AstroPage(
      title: l10n.myDigitalLibraryTitle,
      onRefresh: () async => ref.invalidate(digitalDownloadsProvider),
      slivers: [
        downloadsAsync.when(
          loading: () => fill(
              AstroStateView.loading(message: isHindi ? 'लाइब्रेरी लोड हो रही है...' : 'Loading digital library...')),
          error: (err, _) => fill(ShopStateView(
            icon: Icons.cloud_off_outlined,
            isError: true,
            title: isHindi ? 'लाइब्रेरी लोड नहीं हो सकी' : 'Failed to load digital library',
            message: isHindi ? 'कृपया अपना इंटरनेट जांचें।' : 'Please check your internet connection.',
            actionLabel: context.l10n.commonTryAgain,
            actionIcon: Icons.refresh,
            onAction: () => ref.invalidate(digitalDownloadsProvider),
          )),
          data: (downloads) {
            if (downloads.isEmpty) {
              return fill(ShopStateView(
                icon: Icons.folder_open_outlined,
                title: isHindi ? 'कोई डिजिटल उत्पाद नहीं मिला' : 'No digital purchases yet',
                message: isHindi
                    ? 'आपके द्वारा खरीदे गए वॉलपेपर, पवित्र कला और मंत्र किट यहाँ डाउनलोड हेतु उपलब्ध रहेंगे।'
                    : 'Your purchased wallpapers, sacred art, and mantra audio will appear here for secure download.',
                actionLabel: isHindi ? 'शॉप देखें' : 'Explore Shop Offerings',
                actionIcon: Icons.storefront_outlined,
                onAction: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                  );
                },
              ));
            }

            return AstroSliverContent(
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    securityNote,
                    const SizedBox(height: 16),
                    for (final download in downloads) ...[
                      _DownloadCard(
                        download: download,
                        languageCode: locale.languageCode,
                        isHindi: isHindi,
                        onDownload: ({int? assetIndex, String? assetName}) => _handleDownload(
                          context,
                          ref,
                          download,
                          assetIndex: assetIndex,
                          assetName: assetName,
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

typedef _DownloadCallback = void Function({int? assetIndex, String? assetName});

class _DownloadCard extends StatelessWidget {
  final DigitalDownloadModel download;
  final String languageCode;
  final bool isHindi;
  final _DownloadCallback onDownload;

  const _DownloadCard({
    required this.download,
    required this.languageCode,
    required this.isHindi,
    required this.onDownload,
  });

  String get _statusLabel {
    final s = download.status.replaceAll('_', ' ').toLowerCase();
    return s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: ShopProductImage(assetKey: download.productId, iconSize: 28),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      download.displayTitle(languageCode),
                      style: AppTypography.headlineMedium.copyWith(fontSize: 17, height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 10,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        ShopTag(
                          label: _statusLabel,
                          background: download.isActive ? AppColors.successBg : AppColors.cardSurfaceParchment,
                          foreground: download.isActive ? AppColors.tintSageText : AppColors.primary,
                        ),
                        Text(
                          'Downloads: ${download.downloadCount}',
                          style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Bundle with several files (e.g. Dhan Varsha Kit)
          if (download.hasBundleAssets && download.bundleAssets.isNotEmpty) ...[
            const Divider(height: 28, color: AppColors.cardBorder),
            Text(
              isHindi ? 'सम्मिलित डिजिटल फ़ाइलें:' : 'Included Digital Assets:',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
            ),
            const SizedBox(height: 8),
            for (var assetIdx = 0; assetIdx < download.bundleAssets.length; assetIdx++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          download.bundleAssets[assetIdx].type == 'AUDIO' ? Icons.audiotrack : Icons.image_outlined,
                          size: 22,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            download.bundleAssets[assetIdx].name,
                            style: const TextStyle(fontSize: 16, color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                    _DownloadButton(
                      label: isHindi ? 'डाउनलोड' : 'Download',
                      onPressed: () => onDownload(
                        assetIndex: assetIdx,
                        assetName: download.bundleAssets[assetIdx].name,
                      ),
                    ),
                  ],
                ),
              ),
          ] else ...[
            const SizedBox(height: 14),
            _DownloadButton(
              label: isHindi ? 'सुरक्षित फ़ाइल डाउनलोड करें' : 'Download High-Res Asset',
              expand: true,
              onPressed: () => onDownload(),
            ),
          ],
        ],
      ),
    );
  }
}

class _DownloadButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final bool expand;

  const _DownloadButton({required this.label, required this.onPressed, this.expand = false});

  @override
  Widget build(BuildContext context) {
    return AstroSecondaryButton(
      label: label,
      icon: Icons.download_rounded,
      expand: expand,
      onPressed: onPressed,
    );
  }
}
