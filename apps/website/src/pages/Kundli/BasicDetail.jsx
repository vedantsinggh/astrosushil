/* eslint-disable no-unused-vars */
// BasicDetails.jsx — Step 1: Basic + Astro details, Planets table
import { motion } from "framer-motion";

function Card({ title, children }) {
  return (
    <div className="bg-white border border-[#e0d9f5] rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ede8f8]">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-4 rounded-full bg-primary inline-block" />
          <span className="text-sm font-bold text-black">{title}</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#d4cdf5]" />
      </div>
      {children}
    </div>
  );
}

function KVRow({ label, value }) {
  return (
    <div className="flex items-stretch gap-4 border-b border-[#f3f0fb] bg-[#F4EEFF] last:border-0">
      <span className="text-xs text-black/50 w-36 shrink-0 px-5 py-2.5 ">
        {label}
      </span>
      <span className="text-xs font-semibold text-black px-5 py-2.5 flex-1 text-right">
        {value ?? "—"}
      </span>
    </div>
  );
}

const stagger = { visible: { transition: { staggerChildren: 0.04 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function BasicDetails({ data }) {
  const raw     = data ?? {};

  const user    = raw.user         ?? raw;
  const a       = raw.astro_details ?? raw.astroDetails ?? {};
  const planets = raw.planets       ?? [];

  const name       = user.name       ?? user.fullName    ?? "—";
  const dob        = user.dob        ?? user.dateOfBirth ?? "—";
  const birthTime  = user.birthTime  ?? user.hour + ":" + user.min ?? "—";
  const birthPlace = user.birthPlace ?? "—";
  const latitude   = user.latitude   ?? user.lat         ?? "—";
  const longitude  = user.longitude  ?? user.lng         ?? user.lon   ?? "—";

 
  const ascendant     = a.ascendant      ?? a.Ascendant     ?? "—";
  const ascendantLord = a.ascendant_lord ?? a.AscendantLord ?? "—";
  const sign          = a.sign           ?? a.Sign          ?? "—";
  const signLord      = a.SignLord       ?? a.sign_lord     ?? "—";
  const nakshatra     = a.Naksahtra      ?? a.nakshatra     ?? a.Nakshatra ?? "—";
  const nakshatraLord = a.NaksahtraLord  ?? a.nakshatraLord ?? "—";

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible">

   
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
      >
        <Card title="Basic Details">
          <KVRow label="Full Name"     value={name}       />
          <KVRow label="Date of Birth" value={dob}        />
          <KVRow label="Birth Time"    value={birthTime}  />
          <KVRow label="Birth Place"   value={birthPlace} />
          <KVRow label="Latitude"      value={latitude}   />
          <KVRow label="Longitude"     value={longitude}  />
        </Card>

        <Card title="Astro Details">
          <KVRow label="Ascendant"      value={ascendant}     />
          <KVRow label="Ascendant Lord" value={ascendantLord} />
          <KVRow label="Sign"           value={sign}          />
          <KVRow label="Sign Lord"      value={signLord}      />
          <KVRow label="Nakshatra"      value={nakshatra}     />
          <KVRow label="Nakshatra Lord" value={nakshatraLord} />
        </Card>
      </motion.div>

     
      <motion.div variants={fadeUp}>
        <Card title="Planetary Position">
          <div className="overflow-x-auto">
            <table
              className="w-full text-xs"
              style={{ tableLayout: "fixed", minWidth: 640 }}
            >
              <thead>
                <tr className="bg-[#faf8ff] border-b border-[#ede8f8]">
                  {[
                    { label: "ID",              w: 36   },
                    { label: "Planet Name",     w: null },
                    { label: "Full Degree",     w: null },
                    { label: "Speed",           w: null },
                    { label: "Is Retro",        w: 70   },
                    { label: "Sign (Lord)",     w: null },
                    { label: "Nakshatra (Lord)", w: null },
                    { label: "Nakshatra (Pad)", w: 100  },
                  ].map(({ label, w }) => (
                    <th
                      key={label}
                      className="text-left px-3 py-3 text-[10px] font-bold text-black/40 uppercase tracking-wider"
                      style={w ? { width: w } : {}}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planets.map((p, i) => {
                  const pSign      = p.sign           ?? "—";
                  const pSignLord  = p.sign_lord      ?? p.signLord      ?? "";
                  const pNakshatra = p.nakshatra      ?? "—";
                  const pNakLord   = p.nakshatraLord  ?? p.nakshatra_lord ?? "—";
                  const pPad       = p.nakshatra_pad  ?? p.nakshatraPad  ?? "—";
                  const isRetro    = p.isRetro        ?? p.is_retro      ?? false;

                  return (
                    <tr
                      key={p.id ?? i}
                      className={`border-b border-[#f3f0fb] transition-colors hover:bg-[#faf8ff] ${
                        i % 2 === 0 ? "" : "bg-[#fdf9ff]"
                      }`}
                    >
                      
                      <td className="px-3 py-3 text-black/30 font-mono">
                        {String(p.id ?? i + 1).padStart(2, "0")}
                      </td>

                     
                      <td className="px-3 py-3 font-semibold text-black">
                        {p.name ?? "—"}
                      </td>

                     
                      <td className="px-3 py-3 font-mono text-black/70">
                        {p.fullDegree ?? p.full_degree ?? "—"}
                      </td>

                     
                      <td className="px-3 py-3 font-mono text-black/60">
                        {p.speed ?? "—"}
                      </td>

                     
                      <td className="px-3 py-3">
                        {isRetro ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            TRUE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0eeff] text-primary/60 border border-[#e0d9f5]">
                            FALSE
                          </span>
                        )}
                      </td>

                   
                      <td className="px-3 py-3">
                        <p className="text-black/80 font-medium">{pSign}</p>
                        {pSignLord && (
                          <p className="text-black/35 text-[10px]">{pSignLord}</p>
                        )}
                      </td>

                    
                      <td className="px-3 py-3">
                        <p className="text-black/80 font-medium">{pNakshatra}</p>
                        <p className="text-black/35 text-[10px]">{pNakLord}</p>
                      </td>

                    
                      <td className="px-3 py-3">
                        <span className="w-6 h-6 rounded-full bg-[#eeedfe] text-primary text-[11px] font-bold flex items-center justify-center">
                          {pPad}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

    </motion.div>
  );
}