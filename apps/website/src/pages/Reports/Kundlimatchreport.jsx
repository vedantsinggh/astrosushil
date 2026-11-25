import { useState } from "react";

const data = {
  match_birth_details: {
    male_astro_details: {
      year: 2012,
      month: 1,
      day: 11,
      hour: 13,
      minute: 13,
      latitude: 28.5355161,
      longitude: 77.3910265,
      timezone: 5.5,
      sunrise: "7:14:14",
      sunset: "17:41:59",
    },
    female_astro_details: {
      year: 2011,
      month: 2,
      day: 14,
      hour: 12,
      minute: 13,
      latitude: 28.7040592,
      longitude: 77.10249019999999,
      timezone: 5.5,
      sunrise: "7:1:15",
      sunset: "18:10:36",
    },
  },
  match_ashtakoot_points: {
    varna: {
      description: "Natural Refinement / Work",
      male_koot_attribute: "Vipra",
      female_koot_attribute: "Shoodra",
      total_points: 1,
      received_points: 1,
    },
    vashya: {
      description: "Innate Giving / Attraction",
      male_koot_attribute: "Jalchar",
      female_koot_attribute: "Maanav",
      total_points: 2,
      received_points: 0.5,
    },
    tara: {
      description: "Comfort - Prosperity - Health",
      male_koot_attribute: "Ashlesha",
      female_koot_attribute: "Mrigshira",
      total_points: 3,
      received_points: 1.5,
    },
    yoni: {
      description: "Intimate Physical",
      male_koot_attribute: "Marjaar",
      female_koot_attribute: "Sarp",
      total_points: 4,
      received_points: 1,
    },
    maitri: {
      description: "Friendship",
      male_koot_attribute: "Moon",
      female_koot_attribute: "Mercury",
      total_points: 5,
      received_points: 1,
    },
    gan: {
      description: "Temperament",
      male_koot_attribute: "Rakshasa",
      female_koot_attribute: "Dev",
      total_points: 6,
      received_points: 1,
    },
    bhakut: {
      description: "Constructive Ability / Society",
      male_koot_attribute: "Cancer",
      female_koot_attribute: "Gemini",
      total_points: 7,
      received_points: 0,
    },
    nadi: {
      description: "Progeny / Excess",
      male_koot_attribute: "Ant",
      female_koot_attribute: "Madhya",
      total_points: 8,
      received_points: 8,
    },
    total: { total_points: 36, received_points: 14, minimum_required: 18 },
    conclusion: {
      status: false,
      report:
        "Ashtakoota matching is only 14 points out of 36 points. Please consider all other things mentioned in kundali.",
    },
  },
  match_astro_details: {
    male_astro_details: {
      ascendant: "Aries",
      Varna: "Vipra",
      Vashya: "Jalchar",
      Yoni: "Marjaar",
      Gan: "Rakshasa",
      Nadi: "Ant",
      SignLord: "Moon",
      sign: "Cancer",
      Naksahtra: "Ashlesha",
      NaksahtraLord: "Mercury",
      Charan: 2,
      Yog: "Priti",
      Karan: "Vanija",
      Tithi: "Krishna Tritiya",
      tatva: "Water",
      paya: "Silver",
    },
    female_astro_details: {
      ascendant: "Taurus",
      Varna: "Shoodra",
      Vashya: "Maanav",
      Yoni: "Sarp",
      Gan: "Dev",
      Nadi: "Madhya",
      SignLord: "Mercury",
      sign: "Gemini",
      Naksahtra: "Mrigshira",
      NaksahtraLord: "Mars",
      Charan: 4,
      Yog: "Vishkumbha",
      Karan: "Vanija",
      Tithi: "Shukla-Ekadashi",
      tatva: "Air",
      paya: "Iron",
    },
  },
  match_percentage: {
    ashtakoota_percentage: 39,
    manglik_match_percentage: 78,
    rajju_match_percentage: 100,
    vedha_match_percentage: 100,
    match_percentage: 69,
    is_match_good: true,
  },
  match_making_report: {
    ashtakoota: { status: false, received_points: 14 },
    manglik: { status: true, male_percentage: 18.75, female_percentage: 20.25 },
    rajju_dosha: { status: false },
    vedha_dosha: { status: false },
    conclusion: {
      match_report:
        "Though the Ashtakoota matching points are quite less, the remaining factors are indicating positive results. Hence, you are advised to consult an astrologer before going ahead with this alliance.",
    },
  },
  match_obstructions: {
    is_present: false,
    vedha_report:
      "The Nakshatras of male and female does not belong to Vedha Kutir pair and therefore no Vedha dosha.",
  },
  match_dashakoot_points: {
    dina: {
      male_koot_attribute: "Ashlesha",
      female_koot_attribute: "Mrigshira",
      total_points: 3,
      received_points: 0,
    },
    gana: {
      male_koot_attribute: "Rakshasa",
      female_koot_attribute: "Dev",
      total_points: 4,
      received_points: 0,
    },
    yoni: {
      male_koot_attribute: "Marjaar",
      female_koot_attribute: "Sarp",
      total_points: 4,
      received_points: 0,
    },
    rashi: {
      male_koot_attribute: "Cancer",
      female_koot_attribute: "Gemini",
      total_points: 7,
      received_points: 0,
    },
    rasyadhipati: {
      male_koot_attribute: "Moon",
      female_koot_attribute: "Mercury",
      total_points: 5,
      received_points: 1,
    },
    rajju: {
      male_koot_attribute: "-",
      female_koot_attribute: "-",
      total_points: 5,
      received_points: 5,
    },
    vedha: {
      male_koot_attribute: "Ashlesha",
      female_koot_attribute: "Mrigshira",
      total_points: 2,
      received_points: 2,
    },
    vashya: {
      male_koot_attribute: "Jalchar",
      female_koot_attribute: "Maanav",
      total_points: 2,
      received_points: 0.5,
    },
    mahendra: {
      male_koot_attribute: "Ashlesha",
      female_koot_attribute: "Mrigshira",
      total_points: 2,
      received_points: 0,
    },
    streeDeergha: {
      male_koot_attribute: "Ashlesha",
      female_koot_attribute: "Mrigshira",
      total_points: 2,
      received_points: 0,
    },
    total: { total_points: 36, received_points: 8.5, minimum_required: 18 },
  },
  match_manglik_report: {
    male: {
      manglik_status: "INEFFECTIVE",
      percentage_manglik_present: 18.75,
      is_mars_manglik_cancelled: true,
      is_present: false,
      manglik_report:
        "Manglik Dosha is present, but it is very weak and has little to no impact. So, you are not considered Manglik.",
    },
    female: {
      manglik_status: "INEFFECTIVE",
      percentage_manglik_present: 20.25,
      is_mars_manglik_cancelled: false,
      is_present: false,
      manglik_report:
        "Manglik Dosha is present, but it is very weak and has little to no impact. So, you are not considered Manglik.",
    },
    conclusion: {
      match: true,
      report:
        "The boy is not a Manglik; nor is the girl a Manglik. Mangal Dosha being absent in either horoscopes, there shall be no ill effect on their marriage. This match is recommended.",
    },
  },
  match_planet_details: {
    male_planet_details: [
      {
        name: "Sun",
        sign: "Sagittarius",
        nakshatra: "Purva Shadha",
        house: 9,
        isRetro: "false",
        planet_awastha: "Mrit",
      },
      {
        name: "Moon",
        sign: "Cancer",
        nakshatra: "Ashlesha",
        house: 4,
        isRetro: "false",
        planet_awastha: "Kumara",
      },
      {
        name: "Mars",
        sign: "Leo",
        nakshatra: "Uttra Phalguni",
        house: 5,
        isRetro: "false",
        planet_awastha: "Mrit",
      },
      {
        name: "Mercury",
        sign: "Sagittarius",
        nakshatra: "Mool",
        house: 9,
        isRetro: "false",
        planet_awastha: "Kumara",
      },
      {
        name: "Jupiter",
        sign: "Aries",
        nakshatra: "Ashwini",
        house: 1,
        isRetro: "false",
        planet_awastha: "Kumara",
      },
      {
        name: "Venus",
        sign: "Aquarius",
        nakshatra: "Dhanishtha",
        house: 11,
        isRetro: "false",
        planet_awastha: "Bala",
      },
      {
        name: "Saturn",
        sign: "Libra",
        nakshatra: "Chitra",
        house: 7,
        isRetro: "false",
        planet_awastha: "Bala",
      },
      {
        name: "Rahu",
        sign: "Scorpio",
        nakshatra: "Jyeshtha",
        house: 8,
        isRetro: "true",
        planet_awastha: "Kumara",
      },
      {
        name: "Ketu",
        sign: "Taurus",
        nakshatra: "Rohini",
        house: 2,
        isRetro: "true",
        planet_awastha: "Kumara",
      },
    ],
    female_planet_details: [
      {
        name: "Sun",
        sign: "Aquarius",
        nakshatra: "Dhanishtha",
        house: 10,
        isRetro: "false",
        planet_awastha: "Bala",
      },
      {
        name: "Moon",
        sign: "Gemini",
        nakshatra: "Mrigshira",
        house: 2,
        isRetro: "false",
        planet_awastha: "Kumara",
      },
      {
        name: "Mars",
        sign: "Capricorn",
        nakshatra: "Dhanishtha",
        house: 9,
        isRetro: "false",
        planet_awastha: "Bala",
      },
      {
        name: "Mercury",
        sign: "Capricorn",
        nakshatra: "Shravan",
        house: 9,
        isRetro: "false",
        planet_awastha: "Kumara",
      },
      {
        name: "Jupiter",
        sign: "Pisces",
        nakshatra: "Uttra Bhadrapad",
        house: 11,
        isRetro: "false",
        planet_awastha: "Vridha",
      },
      {
        name: "Venus",
        sign: "Sagittarius",
        nakshatra: "Purva Shadha",
        house: 8,
        isRetro: "false",
        planet_awastha: "Yuva",
      },
      {
        name: "Saturn",
        sign: "Virgo",
        nakshatra: "Hast",
        house: 5,
        isRetro: "true",
        planet_awastha: "Kumara",
      },
      {
        name: "Rahu",
        sign: "Sagittarius",
        nakshatra: "Mool",
        house: 8,
        isRetro: "true",
        planet_awastha: "Bala",
      },
      {
        name: "Ketu",
        sign: "Gemini",
        nakshatra: "Mrigshira",
        house: 2,
        isRetro: "true",
        planet_awastha: "Bala",
      },
    ],
  },
};

const ashtakootRows = [
  "varna",
  "vashya",
  "tara",
  "yoni",
  "maitri",
  "gan",
  "bhakut",
  "nadi",
];
const dashakootRows = [
  "dina",
  "gana",
  "yoni",
  "rashi",
  "rasyadhipati",
  "rajju",
  "vedha",
  "vashya",
  "mahendra",
  "streeDeergha",
];
const planetIcons = {
  Sun: "☀",
  Moon: "☽",
  Mars: "♂",
  Mercury: "☿",
  Jupiter: "♃",
  Venus: "♀",
  Saturn: "♄",
  Rahu: "☊",
  Ketu: "☋",
};

function ScoreBar({ received, total }) {
  const pct = Math.round((received / total) * 100);
  const good = pct >= 50;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${good ? "bg-primary" : "bg-[#D4AF37]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-['Outfit'] text-[10px] text-primary/50 w-8 text-right">
        {received}/{total}
      </span>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-sm shrink-0">
        {icon}
      </div>
      <h2 className="font-['Philosopher'] text-[13px] uppercase tracking-[0.12em] text-primary">
        {title}
      </h2>
      <div className="flex-1 h-px bg-secondary" />
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-['Philosopher'] tracking-wider border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function RingChart({ pct, gold }) {
  const circumference = 283;
  const offset = circumference - (circumference * pct) / 100;
  return (
    <div className="relative w-14 h-14 mx-auto mb-2">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#d9d6e8"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={gold ? "#D4AF37" : "#424874"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="283"
          strokeDashoffset={offset}
        />
      </svg>
      <span className="font-['Philosopher'] text-primary text-sm absolute inset-0 flex items-center justify-center">
        {pct}%
      </span>
    </div>
  );
}

export default function KundliMatchReport() {
  const [saving, setSaving] = useState(false);
  const {
    match_birth_details,
    match_ashtakoot_points,
    match_astro_details,
    match_percentage: mp,
    match_making_report,
    match_obstructions,
    match_dashakoot_points,
    match_manglik_report,
    match_planet_details,
  } = data;

  const handleSavePDF = async () => {
    setSaving(true);
    try {
      const reportEl = document.getElementById("kundli-report");

      // Load html2canvas if not already available
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

     
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src =
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const canvas = await window.html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: reportEl.scrollWidth,
        windowHeight: reportEl.scrollHeight,
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      const pdfImgWidth = pdfWidth;
      const pdfImgHeight = pdfImgWidth / ratio;

      let remaining = pdfImgHeight;
      let page = 0;

      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        const srcY = page * (imgHeight * (pdfHeight / pdfImgHeight));
        const srcH = Math.min(
          imgHeight - srcY,
          imgHeight * (pdfHeight / pdfImgHeight),
        );

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidth;
        pageCanvas.height = Math.round(srcH);
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          Math.round(srcY),
          imgWidth,
          Math.round(srcH),
          0,
          0,
          imgWidth,
          Math.round(srcH),
        );
        const pageImg = pageCanvas.toDataURL("image/jpeg", 0.95);

        const pageImgHeight =
          (pageCanvas.height / pageCanvas.width) * pdfImgWidth;
        pdf.addImage(pageImg, "JPEG", 0, 0, pdfImgWidth, pageImgHeight);

        remaining -= pdfHeight;
        page++;
      }

      pdf.save("Kundli_Match_Report.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eceaf4] font-['Outfit']">
      {/* Save PDF Button */}
      <button
        onClick={handleSavePDF}
        disabled={saving}
        className="fixed top-4 right-4 z-50 px-5 py-2 rounded-full text-white text-sm font-['Philosopher'] tracking-widest bg-primary shadow-lg hover:bg-[#3b3f63] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "⏳ Saving..." : "⬇ Save as PDF"}
      </button>

      {/* Report Container */}
      <div
        id="kundli-report"
        className="max-w-3xl mx-auto bg-white min-h-screen shadow-2xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="relative overflow-hidden px-10 pt-12 pb-10 bg-primary">
          {/* Gold top bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4AF37]" />

          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full border border-white/4 pointer-events-none" />
          <div className="absolute -bottom-10 left-20 w-40 h-40 rounded-full bg-white/2.5 pointer-events-none" />

          <div className="relative flex items-center justify-between gap-6">
            {/* Male */}
            <div className="shrink-0 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-3xl mx-auto shadow-lg">
                ♂
              </div>
              <p className="font-['Philosopher'] text-white/90 text-xs tracking-widest uppercase mt-2">
                Male
              </p>
              <p className="font-['Outfit'] text-white/50 text-[10px] mt-0.5">
                11 Jan 2012
              </p>
            </div>

            {/* Center */}
            <div className="flex-1 text-center">
              <p className="font-['Outfit'] text-[10px] tracking-[0.42em] text-amber-200/70 uppercase mb-1">
                Vedic Kundli
              </p>
              <h1 className="font-['Philosopher'] text-4xl text-white uppercase tracking-widest leading-none drop-shadow-lg">
                Match Report
              </h1>
              <p className="font-['Outfit'] text-[11px] text-purple-200/55 tracking-[0.14em] mt-2">
                Ashtakoota · Dashakoot · Manglik · Doshas
              </p>
              <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-white/10 border border-white/15">
                <span className="text-[#D4AF37] text-sm">★</span>
                <span className="font-['Philosopher'] text-white text-sm tracking-wider">
                  {mp.match_percentage}% Overall Match
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-['Philosopher'] tracking-wider ${mp.is_match_good ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"}`}
                >
                  {mp.is_match_good ? "GOOD" : "POOR"}
                </span>
              </div>
            </div>

            {/* Female */}
            <div className="shrink-0 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-3xl mx-auto shadow-lg">
                ♀
              </div>
              <p className="font-['Philosopher'] text-white/90 text-xs tracking-widest uppercase mt-2">
                Female
              </p>
              <p className="font-['Outfit'] text-white/50 text-[10px] mt-0.5">
                14 Feb 2011
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-4 mt-7">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-['Outfit'] text-[9.5px] text-amber-200/50 tracking-[0.45em] uppercase">
              ✦ Celestial Compatibility ✦
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </div>

        {/* BODY */}
        <div className="px-8 pt-7 pb-10 space-y-6">
          {/* SCORE OVERVIEW */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Ashtakoota",
                pct: mp.ashtakoota_percentage,
                gold: false,
              },
              {
                label: "Manglik",
                pct: mp.manglik_match_percentage,
                gold: false,
              },
              { label: "Rajju", pct: mp.rajju_match_percentage, gold: true },
              { label: "Vedha", pct: mp.vedha_match_percentage, gold: true },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-secondary shadow-sm overflow-hidden text-center"
              >
                <div
                  className={`h-1 ${s.gold ? "bg-[#D4AF37]" : "bg-primary"}`}
                />
                <div className="p-4">
                  <RingChart pct={s.pct} gold={s.gold} />
                  <p className="font-['Philosopher'] text-[10.5px] text-primary tracking-wide uppercase">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* BIRTH DETAILS */}
          <div className="bg-white rounded-2xl border border-secondary shadow-sm overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-5">
              <SectionHeader icon="☽" title="Birth Details" />
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Male",
                    d: match_astro_details.male_astro_details,
                    bd: match_birth_details.male_astro_details,
                  },
                  {
                    label: "Female",
                    d: match_astro_details.female_astro_details,
                    bd: match_birth_details.female_astro_details,
                  },
                ].map(({ label, d, bd }) => (
                  <div
                    key={label}
                    className="bg-[#f4eeff]/60 rounded-xl p-4 border border-secondary"
                  >
                    <p className="font-['Philosopher'] text-[11px] uppercase tracking-[0.15em] text-primary mb-3 flex items-center gap-2">
                      <span>{label === "Male" ? "♂" : "♀"}</span> {label}
                    </p>
                    <div className="space-y-1.5">
                      {[
                        ["Ascendant", d.ascendant],
                        ["Sign", d.sign],
                        ["Sign Lord", d.SignLord],
                        ["Nakshatra", d.Naksahtra],
                        ["Nakshatra Lord", d.NaksahtraLord],
                        ["Tithi", d.Tithi],
                        ["Yog", d.Yog],
                        ["Karan", d.Karan],
                        ["Element", d.tatva],
                        ["Paya", d.paya],
                        ["Sunrise", bd.sunrise],
                        ["Sunset", bd.sunset],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between items-baseline"
                        >
                          <span className="font-['Outfit'] text-[11px] text-primary/55">
                            {k}
                          </span>
                          <span className="font-['Outfit'] text-[11px] text-[#3c3c52] font-medium">
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ASHTAKOOTA TABLE */}
          <div className="bg-white rounded-2xl border border-secondary shadow-sm overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-5">
              <SectionHeader icon="⚖" title="Ashtakoota Points" />
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <span className="font-['Philosopher'] text-3xl text-primary">
                    {match_ashtakoot_points.total.received_points}
                  </span>
                  <span className="font-['Outfit'] text-primary/40 text-sm">
                    /{match_ashtakoot_points.total.total_points}
                  </span>
                </div>
                <StatusPill
                  ok={
                    match_ashtakoot_points.total.received_points >=
                    match_ashtakoot_points.total.minimum_required
                  }
                  label={
                    match_ashtakoot_points.total.received_points >=
                    match_ashtakoot_points.total.minimum_required
                      ? "Passed"
                      : "Below Minimum (18)"
                  }
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-secondary">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-primary">
                      {[
                        "Koot",
                        "Description",
                        "Male",
                        "Female",
                        "Score",
                        "Max",
                      ].map((h) => (
                        <th
                          key={h}
                          className="font-['Philosopher'] text-[10px] tracking-widest text-white/80 uppercase px-3 py-2.5"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ashtakootRows.map((key, i) => {
                      const row = match_ashtakoot_points[key];
                      const good = row.received_points >= row.total_points / 2;
                      return (
                        <tr
                          key={key}
                          className={`border-b border-secondary/60 ${i % 2 === 0 ? "bg-white" : "bg-[#faf9fd]"}`}
                        >
                          <td className="font-['Philosopher'] text-[11px] text-primary capitalize px-3 py-2.5">
                            {key}
                          </td>
                          <td className="font-['Outfit'] text-[10.5px] text-primary/55 px-3 py-2.5 max-w-25">
                            {row.description}
                          </td>
                          <td className="font-['Outfit'] text-[11px] text-[#3c3c52] px-3 py-2.5">
                            {row.male_koot_attribute}
                          </td>
                          <td className="font-['Outfit'] text-[11px] text-[#3c3c52] px-3 py-2.5">
                            {row.female_koot_attribute}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`font-['Philosopher'] text-[12px] ${good ? "text-primary" : "text-[#D4AF37]"}`}
                            >
                              {row.received_points}
                            </span>
                          </td>
                          <td className="font-['Outfit'] text-[11px] text-primary/40 px-3 py-2.5">
                            {row.total_points}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[#f4eeff]/60">
                      <td
                        colSpan={4}
                        className="font-['Philosopher'] text-[11px] text-primary uppercase tracking-wider px-3 py-2.5"
                      >
                        Total
                      </td>
                      <td className="font-['Philosopher'] text-[13px] text-primary px-3 py-2.5">
                        {match_ashtakoot_points.total.received_points}
                      </td>
                      <td className="font-['Philosopher'] text-[11px] text-primary/60x-3 py-2.5">
                        {match_ashtakoot_points.total.total_points}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 px-1">
                <ScoreBar
                  received={match_ashtakoot_points.total.received_points}
                  total={match_ashtakoot_points.total.total_points}
                />
                <p className="font-['Outfit'] text-[11px] text-primary/55 italic mt-2 leading-relaxed">
                  {match_ashtakoot_points.conclusion.report}
                </p>
              </div>
            </div>
          </div>

          {/* DASHAKOOT TABLE */}
          <div className="bg-white rounded-2xl border border-[#d9d6e8] shadow-sm overflow-hidden">
            <div className="h-1 bg-[#D4AF37]" />
            <div className="p-5">
              <SectionHeader icon="◎" title="Dashakoot Points" />
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <span className="font-['Philosopher'] text-3xl text-primary">
                    {match_dashakoot_points.total.received_points}
                  </span>
                  <span className="font-['Outfit'] text-primary/40 text-sm">
                    /{match_dashakoot_points.total.total_points}
                  </span>
                </div>
                <StatusPill ok={false} label="Below Minimum (18)" />
              </div>
              <div className="rounded-xl overflow-hidden border border-[#d9d6e8]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#D4AF37]">
                      {["Koot", "Male", "Female", "Score", "Max"].map((h) => (
                        <th
                          key={h}
                          className="font-['Philosopher'] text-[10px] tracking-widest text-white/90 uppercase px-3 py-2.5"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashakootRows.map((key, i) => {
                      const row = match_dashakoot_points[key];
                      const good = row.received_points >= row.total_points / 2;
                      return (
                        <tr
                          key={key}
                          className={`border-b border-[#d9d6e8]/60 ${i % 2 === 0 ? "bg-white" : "bg-[#faf9fd]"}`}
                        >
                          <td className="font-['Philosopher'] text-[11px] text-primary capitalize px-3 py-2.5">
                            {key}
                          </td>
                          <td className="font-['Outfit'] text-[11px] text-[#3c3c52] px-3 py-2.5">
                            {row.male_koot_attribute}
                          </td>
                          <td className="font-['Outfit'] text-[11px] text-[#3c3c52] px-3 py-2.5">
                            {row.female_koot_attribute}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`font-['Philosopher'] text-[12px] ${good ? "text-primary" : "text-[#D4AF37]"}`}
                            >
                              {row.received_points}
                            </span>
                          </td>
                          <td className="font-['Outfit'] text-[11px] text-primary/40 px-3 py-2.5">
                            {row.total_points}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[#f4eeff]/60">
                      <td
                        colSpan={3}
                        className="font-['Philosopher'] text-[11px] text-primary uppercase tracking-wider px-3 py-2.5"
                      >
                        Total
                      </td>
                      <td className="font-['Philosopher'] text-[13px] text-primary px-3 py-2.5">
                        {match_dashakoot_points.total.received_points}
                      </td>
                      <td className="font-['Philosopher'] text-[11px] text-primary/60 px-3 py-2.5">
                        {match_dashakoot_points.total.total_points}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 px-1">
                <ScoreBar
                  received={match_dashakoot_points.total.received_points}
                  total={match_dashakoot_points.total.total_points}
                />
              </div>
            </div>
          </div>

          {/* MANGLIK + DOSHA */}
          <div className="grid grid-cols-2 gap-4">
            {/* Manglik */}
            <div className="bg-white rounded-2xl border border-[#d9d6e8] shadow-sm overflow-hidden">
              <div className="h-1 bg-primary" />
              <div className="p-5">
                <SectionHeader icon="♂" title="Manglik Report" />
                <div className="space-y-3">
                  {[
                    { label: "Male", d: match_manglik_report.male },
                    { label: "Female", d: match_manglik_report.female },
                  ].map(({ label, d: md }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#f4eeff]/60 border border-[#d9d6e8] p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Philosopher'] text-[11px] text-primary uppercase tracking-wider">
                          {label}
                        </span>
                        <StatusPill
                          ok={!md.is_present}
                          label={md.manglik_status}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#d9d6e8] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${md.percentage_manglik_present}%`,
                            }}
                          />
                        </div>
                        <span className="font-['Outfit'] text-[10px] text-primary/50">
                          {md.percentage_manglik_present}%
                        </span>
                      </div>
                      {md.is_mars_manglik_cancelled && (
                        <p className="font-['Outfit'] text-[10px] text-emerald-600 mt-1.5">
                          ✓ Mars Manglik cancelled
                        </p>
                      )}
                      <p className="font-['Outfit'] text-[10.5px] text-primary/55 italic mt-1.5 leading-relaxed">
                        {md.manglik_report}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="font-['Outfit'] text-[11px] text-emerald-700 leading-relaxed">
                      {match_manglik_report.conclusion.report}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dosha */}
            <div className="bg-white rounded-2xl border border-[#d9d6e8] shadow-sm overflow-hidden">
              <div className="h-1 bg-[#D4AF37]" />
              <div className="p-5">
                <SectionHeader icon="◈" title="Dosha Report" />
                <div className="space-y-3">
                  {[
                    {
                      label: "Rajju Dosha",
                      ok: !match_making_report.rajju_dosha.status,
                      desc: "No Rajju dosha present. Compatible Nakshatra groups.",
                    },
                    {
                      label: "Vedha Dosha",
                      ok: !match_making_report.vedha_dosha.status,
                      desc: match_obstructions.vedha_report,
                    },
                  ].map(({ label, ok, desc }) => (
                    <div
                      key={label}
                      className={`rounded-xl border p-3 ${ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Philosopher'] text-[11px] text-primary uppercase tracking-wider">
                          {label}
                        </span>
                        <StatusPill ok={ok} label={ok ? "Clear" : "Present"} />
                      </div>
                      <p className="font-['Outfit'] text-[10.5px] text-primary/55 italic leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-xl bg-[#f4eeff]/60 border border-[#d9d6e8] p-3 mt-1">
                    <p className="font-['Philosopher'] text-[10.5px] text-primary uppercase tracking-wider mb-1.5">
                      Overall Factors
                    </p>
                    <div className="space-y-1">
                      {[
                        {
                          k: "Ashtakoota",
                          v: `${match_making_report.ashtakoota.received_points}/36`,
                          ok: false,
                        },
                        {
                          k: "Manglik Match",
                          v: `${mp.manglik_match_percentage}%`,
                          ok: true,
                        },
                        {
                          k: "Rajju Match",
                          v: `${mp.rajju_match_percentage}%`,
                          ok: true,
                        },
                        {
                          k: "Vedha Match",
                          v: `${mp.vedha_match_percentage}%`,
                          ok: true,
                        },
                      ].map(({ k, v, ok }) => (
                        <div key={k} className="flex justify-between">
                          <span className="font-['Outfit'] text-[10.5px] text-primary/55">
                            {k}
                          </span>
                          <span
                            className={`font-['Philosopher'] text-[11px] ${ok ? "text-emerald-600" : "text-[#D4AF37]"}`}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PLANET POSITIONS */}
          <div className="bg-white rounded-2xl border border-[#d9d6e8] shadow-sm overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-5">
              <SectionHeader icon="✦" title="Planet Positions" />
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Male",
                    planets: match_planet_details.male_planet_details,
                  },
                  {
                    label: "Female",
                    planets: match_planet_details.female_planet_details,
                  },
                ].map(({ label, planets }) => (
                  <div key={label}>
                    <p className="font-['Philosopher'] text-[11px] text-primary uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                      <span>{label === "Male" ? "♂" : "♀"}</span> {label}
                    </p>
                    <div className="rounded-xl overflow-hidden border border-[#d9d6e8]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-primary">
                            {["Planet", "Sign", "House", "Status"].map((h) => (
                              <th
                                key={h}
                                className="font-['Philosopher'] text-[9px] tracking-widest text-white/80 uppercase px-2 py-2"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {planets.map((p, i) => (
                            <tr
                              key={p.name}
                              className={`border-b border-[#d9d6e8]/60 ${i % 2 === 0 ? "bg-white" : "bg-[#faf9fd]"}`}
                            >
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#D4AF37] text-xs">
                                    {planetIcons[p.name] || "◦"}
                                  </span>
                                  <span className="font-['Outfit'] text-[10.5px] text-[#3c3c52]">
                                    {p.name}
                                  </span>
                                </div>
                              </td>
                              <td className="font-['Outfit'] text-[10px] text-primary/60 px-2 py-1.5">
                                {p.sign}
                              </td>
                              <td className="font-['Philosopher'] text-[11px] text-primary px-2 py-1.5">
                                {p.house}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`text-[9px] font-['Philosopher'] tracking-wider px-1.5 py-0.5 rounded-full ${p.isRetro === "true" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-[#d9d6e8]/50 text-primary/60"}`}
                                >
                                  {p.isRetro === "true"
                                    ? "℞"
                                    : p.planet_awastha}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CONCLUSION */}
          <div className="bg-white rounded-2xl border border-[#d9d6e8] shadow-sm overflow-hidden">
            <div className="h-1 bg-[#D4AF37]" />
            <div className="p-5">
              <SectionHeader icon="★" title="Final Conclusion" />
              <div className="bg-[#f4eeff]/60 rounded-xl border border-[#d9d6e8] p-5 text-center">
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="font-['Philosopher'] text-4xl text-[#D4AF37]">
                    {mp.match_percentage}%
                  </span>
                  <div className="text-left">
                    <p className="font-['Philosopher'] text-[10px] text-primary/50 uppercase tracking-widest">
                      Overall
                    </p>
                    <p className="font-['Philosopher'] text-[10px] text-primary/50 uppercase tracking-widest">
                      Compatibility
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2 rounded-full bg-[#d9d6e8] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${mp.match_percentage}%` }}
                    />
                  </div>
                </div>
                <p className="font-['Outfit'] text-sm text-[#3c3c52] leading-relaxed italic mb-4">
                  {match_making_report.conclusion.match_report}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {[
                    { label: "Ashtakoota", ok: false },
                    { label: "Manglik", ok: true },
                    { label: "Rajju", ok: true },
                    { label: "Vedha", ok: true },
                  ].map(({ label, ok }) => (
                    <StatusPill key={label} ok={ok} label={label} />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#d9d6e8]" />
                <span className="font-['Outfit'] text-[9.5px] text-primary/40 tracking-[0.3em] uppercase">
                  ✦ Consult an Astrologer for Complete Guidance ✦
                </span>
                <div className="flex-1 h-px bg-[#d9d6e8]" />
              </div>
            </div>
          </div>
        </div>

        {/* Gold footer bar */}
        <div className="h-1 bg-[#D4AF37]" />
      </div>
    </div>
  );
}
