/// The featured items staff chose, in their order, keeping only items that still exist and can
/// be used (on sale, bookable). When none of the chosen ids is usable, or none were chosen, the
/// first [fallback] usable items are shown instead.
List<T> pickFeatured<T>(
  List<T> all,
  List<String> ids,
  String Function(T) keyOf,
  bool Function(T) usable,
  int fallback,
) {
  final byKey = <String, T>{for (final item in all) keyOf(item): item};
  final picked = <T>[];
  for (final id in ids) {
    final item = byKey[id];
    if (item != null && usable(item) && !picked.contains(item)) picked.add(item);
  }
  if (picked.isNotEmpty) return picked;
  return all.where(usable).take(fallback).toList(growable: false);
}
