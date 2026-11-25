/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// BirthChart.jsx — Step 2: North Indian birth chart SVG
import { motion } from "framer-motion";
import { useEffect } from "react";

import { useAstrologyStore } from "../../store/useAstrologyStore";
import { Loader2 } from "lucide-react";

const HOUSE_CELLS = {
  1: { points: "200,0 400,0 300,100", label: { x: 295, y: 60 } }, // top-center
  2: { points: "400,0 400,200 300,100", label: { x: 355, y: 90 } }, // top-right triangle
  3: { points: "400,0 600,0 400,200", label: { x: 490, y: 80 } }, // right-top corner
  4: { points: "400,200 600,0 600,200", label: { x: 490, y: 170 } }, // right-top-mid
  5: { points: "400,200 600,200 600,400", label: { x: 490, y: 300 } }, // right-bottom-mid
  6: { points: "400,200 600,400 400,400", label: { x: 490, y: 380 } }, // right-bottom corner
  7: { points: "200,400 400,400 300,300", label: { x: 295, y: 380 } }, // bottom-center
  8: { points: "0,400 200,400 300,300", label: { x: 110, y: 380 } }, // bottom-left
  9: { points: "0,200 200,400 0,400", label: { x: 45, y: 330 } }, // left-bottom corner
  10: { points: "0,200 200,200 200,400", label: { x: 80, y: 290 } }, // left-bottom-mid
  11: { points: "0,0 200,200 0,200", label: { x: 45, y: 130 } }, // left-top corner
  12: { points: "0,0 200,0 200,200", label: { x: 80, y: 80 } }, // left-top-mid
  // Center diamond
  C: {
    points: "200,0 400,0 300,100 300,300 400,400 200,400 100,300 100,100",
    label: { x: 300, y: 210 },
  },
};

const CENTER = "200,100 400,100 500,200 400,300 200,300 100,200";

const HOUSE_NUM_POS = {
  1: { x: 285, y: 22 },
  2: { x: 405, y: 22 },
  3: { x: 555, y: 22 },
  4: { x: 555, y: 120 },
  5: { x: 555, y: 280 },
  6: { x: 555, y: 405 },
  7: { x: 285, y: 420 },
  8: { x: 100, y: 420 },
  9: { x: 18, y: 405 },
  10: { x: 18, y: 280 },
  11: { x: 18, y: 120 },
  12: { x: 18, y: 22 },
};

function buildHouseMap(planets) {
  const map = {};
  planets.forEach((p) => {
    if (!map[p.house]) map[p.house] = [];
    map[p.house].push(p.name.substring(0, 2).toUpperCase());
  });
  return map;
}

const HOUSE_POLYGONS = [
  { h: 1, pts: "200,0 400,0 300,100" },
  { h: 2, pts: "400,0 500,100 400,200 300,100" },
  { h: 3, pts: "400,0 600,0 500,100" },
  { h: 4, pts: "500,100 600,0 600,200" },
  { h: 5, pts: "500,100 600,200 500,300" },
  { h: 6, pts: "500,300 600,200 600,400" },
  { h: 7, pts: "500,300 600,400 400,400 300,300" },
  { h: 8, pts: "300,300 400,400 200,400" },
  { h: 9, pts: "100,300 200,400 0,400" },
  { h: 10, pts: "0,200 100,300 0,400" },
  { h: 11, pts: "0,0 100,100 0,200" },
  { h: 12, pts: "0,0 200,0 100,100" },
];

const HOUSE_LABELS = {
  1: { x: 300, y: 65 },
  2: { x: 400, y: 155 },
  3: { x: 520, y: 65 },
  4: { x: 555, y: 190 },
  5: { x: 520, y: 295 },
  6: { x: 555, y: 390 },
  7: { x: 300, y: 390 },
  8: { x: 200, y: 390 },
  9: { x: 70, y: 390 },
  10: { x: 28, y: 295 },
  11: { x: 28, y: 145 },
  12: { x: 100, y: 65 },
};

export default function BirthChart({ planets = [] }) {
  const { formData, birthChart, generateBirthChart, loading } =
    useAstrologyStore();

  console.log("FormData", formData);

  useEffect(() => {
    generateBirthChart({
      latitude: formData?.latitude || "28.6139",
      longitude: formData?.longitude || "77.2090",
      dob: formData?.dob,
      hour: parseInt(formData?.hour),
      min: parseInt(formData?.min),
      label: "birth_chart",
    });
  }, []);

  const chartUrl = birthChart?.birth_chart?.chart_url;
  const houseMap = buildHouseMap(planets);
  const ascendant = planets.find((p) => p.name === "Ascendant");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white border border-[#e0d9f5] rounded-2xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ede8f8]">
          <div className="flex items-center gap-2.5">
            <span className="w-0.75 h-3.5 rounded-full bg-primary inline-block" />
            <span className="text-sm font-bold text-black">
              North Indian Birth Chart
            </span>
          </div>
          {ascendant && (
            <span className="text-xs text-black/40">
              Ascendant:{" "}
              <span className="font-semibold text-primary">
                {ascendant.sign}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-center p-8 bg-[#faf8ff] min-h-64">
          {/* Loading state */}
          {loading && !chartUrl ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-black/40">
                Generating your birth chart...
              </p>
            </div>
          ) : chartUrl ? (
            // S3 image
            <motion.img
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              src={chartUrl}
              alt="Birth Chart"
              className="w-full max-w-lg rounded-xl border border-[#e0d9f5] shadow-sm"
            />
          ) : (
            // SVG fallback
            <svg
              viewBox="0 0 600 400"
              className="w-full max-w-lg"
              style={{ maxHeight: 420 }}
            >
              <rect
                x="0"
                y="0"
                width="600"
                height="400"
                fill="white"
                stroke="#c4b8f0"
                strokeWidth="1.5"
              />
              {HOUSE_POLYGONS.map(({ h, pts }) => (
                <polygon
                  key={h}
                  points={pts}
                  fill={houseMap[h]?.length ? "#f5f0ff" : "white"}
                  stroke="#c4b8f0"
                  strokeWidth="1"
                />
              ))}
              <polygon
                points="100,100 300,0 500,100 500,300 300,400 100,300"
                fill="#f0ecfc"
                stroke="#c4b8f0"
                strokeWidth="1"
              />
              <polygon
                points="200,100 400,100 500,200 400,300 200,300 100,200"
                fill="#e8e0fc"
                stroke="#a99fd4"
                strokeWidth="1"
              />
              <text
                x="300"
                y="192"
                textAnchor="middle"
                fontSize="11"
                fill="#534AB7"
                fontWeight="600"
              >
                {ascendant?.sign ?? "—"}
              </text>
              <text
                x="300"
                y="208"
                textAnchor="middle"
                fontSize="9"
                fill="#a99fd4"
              >
                Ascendant
              </text>
              {Object.entries(HOUSE_LABELS).map(([h, pos]) => (
                <text
                  key={h}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#c4b8f0"
                  fontWeight="500"
                >
                  {h}
                </text>
              ))}
              {Object.entries(houseMap).map(([house, names]) => {
                const pos = HOUSE_LABELS[house];
                if (!pos) return null;
                return names.map((name, i) => (
                  <text
                    key={`${house}-${name}`}
                    x={pos.x}
                    y={pos.y + 14 + i * 13}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#100D42"
                    fontWeight="600"
                  >
                    {name}
                  </text>
                ));
              })}
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}
