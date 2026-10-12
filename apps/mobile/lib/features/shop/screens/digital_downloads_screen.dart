import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/digital_download_model.dart';
import '../providers/shop_provider.dart';

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
        title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your secure 15-minute expiring download link is ready:',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.lightBackground,
                borderRadius: BorderRadius.circular(8),
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
            child: const Text('Copy Link'),
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
    final downloadsAsync = ref.watch(digitalDownloadsProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          isHindi ? 'मेरी डिजिटल लाइब्रेरी' : 'My Digital Library',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: downloadsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
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
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(err.toString(), style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12)),
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
                    Icon(
                      Icons.folder_open_outlined,
                      size: 64,
                      color: AppColors.secondary.withValues(alpha: 0.4),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      isHindi ? 'कोई डिजिटल उत्पाद नहीं मिला' : 'No digital purchases yet',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isHindi
                          ? 'आपके द्वारा खरीदे गए वॉलपेपर, पवित्र कला और मंत्र किट यहाँ डाउनलोड हेतु उपलब्ध रहेंगे।'
                          : 'Your purchased wallpapers, sacred art, and mantra audio will appear here for secure download.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
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

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.lightBorder),
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
                              color: AppColors.tertiary.withValues(alpha: 0.05),
                              child: download.imageUrl != null
                                  ? Image.network(download.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 28))
                                  : const Icon(Icons.image, size: 28),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  download.displayTitle(locale.languageCode),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.lightTextPrimary),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.success.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        download.status,
                                        style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 10),
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

                      // If Bundle with multiple assets
                      if (download.hasBundleAssets && download.bundleAssets.isNotEmpty) ...[
                        const Divider(height: 20, color: AppColors.lightBorder),
                        Text(
                          isHindi ? 'सम्मिलित डिजिटल फ़ाइलें:' : 'Included Digital Assets:',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.secondary),
                        ),
                        const SizedBox(height: 8),
                        ...List.generate(download.bundleAssets.length, (assetIdx) {
                          final asset = download.bundleAssets[assetIdx];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                Icon(
                                  asset.type == 'AUDIO' ? Icons.audiotrack : Icons.image,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    asset.name,
                                    style: const TextStyle(fontSize: 12, color: AppColors.lightTextPrimary),
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: () => _handleDownload(
                                    context,
                                    ref,
                                    download,
                                    assetIndex: assetIdx,
                                    assetName: asset.name,
                                  ),
                                  icon: const Icon(Icons.download, size: 14),
                                  label: Text(isHindi ? 'डाउनलोड' : 'Download', style: const TextStyle(fontSize: 11)),
                                ),
                              ],
                            ),
                          );
                        }),
                      ] else ...[
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          height: 40,
                          child: ElevatedButton.icon(
                            onPressed: () => _handleDownload(context, ref, download),
                            icon: const Icon(Icons.download_rounded, size: 18),
                            label: Text(
                              isHindi ? 'सुरक्षित फ़ाइल डाउनलोड करें' : 'Download High-Res Asset',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
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
    );
  }
}
