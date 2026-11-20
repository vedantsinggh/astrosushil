/// Pure layout geometry for Indian chart styles, in a unit square (0..1, y down).
/// Shared by the on-screen CustomPainter and the PDF renderer. No astrology here: the
/// engine supplies sign placements; this file only decides where each sign is drawn.
library;

enum ChartStyle { north, south, east }

extension ChartStyleLabel on ChartStyle {
  String get label => switch (this) {
        ChartStyle.north => 'North Indian',
        ChartStyle.south => 'South Indian',
        ChartStyle.east => 'East Indian',
      };
}

class Pt {
  const Pt(this.x, this.y);
  final double x;
  final double y;
  @override
  bool operator ==(Object other) => other is Pt && (other.x - x).abs() < 1e-9 && (other.y - y).abs() < 1e-9;
  @override
  int get hashCode => Object.hash((x * 1e6).round(), (y * 1e6).round());
  @override
  String toString() => 'Pt($x, $y)';
}

class Seg {
  const Seg(this.a, this.b);
  final Pt a;
  final Pt b;
}

/// Where one sign's cell is drawn.
class CellLayout {
  const CellLayout({required this.sign, required this.house, required this.anchor, required this.signLabelAnchor, required this.capacity, this.polygon = const []});
  final int sign; // 1-12
  final int house; // 1-12 counted from the ascendant sign (whole sign)
  final Pt anchor; // centre for body labels
  final Pt signLabelAnchor; // where the sign number / name goes
  final double capacity; // relative text room (1.0 = large cell, ~0.6 = triangle)
  final List<Pt> polygon; // cell outline (for hit-testing, hover and Lagna highlight)
}

class ChartLayout {
  const ChartLayout(this.style, this.lines, this.cells, {this.ascMarker});
  final ChartStyle style;
  final List<Seg> lines;
  final List<CellLayout> cells; // always 12, in sign order 1..12
  final Seg? ascMarker; // South/East: small diagonal across the ascendant cell corner

  CellLayout cellForSign(int sign) => cells[sign - 1];

  /// The sign whose cell contains [p] (unit square), or null (e.g. the empty centre).
  int? signAt(Pt p) {
    for (final c in cells) {
      if (pointInPolygon(p, c.polygon)) return c.sign;
    }
    return null;
  }
}

/// Even-odd point-in-polygon test (points on an edge may go either way).
bool pointInPolygon(Pt p, List<Pt> poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    final a = poly[i], b = poly[j];
    if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// North Indian house outlines (house 1 = top diamond, then anticlockwise).
const _northHousePolygon = <List<Pt>>[
  [Pt(0.5, 0), Pt(0.75, 0.25), Pt(0.5, 0.5), Pt(0.25, 0.25)],
  [Pt(0, 0), Pt(0.5, 0), Pt(0.25, 0.25)],
  [Pt(0, 0), Pt(0.25, 0.25), Pt(0, 0.5)],
  [Pt(0, 0.5), Pt(0.25, 0.25), Pt(0.5, 0.5), Pt(0.25, 0.75)],
  [Pt(0, 0.5), Pt(0.25, 0.75), Pt(0, 1)],
  [Pt(0, 1), Pt(0.25, 0.75), Pt(0.5, 1)],
  [Pt(0.5, 1), Pt(0.25, 0.75), Pt(0.5, 0.5), Pt(0.75, 0.75)],
  [Pt(0.5, 1), Pt(0.75, 0.75), Pt(1, 1)],
  [Pt(1, 1), Pt(0.75, 0.75), Pt(1, 0.5)],
  [Pt(1, 0.5), Pt(0.75, 0.75), Pt(0.5, 0.5), Pt(0.75, 0.25)],
  [Pt(1, 0.5), Pt(0.75, 0.25), Pt(1, 0)],
  [Pt(1, 0), Pt(0.75, 0.25), Pt(0.5, 0)],
];

// East Indian sign outlines (sign 1 = top centre, anticlockwise; corners split diagonally).
const _eastSignPolygon = <List<Pt>>[
  [Pt(_t3, 0), Pt(2 * _t3, 0), Pt(2 * _t3, _t3), Pt(_t3, _t3)],
  [Pt(0, 0), Pt(_t3, 0), Pt(_t3, _t3)],
  [Pt(0, 0), Pt(_t3, _t3), Pt(0, _t3)],
  [Pt(0, _t3), Pt(_t3, _t3), Pt(_t3, 2 * _t3), Pt(0, 2 * _t3)],
  [Pt(0, 2 * _t3), Pt(_t3, 2 * _t3), Pt(0, 1)],
  [Pt(0, 1), Pt(_t3, 2 * _t3), Pt(_t3, 1)],
  [Pt(_t3, 2 * _t3), Pt(2 * _t3, 2 * _t3), Pt(2 * _t3, 1), Pt(_t3, 1)],
  [Pt(2 * _t3, 2 * _t3), Pt(1, 1), Pt(2 * _t3, 1)],
  [Pt(2 * _t3, 2 * _t3), Pt(1, 2 * _t3), Pt(1, 1)],
  [Pt(2 * _t3, _t3), Pt(1, _t3), Pt(1, 2 * _t3), Pt(2 * _t3, 2 * _t3)],
  [Pt(2 * _t3, _t3), Pt(1, 0), Pt(1, _t3)],
  [Pt(2 * _t3, 0), Pt(1, 0), Pt(2 * _t3, _t3)],
];

int houseOfSign(int sign, int ascSign) => ((sign - ascSign + 12) % 12) + 1;
int signOfHouse(int house, int ascSign) => ((ascSign - 1 + house - 1) % 12) + 1;

const _t3 = 1 / 3;

// North Indian: houses are fixed, signs rotate with the ascendant.
const _northHouseAnchor = <Pt>[
  Pt(0.5, 0.25), Pt(0.25, 0.085), Pt(0.085, 0.25), Pt(0.25, 0.5), Pt(0.085, 0.75), Pt(0.25, 0.915),
  Pt(0.5, 0.75), Pt(0.75, 0.915), Pt(0.915, 0.75), Pt(0.75, 0.5), Pt(0.915, 0.25), Pt(0.75, 0.085),
];
const _northHouseNumber = <Pt>[
  Pt(0.5, 0.44), Pt(0.25, 0.2), Pt(0.2, 0.25), Pt(0.44, 0.5), Pt(0.2, 0.75), Pt(0.25, 0.8),
  Pt(0.5, 0.56), Pt(0.75, 0.8), Pt(0.8, 0.75), Pt(0.56, 0.5), Pt(0.8, 0.25), Pt(0.75, 0.2),
];

// South Indian: signs fixed in a 4x4 ring, Pisces top-left, clockwise.
const _southCell = <int, (int, int)>{
  12: (0, 0), 1: (1, 0), 2: (2, 0), 3: (3, 0), 4: (3, 1), 5: (3, 2),
  6: (3, 3), 7: (2, 3), 8: (1, 3), 9: (0, 3), 10: (0, 2), 11: (0, 1),
};

// East Indian: signs fixed, Aries top-centre, anticlockwise; corner cells split diagonally.
const _eastAnchor = <Pt>[
  Pt(0.5, 1 / 6), Pt(0.222, 0.111), Pt(0.111, 0.222), Pt(1 / 6, 0.5), Pt(0.111, 0.778), Pt(0.222, 0.889),
  Pt(0.5, 5 / 6), Pt(0.778, 0.889), Pt(0.889, 0.778), Pt(5 / 6, 0.5), Pt(0.889, 0.222), Pt(0.778, 0.111),
];

ChartLayout buildLayout(ChartStyle style, int ascSign) {
  assert(ascSign >= 1 && ascSign <= 12);
  switch (style) {
    case ChartStyle.north:
      const lines = [
        Seg(Pt(0, 0), Pt(1, 0)), Seg(Pt(1, 0), Pt(1, 1)), Seg(Pt(1, 1), Pt(0, 1)), Seg(Pt(0, 1), Pt(0, 0)),
        Seg(Pt(0, 0), Pt(1, 1)), Seg(Pt(1, 0), Pt(0, 1)),
        Seg(Pt(0.5, 0), Pt(1, 0.5)), Seg(Pt(1, 0.5), Pt(0.5, 1)), Seg(Pt(0.5, 1), Pt(0, 0.5)), Seg(Pt(0, 0.5), Pt(0.5, 0)),
      ];
      final cells = List.generate(12, (i) {
        final sign = i + 1;
        final house = houseOfSign(sign, ascSign);
        final isDiamond = house == 1 || house == 4 || house == 7 || house == 10;
        return CellLayout(
          sign: sign,
          house: house,
          anchor: _northHouseAnchor[house - 1],
          signLabelAnchor: _northHouseNumber[house - 1],
          capacity: isDiamond ? 1.0 : 0.78,
          polygon: _northHousePolygon[house - 1],
        );
      });
      return ChartLayout(style, lines, cells);
    case ChartStyle.south:
      final lines = <Seg>[
        const Seg(Pt(0, 0), Pt(1, 0)), const Seg(Pt(1, 0), Pt(1, 1)), const Seg(Pt(1, 1), Pt(0, 1)), const Seg(Pt(0, 1), Pt(0, 0)),
        const Seg(Pt(0.25, 0), Pt(0.25, 1)), const Seg(Pt(0.75, 0), Pt(0.75, 1)),
        const Seg(Pt(0, 0.25), Pt(1, 0.25)), const Seg(Pt(0, 0.75), Pt(1, 0.75)),
        const Seg(Pt(0.5, 0), Pt(0.5, 0.25)), const Seg(Pt(0.5, 0.75), Pt(0.5, 1)),
        const Seg(Pt(0, 0.5), Pt(0.25, 0.5)), const Seg(Pt(0.75, 0.5), Pt(1, 0.5)),
      ];
      final cells = List.generate(12, (i) {
        final sign = i + 1;
        final (c, r) = _southCell[sign]!;
        return CellLayout(
          sign: sign,
          house: houseOfSign(sign, ascSign),
          anchor: Pt(c * 0.25 + 0.125, r * 0.25 + 0.135),
          signLabelAnchor: Pt(c * 0.25 + 0.215, r * 0.25 + 0.225),
          capacity: 0.85,
          polygon: [Pt(c * 0.25, r * 0.25), Pt(c * 0.25 + 0.25, r * 0.25), Pt(c * 0.25 + 0.25, r * 0.25 + 0.25), Pt(c * 0.25, r * 0.25 + 0.25)],
        );
      });
      final (ac, ar) = _southCell[ascSign]!;
      return ChartLayout(style, lines, cells, ascMarker: Seg(Pt(ac * 0.25, ar * 0.25 + 0.06), Pt(ac * 0.25 + 0.06, ar * 0.25)));
    case ChartStyle.east:
      const lines = [
        Seg(Pt(0, 0), Pt(1, 0)), Seg(Pt(1, 0), Pt(1, 1)), Seg(Pt(1, 1), Pt(0, 1)), Seg(Pt(0, 1), Pt(0, 0)),
        Seg(Pt(_t3, 0), Pt(_t3, 1)), Seg(Pt(2 * _t3, 0), Pt(2 * _t3, 1)),
        Seg(Pt(0, _t3), Pt(1, _t3)), Seg(Pt(0, 2 * _t3), Pt(1, 2 * _t3)),
        Seg(Pt(0, 0), Pt(_t3, _t3)), Seg(Pt(1, 0), Pt(2 * _t3, _t3)),
        Seg(Pt(0, 1), Pt(_t3, 2 * _t3)), Seg(Pt(1, 1), Pt(2 * _t3, 2 * _t3)),
      ];
      final cells = List.generate(12, (i) {
        final sign = i + 1;
        final a = _eastAnchor[i];
        final isEdge = sign == 1 || sign == 4 || sign == 7 || sign == 10;
        // sign label pushed toward the cell's outer edge
        final label = Pt(a.x + (a.x - 0.5) * 0.18, a.y + (a.y - 0.5) * 0.18 + (isEdge ? 0.0 : 0.0));
        return CellLayout(sign: sign, house: houseOfSign(sign, ascSign), anchor: a, signLabelAnchor: label, capacity: isEdge ? 1.0 : 0.7, polygon: _eastSignPolygon[i]);
      });
      final a = _eastAnchor[ascSign - 1];
      return ChartLayout(style, lines, cells, ascMarker: Seg(Pt(a.x - 0.04, a.y - 0.07), Pt(a.x + 0.04, a.y - 0.07)));
  }
}
