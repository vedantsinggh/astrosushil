import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/widgets/astro_design_system.dart';

/// A network image with a soft tinted placeholder while loading and when it fails.
class HomeNetImage extends StatelessWidget {
  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final IconData placeholderIcon;

  const HomeNetImage(this.url, {super.key, this.width, this.height, this.fit = BoxFit.cover, this.placeholderIcon = Icons.image_outlined});

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: AppColors.tintLavender.withValues(alpha: 0.35),
      alignment: Alignment.center,
      child: Icon(placeholderIcon, color: AppColors.textMuted, size: 28),
    );
    final link = url;
    if (link == null || !link.startsWith('https://')) return placeholder;
    return Image.network(
      link,
      width: width,
      height: height,
      fit: fit,
      loadingBuilder: (context, child, progress) => progress == null ? child : placeholder,
      errorBuilder: (_, __, ___) => placeholder,
    );
  }
}

/// Opens a video or link outside the app (YouTube app, phone video player or browser).
Future<void> openExternal(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
