import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/digital_download_model.dart';
import '../providers/shop_provider.dart';
import 'shop_catalog_screen.dart';

/// Redesigned Digital Downloads Screen for Astro Sushil
/// Following the shared design system: Cosmic hero security banner,
/// warm ivory entitlement cards, bundled asset drawers, and 15-minute expiring signed tokens.
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardSurfaceWarm,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your secure 15-minute expiring download link is ready:',
              style: TextStyle(fontSize: 13, color: AppColors.lightTextPrimary),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceParchment,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: SelectableText(
                url,
                style: const TextStyle(fontSize: 11, color: AppColors.primary),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: url));
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Download link copied to clipboard')),
              );
            },
            child: const Text('Copy Link', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Close'),
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

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: AppColors.midnightNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          l10n.myDigitalLibraryTitle,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            // Cosmic Security Hero Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                gradient: AppGradients.heroCosmic,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.shield_outlined, color: AppColors.gold, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isHindi ? 'सुरक्षित 15-मिनट डिजिटल डाउनलोड्स' : 'Secure 15-Minute Signed Downloads',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13.5),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isHindi
                              ? 'आपके खरीदे गए वॉलपेपर, कला एवं गुप्त मंत्र सुरक्षित निजी स्टोरेज से वितरित किए जाते हैं।'
                              : 'Purchased wallpapers, 4K art, and mantras are delivered via expiring HMAC signed security tokens.',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 11.5, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Downloads List
            Expanded(
              child: downloadsAsync.when(
                loading: () => const LoadingIndicator(message: 'Loading digital library...'),
                error: (err, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                        const SizedBox(height: 12),
                        Text(
                          isHindi ? 'लाइब्रेरी लोड नहीं हो सकी' : 'Failed to load digital library',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          err.toString(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => ref.refresh(digitalDownloadsProvider),
                          icon: const Icon(Icons.refresh, size: 16),
                          label: Text(isHindi ? 'पुनः प्रयास करें' : 'Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(120, AppTouchTargets.minTouchTarget),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                data: (downloads) {
                  if (downloads.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: AppColors.cardSurfaceParchment,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: const Icon(
                                Icons.folder_open_outlined,
                                size: 56,
                                color: AppColors.gold,
                              ),
                            ),
                            const SizedBox(height: 18),
                            Text(
                              isHindi ? 'कोई डिजिटल उत्पाद नहीं मिला' : 'No digital purchases yet',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              isHindi
                                  ? 'आपके द्वारा खरीदे गए वॉलपेपर, पवित्र कला और मंत्र किट यहाँ डाउनलोड हेतु उपलब्ध रहेंगे।'
                                  : 'Your purchased wallpapers, sacred art, and mantra audio will appear here for secure download.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13, height: 1.4),
                            ),
                            const SizedBox(height: 22),
                            SizedBox(
                              height: AppTouchTargets.minTouchTarget,
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.of(context).pushReplacement(
                                    MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                                  );
                                },
                                icon: const Icon(Icons.storefront_outlined, size: 18),
                                label: Text(
                                  isHindi ? 'शॉप देखें' : 'Explore Shop Offerings',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 24),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () async {
                      ref.invalidate(digitalDownloadsProvider);
                    },
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: downloads.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 14),
                      itemBuilder: (ctx, idx) {
                        final download = downloads[idx];
                        final bundledAsset = AppAssets.getProductAsset(download.productId);

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.cardSurfaceWarm,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.cardBorder),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.02),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Container(
                                      width: 64,
                                      height: 64,
                                      color: AppColors.cardSurfaceParchment,
                                      child: bundledAsset != null
                                          ? Image.asset(
                                              bundledAsset,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 28, color: AppColors.gold),
                                            )
                                          : const Icon(Icons.image, size: 28, color: AppColors.gold),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          download.displayTitle(locale.languageCode),
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: AppColors.primary),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                              decoration: BoxDecoration(
                                                color: AppColors.gold.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                download.status,
                                                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 10),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              'Downloads: ${download.downloadCount}',
                                              style: const TextStyle(fontSize: 11, color: AppColors.lightTextSecondary),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),

                              // If Bundle with multiple assets (Dhan Varsha Kit)
                              if (download.hasBundleAssets && download.bundleAssets.isNotEmpty) ...[
                                const Divider(height: 20, color: AppColors.cardBorder),
                                Text(
                                  isHindi ? 'सम्मिलित डिजिटल फ़ाइलें:' : 'Included Digital Assets:',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: AppColors.primary),
                                ),
                                const SizedBox(height: 8),
                                ...List.generate(download.bundleAssets.length, (assetIdx) {
                                  final asset = download.bundleAssets[assetIdx];
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.cardSurfaceParchment,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: AppColors.cardBorder),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          asset.type == 'AUDIO' ? Icons.audiotrack : Icons.image,
                                          size: 18,
                                          color: AppColors.primary,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            asset.name,
                                            style: const TextStyle(fontSize: 12.5, color: AppColors.primary, fontWeight: FontWeight.w500),
                                          ),
                                        ),
                                        SizedBox(
                                          height: 36,
                                          child: ElevatedButton.icon(
                                            onPressed: () => _handleDownload(
                                              context,
                                              ref,
                                              download,
                                              assetIndex: assetIdx,
                                              assetName: asset.name,
                                            ),
                                            icon: const Icon(Icons.download, size: 14),
                                            label: Text(isHindi ? 'डाउनलोड' : 'Download', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.primary,
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(horizontal: 10),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                              ] else ...[
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  height: AppTouchTargets.minTouchTarget,
                                  child: ElevatedButton.icon(
                                    onPressed: () => _handleDownload(context, ref, download),
                                    icon: const Icon(Icons.download_rounded, size: 18),
                                    label: Text(
                                      isHindi ? 'सुरक्षित फ़ाइल डाउनलोड करें' : 'Download High-Res Asset',
                                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
