#!/usr/bin/env bash
# Regenerates test/fixtures/*.json from the real engine sidecar (REF_CHART_001 birth data).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
sc="$here/engine-sidecar/dist/astro-engine-sidecar"
B='{"name":"Reference Chart 001","date":"1990-05-15","time":"14:30:00","timezone":"Asia/Kolkata","latitude":28.6139,"longitude":77.209,"placeName":"New Delhi, India"}'
M='{"date":"2024-06-21","time":"12:00:00","timezone":"Asia/Kolkata","latitude":28.6139,"longitude":77.209,"placeName":"New Delhi, India"}'
G='{"date":"1992-08-01","time":"06:15:00","timezone":"Asia/Kolkata","latitude":19.076,"longitude":72.8777,"placeName":"Mumbai, India"}'
{
  echo "{\"id\":\"chart\",\"method\":\"chart.compute\",\"params\":{\"birth\":$B}}"
  echo "{\"id\":\"vargas\",\"method\":\"vargas.compute\",\"params\":{\"birth\":$B}}"
  echo "{\"id\":\"dasha\",\"method\":\"dasha.compute\",\"params\":{\"birth\":$B,\"maxLevel\":2,\"targetDate\":\"2024-06-21T00:00:00Z\"}}"
  echo "{\"id\":\"panchang\",\"method\":\"panchang.compute\",\"params\":{\"moment\":$M}}"
  echo "{\"id\":\"ashtakavarga\",\"method\":\"ashtakavarga.compute\",\"params\":{\"birth\":$B}}"
  echo "{\"id\":\"strength\",\"method\":\"strength.compute\",\"params\":{\"birth\":$B}}"
  echo "{\"id\":\"transit\",\"method\":\"transit.compute\",\"params\":{\"birth\":$B,\"moment\":$M}}"
  echo "{\"id\":\"match\",\"method\":\"matchmaking.compute\",\"params\":{\"boy\":$B,\"girl\":$G}}"
  echo "{\"id\":\"kp\",\"method\":\"kp.compute\",\"params\":{\"birth\":$B}}"
  echo "{\"id\":\"sudarshana\",\"method\":\"sudarshana.compute\",\"params\":{\"birth\":$B}}"
  echo "{\"id\":\"eclipses\",\"method\":\"eclipses.find\",\"params\":{\"startIso\":\"2024-01-01T00:00:00Z\",\"endIso\":\"2025-01-01T00:00:00Z\"}}"
  echo "{\"id\":\"local\",\"method\":\"time.local\",\"params\":{\"timezone\":\"Asia/Kolkata\",\"utcIso\":\"2024-06-21T06:30:00Z\"}}"
} | "$sc" | python3 -c '
import json, sys, os
out = sys.argv[1]
for line in sys.stdin:
    m = json.loads(line)
    if "id" not in m: continue
    assert m["ok"], m
    def strip(o):
        if isinstance(o, dict): return {k: strip(v) for k, v in o.items() if k != "calculationTimestampIso"}
        if isinstance(o, list): return [strip(v) for v in o]
        return o
    json.dump(strip(m["result"]), open(os.path.join(out, m["id"] + ".json"), "w"), separators=(",", ":"))
' "$here/test/fixtures"
ls -la "$here/test/fixtures"
