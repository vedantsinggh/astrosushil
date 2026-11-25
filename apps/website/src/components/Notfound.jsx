/* eslint-disable no-unused-vars */

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Compass } from "lucide-react";


function Star({ style }) {
  return (
    <motion.div
      className="absolute rounded-full bg-gold/70"
      style={style}
      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
      transition={{
        duration: style.duration,
        repeat: Infinity,
        delay: style.delay,
        ease: "easeInOut",
      }}
    />
  );
}


const STARS = Array.from({ length: 28 }, (_, i) => ({
  width: (((i * 37 + 11) % 4) + 2) + "px",
  height: (((i * 37 + 11) % 4) + 2) + "px",
  top: ((i * 73 + 19) % 90) + "%",
  left: ((i * 53 + 7) % 95) + "%",
  duration: 2.5 + (i % 4) * 0.7,
  delay: (i % 7) * 0.4,
}));


function OrbitRing({ radius, duration, children, startAngle = 0 }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
      style={{ rotate: startAngle }}
    >
      <div
        className="absolute rounded-full border border-dashed border-primary/20"
        style={{ width: radius * 2, height: radius * 2 }}
      />
      <div
        className="absolute"
        style={{ transform: `translateY(-${radius}px)` }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, #1a1c35 0%, #2d2f52 50%, #1a1c35 100%)" }}
    >
      {/* ── Ambient glow blobs ── */}
      <div
        className="absolute top-[-10%] left-[-5%] w-125 h-125 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(66,72,116,0.55) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-100 h-100 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)" }}
      />

      {/* ── Stars ── */}
      {STARS.map((s, i) => <Star key={i} style={s} />)}

      
      <div className="relative flex items-center justify-center mb-10" style={{ width: 280, height: 280 }}>
     
        <OrbitRing radius={130} duration={22}>
          <div className="w-2.5 h-2.5 rounded-full bg-gold/80 shadow-[0_0_8px_2px_rgba(212,175,55,0.6)]" />
        </OrbitRing>

       
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute rounded-full border border-dotted border-white/10" style={{ width: 190, height: 190 }} />
          <div className="absolute" style={{ transform: "translateY(-95px)" }}>
            <div className="w-2 h-2 rounded-full bg-secondary/90" />
          </div>
          <div className="absolute" style={{ transform: "translateY(95px)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
          </div>
        </motion.div>

        {/* Inner ring */}
        <OrbitRing radius={75} duration={10} startAngle={45}>
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
        </OrbitRing>

        {/* Static base circle */}
        <div
          className="absolute rounded-full border border-white/8"
          style={{ width: 260, height: 260 }}
        />

      
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center justify-center w-40 h-40 rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 35%, rgba(66,72,116,0.9), rgba(26,28,53,0.95))",
            boxShadow: "0 0 60px rgba(66,72,116,0.5), 0 0 0 1px rgba(255,255,255,0.07) inset",
          }}
        >
          {/* Sanskrit-esque Om symbol */}
          <motion.span
            className="text-gold/80 text-4xl leading-none select-none"
            style={{ fontFamily: "serif" }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            ॐ
          </motion.span>
          <span
            className="text-white/25 text-[10px] tracking-[0.3em] uppercase mt-1"
            style={{ fontFamily: "var(--font-body, sans-serif)" }}
          >
            lost
          </span>
        </motion.div>
      </div>

     
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center px-6 z-10"
      >
      
        <div className="relative mb-3">
          <span
            className="text-[120px] sm:text-[150px] font-heading leading-none select-none"
            style={{
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(212,175,55,0.35)",
              letterSpacing: "-0.04em",
            }}
          >
            404
          </span>
          <motion.span
            className="absolute inset-0 flex items-center justify-center text-[120px] sm:text-[150px] font-heading leading-none select-none"
            style={{
              color: "transparent",
              WebkitTextStroke: "1px rgba(212,175,55,0.08)",
              filter: "blur(12px)",
              letterSpacing: "-0.04em",
            }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            404
          </motion.span>
        </div>

        {/* Divider with Om */}
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-12 bg-gold/30" />
          <span className="text-gold/60 text-xs tracking-[0.25em] uppercase font-body">
            Page Not Found
          </span>
          <span className="h-px w-12 bg-gold/30" />
        </div>

        <h1 className="font-heading text-white text-2xl sm:text-3xl mb-3 leading-snug">
          The Stars Couldn't Find This Path
        </h1>
        <p className="text-white/40 font-body text-sm sm:text-base max-w-sm leading-relaxed mb-8">
          The page you're seeking has wandered beyond our cosmic charts.
          Let us guide you back to alignment.
        </p>

        
        <div className="flex flex-col sm:flex-row items-center gap-3 my-4">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-sm tracking-widest uppercase text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            style={{
              background: "linear-gradient(135deg, #424874, #5a5f96)",
              boxShadow: "0 8px 32px rgba(66,72,116,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            <Home size={15} />
            Go Home
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-sm tracking-widest uppercase text-white/70 border border-white/12 hover:border-white/25 hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <ArrowLeft size={15} />
            Go Back
          </motion.button>
        </div>

       
      </motion.div>

     
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute bottom-6 flex items-center gap-2"
      >
        <Compass size={12} className="text-white/20" />
        <span className="text-white/20 text-[10px] font-body tracking-[0.2em] uppercase">
          Astro Sushil
        </span>
        <Compass size={12} className="text-white/20" />
      </motion.div>
    </div>
  );
}