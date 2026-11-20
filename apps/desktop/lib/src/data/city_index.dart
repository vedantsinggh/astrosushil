/// Offline place search over the bundled GeoNames `cities15000` extract (CC BY 4.0).
/// Attribution: "Place data © GeoNames (https://www.geonames.org), CC BY 4.0".
class City {
  const City({required this.name, required this.region, required this.country, required this.latitude, required this.longitude, required this.timezone, required this.population});
  final String name;
  final String region;
  final String country;
  final double latitude;
  final double longitude;
  final String timezone;
  final int population;

  String get label => [name, if (region.isNotEmpty && region != name) region, country].join(', ');
}

class CityIndex {
  CityIndex(this.cities) : _keys = cities.map((c) => _fold(c.name)).toList();

  static const attribution = 'Place data © GeoNames (geonames.org), CC BY 4.0';

  final List<City> cities;
  final List<String> _keys;

  /// Parses the TSV asset (name, region, country, lat, lon, tz, population); `#` lines are comments.
  factory CityIndex.parse(String tsv) {
    final out = <City>[];
    for (final line in tsv.split('\n')) {
      if (line.isEmpty || line.startsWith('#')) continue;
      final f = line.split('\t');
      if (f.length < 7) continue;
      final lat = double.tryParse(f[3]);
      final lon = double.tryParse(f[4]);
      if (lat == null || lon == null) continue;
      out.add(City(name: f[0], region: f[1], country: f[2], latitude: lat, longitude: lon, timezone: f[5], population: int.tryParse(f[6]) ?? 0));
    }
    return CityIndex(out);
  }

  static String _fold(String s) {
    const from = 'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūçñýÿśşšžźżčćđ';
    const to = 'aaaaaaaeeeeeiiiiiooooooouuuuucnyyssszzzccd';
    final b = StringBuffer();
    for (final ch in s.toLowerCase().runes) {
      final c = String.fromCharCode(ch);
      final i = from.indexOf(c);
      b.write(i >= 0 ? to[i] : c);
    }
    return b.toString();
  }

  /// Prefix matches first (by population, which is the asset order), then substring matches.
  List<City> search(String query, {int limit = 20}) {
    final parts = query.split(',');
    final q = _fold(parts.first.trim());
    final qualifier = parts.length > 1 ? _fold(parts.sublist(1).join(',').trim()) : '';
    if (q.length < 2) return const [];
    final prefix = <City>[];
    final inner = <City>[];
    for (var i = 0; i < cities.length; i++) {
      final k = _keys[i];
      final c = cities[i];
      if (qualifier.isNotEmpty && !_fold('${c.region} ${c.country}').contains(qualifier)) continue;
      if (k.startsWith(q)) {
        prefix.add(c);
        if (prefix.length >= limit) break;
      } else if (inner.length < limit && k.contains(q)) {
        inner.add(c);
      }
    }
    return [...prefix, ...inner].take(limit).toList();
  }
}
