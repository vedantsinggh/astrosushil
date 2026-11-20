#!/usr/bin/env python3
"""Builds assets/geo/cities.tsv from GeoNames dumps (CC BY 4.0, https://www.geonames.org).

Usage: python3 tool/build_cities.py <dir containing cities15000.txt, admin1CodesASCII.txt, countryInfo.txt>
Download from https://download.geonames.org/export/dump/ .
Output columns (tab separated): name, admin1 name, country name, latitude, longitude, IANA timezone, population.
"""
import csv, os, sys

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'geo', 'cities.tsv')

countries = {}
with open(os.path.join(src, 'countryInfo.txt'), encoding='utf-8') as f:
    for line in f:
        if line.startswith('#'):
            continue
        p = line.rstrip('\n').split('\t')
        if len(p) > 4:
            countries[p[0]] = p[4]

admin1 = {}
with open(os.path.join(src, 'admin1CodesASCII.txt'), encoding='utf-8') as f:
    for line in f:
        p = line.rstrip('\n').split('\t')
        if len(p) >= 2:
            admin1[p[0]] = p[1]

rows = []
with open(os.path.join(src, 'cities15000.txt'), encoding='utf-8') as f:
    for line in f:
        p = line.rstrip('\n').split('\t')
        name, lat, lon, cc, a1, pop, tz = p[1], p[4], p[5], p[8], p[10], p[14], p[17]
        if not tz:
            continue
        rows.append((name, admin1.get(f'{cc}.{a1}', ''), countries.get(cc, cc), f'{float(lat):.4f}', f'{float(lon):.4f}', tz, pop))

rows.sort(key=lambda r: -int(r[6] or 0))
with open(out, 'w', encoding='utf-8', newline='') as f:
    f.write('# Source: GeoNames (https://www.geonames.org), cities15000 dump, licensed CC BY 4.0.\n')
    w = csv.writer(f, delimiter='\t', lineterminator='\n', quoting=csv.QUOTE_NONE, escapechar='\\')
    for r in rows:
        w.writerow(r)
print(f'{len(rows)} cities -> {out}')
