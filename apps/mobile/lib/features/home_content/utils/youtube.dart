/// YouTube links as staff paste them in the website admin (watch, youtu.be, shorts, embed).
final RegExp _videoId = RegExp(r'^[A-Za-z0-9_-]{11}$');

/// The 11-character video id of a YouTube link, or null when [url] is not one.
String? youtubeIdOf(String url) {
  final uri = Uri.tryParse(url.trim());
  if (uri == null || !uri.hasScheme) return null;
  var host = uri.host.toLowerCase();
  for (final prefix in const ['www.', 'm.']) {
    if (host.startsWith(prefix)) host = host.substring(prefix.length);
  }
  String? id;
  if (host == 'youtu.be') {
    id = uri.pathSegments.isNotEmpty ? uri.pathSegments.first : null;
  } else if (host == 'youtube.com' || host == 'music.youtube.com') {
    final segments = uri.pathSegments;
    if (segments.isNotEmpty && segments.first == 'watch') {
      id = uri.queryParameters['v'];
    } else if (segments.length >= 2 && (segments.first == 'shorts' || segments.first == 'embed' || segments.first == 'live')) {
      id = segments[1];
    }
  }
  return id != null && _videoId.hasMatch(id) ? id : null;
}

String youtubeThumb(String id) => 'https://img.youtube.com/vi/$id/hqdefault.jpg';
