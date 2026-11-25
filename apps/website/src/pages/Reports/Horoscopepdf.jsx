import { useState, useRef } from "react";

const data = {
  sun_sign: "taurus",
  prediction_date: "12-5-2026",
  prediction: {
    personal_life:
      "You wake up with a softer, more open mindset, and it changes how you respond to people around you. Instead of holding your usual ground, you're more willing to listen and adjust. This makes conversations feel smoother, especially with someone close. You may even find yourself saying something you've been holding back. Let it come out naturally, without planning every word or worrying about how it will land.",
    profession:
      "That openness carries into your work, where communication flows more easily than expected. You might explain something clearly that usually feels complicated, or find the right words at the right time in a discussion. People are more receptive to your tone today. If there's something you've been meaning to address, this is a good moment to bring it up calmly and keep the focus on understanding rather than proving anything.",
    health:
      "With your mind feeling lighter, your body responds in kind, but only if you don't overextend yourself. You may feel like doing more, talking more, or staying active longer than usual. Pay attention to when your energy dips instead of pushing past it. A steady pace, good meals, and a little quiet time will help you stay balanced through the day without feeling drained by evening.",
    emotions:
      "Emotionally, things feel easier to process because you're not holding everything inside. Taurus, you may notice that sharing even a small thought brings relief. There's less pressure to stay guarded, and more space to simply be honest with yourself and others today.",
    travel:
      "If you step out, even for short errands, you may find yourself having easy, pleasant exchanges with people along the way. Conversations flow without effort, and plans tend to move smoothly. Keep things simple and flexible, and let the day unfold without rushing from one place to another.",
    luck: "Your luck builds through communication today, especially when you speak plainly and without overthinking. The Moon in Pisces forming a sextile with Mercury in your First House helps your words land well. Small conversations or timely messages can open doors in subtle but meaningful ways.",
  },
};

const page1Sections = [
  { key: "personal_life", label: "Personal Life", icon: "♥", gold: false },
  { key: "profession", label: "Profession", icon: "◈", gold: false },
  { key: "health", label: "Health", icon: "✦", gold: false },
  { key: "emotions", label: "Emotions", icon: "◉", gold: false },
];

const page2Sections = [
  { key: "travel", label: "Travel", icon: "✈", gold: false },
  { key: "luck", label: "Luck", icon: "★", gold: true },
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const S = {
  goldBar: {
    height: 4,
    background:
      "linear-gradient(90deg,transparent 5%,#d4af37 30%,#f5d76e 50%,#d4af37 70%,transparent 95%)",
  },
  headerBg: {
    background: "linear-gradient(140deg,#3b3f63 0%,#424874 55%,#6c70a3 100%)",
    padding: "44px 44px 36px",
  },
  headerMini: {
    background: "linear-gradient(140deg,#3b3f63 0%,#424874 55%,#6c70a3 100%)",
    padding: "18px 44px",
  },
  pageWrap: {
    width: 794,
    background: "white",
    fontFamily: "'Outfit',sans-serif",
    overflow: "hidden",
    boxShadow: "0 8px 40px rgba(66,72,116,.15)",
  },
};

function GoldBar() {
  return <div style={S.goldBar} />;
}

function SectionCard({ sec }) {
  return (
    <div
      style={{
        border: "1px solid #d9d6e8",
        borderRadius: 14,
        overflow: "hidden",
        background: "white",
        boxShadow: "0 2px 8px rgba(66,72,116,.07)",
      }}
    >
      <div
        style={{
          height: 3,
          background: sec.gold
            ? "linear-gradient(90deg,#b8861f,#d4af37,#f5d76e)"
            : "linear-gradient(90deg,#3b3f63,#424874,#6c70a3)",
        }}
      />
      <div style={{ padding: "15px 15px 17px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
              border: "1px solid",
              background: sec.gold
                ? "linear-gradient(135deg,rgba(212,175,55,.18),rgba(245,215,110,.25))"
                : "linear-gradient(135deg,rgba(66,72,116,.12),#d9d6e8)",
              borderColor: sec.gold
                ? "rgba(212,175,55,.3)"
                : "rgba(66,72,116,.15)",
              color: sec.gold ? "#d4af37" : "#424874",
            }}
          >
            {sec.icon}
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Philosopher',serif",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: sec.gold ? "#b8861f" : "#424874",
              }}
            >
              {sec.label}
            </div>
            <div
              style={{
                height: 2,
                width: 18,
                borderRadius: 99,
                marginTop: 4,
                background: sec.gold
                  ? "linear-gradient(90deg,#b8861f,#f5d76e)"
                  : "linear-gradient(90deg,#424874,#6c70a3)",
              }}
            />
          </div>
        </div>
        <p
          style={{
            fontSize: 11.5,
            lineHeight: 1.8,
            color: "#475569",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {data.prediction[sec.key]}
        </p>
      </div>
    </div>
  );
}

function SecDivider({ label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "16px 0 14px",
      }}
    >
      <div style={{ flex: 1, height: 1, background: "#d9d6e8" }} />
      <span
        style={{
          fontFamily: "'Philosopher',serif",
          fontSize: 8.5,
          letterSpacing: "0.4em",
          color: "rgba(66,72,116,.45)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "#d9d6e8" }} />
    </div>
  );
}

function MidDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "24px 0 0",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to right,#d9d6e8,transparent)",
        }}
      />
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.4em",
          color: "rgba(212,175,55,.5)",
        }}
      >
        ◆ ◆ ◆
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to left,#d9d6e8,transparent)",
        }}
      />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function HoroscopePDF() {
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);
  const [loading, setLoading] = useState(false);

  const captureEl = (el) =>
    window.html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });

  const handleDownload = async () => {
    setLoading(true);
    try {
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      );
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      );

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = 210,
        pageH = 297;

      const c1 = await captureEl(page1Ref.current);
      pdf.addImage(
        c1.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageW,
        Math.min((c1.height * pageW) / c1.width, pageH),
      );

      const c2 = await captureEl(page2Ref.current);
      pdf.addPage();
      pdf.addImage(
        c2.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageW,
        Math.min((c2.height * pageW) / c2.width, pageH),
      );

      pdf.save("taurus-horoscope-12-05-2026.pdf");
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const readingDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    // Outer shell — pure Tailwind, safe to use anywhere
    <div
      className="flex flex-col items-center gap-5 min-h-screen py-9 px-4"
      style={{ background: "#dddaf0" }}
    >
      {/* ── PAGE 1 ── */}
      <p
        className="self-start text-xs tracking-widest uppercase"
        style={{
          color: "rgba(66,72,116,.4)",
          marginLeft: "max(0px, calc(50% - 397px))",
        }}
      >
        Page 1 of 2
      </p>

      <div ref={page1Ref} style={S.pageWrap}>
        <GoldBar />

        {/* Header */}
        <div style={S.headerBg}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.42em",
                  color: "rgba(253,230,138,.65)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                Daily Horoscope Reading
              </p>
              <h1
                style={{
                  fontFamily: "'Philosopher',serif",
                  fontWeight: 700,
                  fontSize: 64,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  lineHeight: 1,
                  textShadow: "0 4px 24px rgba(0,0,0,.3)",
                }}
              >
                Taurus
              </h1>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(216,180,254,.55)",
                  letterSpacing: "0.14em",
                  marginTop: 8,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                Earth Sign · Ruled by Venus · Fixed
              </p>
            </div>
            <div
              style={{
                textAlign: "right",
                paddingLeft: 28,
                borderLeft: "1px solid rgba(255,255,255,.12)",
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  fontFamily: "'Philosopher',serif",
                  fontSize: 32,
                  color: "white",
                  letterSpacing: "0.08em",
                }}
              >
                12 · 05
              </p>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "rgba(253,230,138,.45)",
                  textTransform: "uppercase",
                  marginTop: 4,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                May 2026
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 28,
            }}
          >
            <div
              style={{ flex: 1, height: 1, background: "rgba(255,255,255,.1)" }}
            />
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.45em",
                color: "rgba(253,230,138,.45)",
                textTransform: "uppercase",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              ✦ Celestial Insights ✦
            </span>
            <div
              style={{ flex: 1, height: 1, background: "rgba(255,255,255,.1)" }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "26px 36px 32px" }}>
          {/* Intro banner */}
          <div
            style={{
              background: "linear-gradient(135deg,#d9d6e8,#f0eef8)",
              border: "1px solid rgba(66,72,116,.12)",
              borderRadius: 14,
              padding: "13px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: 20,
                color: "#d4af37",
                flexShrink: 0,
                lineHeight: 1.7,
              }}
            >
              ★
            </span>
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.78,
                color: "#424874",
                fontStyle: "italic",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              Today's cosmic energy flows through open communication. Your
              softer mindset sets a meaningful tone across all areas of life —
              let honesty lead the way.
            </p>
          </div>

          <SecDivider label="Today's Predictions" />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {page1Sections.map((sec) => (
              <SectionCard key={sec.key} sec={sec} />
            ))}
          </div>

          <MidDivider />
          <p
            style={{
              textAlign: "center",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(66,72,116,.28)",
              marginTop: 8,
              textTransform: "uppercase",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            Continued on next page
          </p>
        </div>

        <GoldBar />
      </div>

      {/* ── PAGE 2 ── */}
      <p
        className="self-start text-xs tracking-widest uppercase"
        style={{
          color: "rgba(66,72,116,.4)",
          marginLeft: "max(0px, calc(50% - 397px))",
        }}
      >
        Page 2 of 2
      </p>

      <div ref={page2Ref} style={S.pageWrap}>
        <GoldBar />

        {/* Mini header */}
        <div style={S.headerMini}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 9,
                  letterSpacing: "0.38em",
                  color: "rgba(253,230,138,.55)",
                  textTransform: "uppercase",
                  marginBottom: 3,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                Daily Horoscope Reading
              </p>
              <p
                style={{
                  fontFamily: "'Philosopher',serif",
                  fontSize: 26,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Taurus
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 1,
                  height: 36,
                  background: "rgba(255,255,255,.15)",
                }}
              />
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontFamily: "'Philosopher',serif",
                    fontSize: 18,
                    color: "white",
                  }}
                >
                  12 · 05
                </p>
                <p
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    color: "rgba(253,230,138,.4)",
                    textTransform: "uppercase",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  May 2026
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "26px 36px 36px" }}>
          <SecDivider label="Continued — Travel & Luck" />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {page2Sections.map((sec) => (
              <div
                key={sec.key}
                style={{
                  border: "1px solid #d9d6e8",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "white",
                  boxShadow: "0 2px 8px rgba(66,72,116,.07)",
                }}
              >
                <div
                  style={{
                    height: 3,
                    background: sec.gold
                      ? "linear-gradient(90deg,#b8861f,#d4af37,#f5d76e)"
                      : "linear-gradient(90deg,#3b3f63,#424874,#6c70a3)",
                  }}
                />
                <div style={{ padding: "18px 20px 22px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0,
                        border: "1px solid",
                        background: sec.gold
                          ? "linear-gradient(135deg,rgba(212,175,55,.18),rgba(245,215,110,.25))"
                          : "linear-gradient(135deg,rgba(66,72,116,.12),#d9d6e8)",
                        borderColor: sec.gold
                          ? "rgba(212,175,55,.3)"
                          : "rgba(66,72,116,.15)",
                        color: sec.gold ? "#d4af37" : "#424874",
                      }}
                    >
                      {sec.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Philosopher',serif",
                          fontSize: 13,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: sec.gold ? "#b8861f" : "#424874",
                        }}
                      >
                        {sec.label}
                      </div>
                      <div
                        style={{
                          height: 2,
                          width: 22,
                          borderRadius: 99,
                          marginTop: 5,
                          background: sec.gold
                            ? "linear-gradient(90deg,#b8861f,#f5d76e)"
                            : "linear-gradient(90deg,#424874,#6c70a3)",
                        }}
                      />
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.82,
                      color: "#475569",
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >
                    {data.prediction[sec.key]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <MidDivider />

          {/* Footer strip */}
          <div
            style={{
              background: "linear-gradient(135deg,#e8e5f4,#f5f3fb)",
              border: "1px solid #d9d6e8",
              borderRadius: 14,
              padding: "16px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              marginTop: 24,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'Philosopher',serif",
                  fontSize: 12,
                  color: "#424874",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                Taurus · Earth Sign
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(66,72,116,.6)",
                  fontStyle: "italic",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                "The stars incline, they do not compel."
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "rgba(66,72,116,.45)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                  textAlign: "right",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                Reading Date
              </p>
              <p
                style={{
                  fontFamily: "'Philosopher',serif",
                  fontSize: 13,
                  color: "#424874",
                  textAlign: "right",
                }}
              >
                {readingDate}
              </p>
            </div>
          </div>
        </div>

        <GoldBar />
      </div>

      {/* ── DOWNLOAD BUTTON — pure Tailwind ── */}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-3 text-white rounded-full px-10 py-4 text-sm font-medium tracking-wide transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg,#424874,#6c70a3)",
          boxShadow: "0 4px 20px rgba(66,72,116,.4)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {loading ? (
          <span
            style={{
              width: 16,
              height: 16,
              border: "2px solid rgba(255,255,255,.35)",
              borderTopColor: "white",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }}
          />
        ) : (
          <span>⬇</span>
        )}
        {loading ? "Generating PDF…" : "Save as PDF"}
        {!loading && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "#f5d76e" }}
          />
        )}
      </button>

      {/* Only this one keyframe — scoped, tiny, no global side effects */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
