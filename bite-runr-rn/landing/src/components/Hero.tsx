import { motion } from "framer-motion";
import { Users, Receipt, CreditCard } from "lucide-react";
import WaitlistForm from "./WaitlistForm";

const DELAY = 1.9; // wait for splash intro to finish

type HeroProps = {
  waitlistEnabled: boolean;
};

export default function Hero({ waitlistEnabled }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#060606] to-[#0a0a0a]" />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#FF8800]/[0.07] rounded-full blur-[150px] pointer-events-none" />

      {/* Secondary glow */}
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: DELAY, ease: "easeOut" }}
        >
          <img
            src="/icon.png"
            alt="BiteRunr"
            className="w-28 md:w-36 lg:w-40 h-auto mb-10 md:mb-14"
          />
        </motion.div>

        {/* Tagline */}
        <motion.h1
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: DELAY + 0.15 }}
        >
          Group food orders,
          <br />
          <span className="bg-gradient-to-r from-[#FF8800] to-[#FFB347] bg-clip-text text-transparent">
            simplified.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-xl md:text-2xl text-white/50 max-w-2xl mb-14 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: DELAY + 0.3 }}
        >
          Order together. Split fairly. No more awkward math.
        </motion.p>

        {/* Waitlist CTA */}
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: DELAY + 0.45 }}
        >
          <WaitlistForm enabled={waitlistEnabled} />
        </motion.div>

        {/* Floating UI cards */}
        <div className="relative mt-24 md:mt-36 w-full max-w-3xl h-56 md:h-72">
          <motion.div
            className="absolute left-0 md:left-4 top-2 bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-xl shadow-black/20"
            initial={{ opacity: 0, x: -60, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, delay: DELAY + 0.6 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/20 ring-1 ring-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
            </motion.div>
            <div className="text-left">
              <p className="text-sm md:text-base font-semibold text-white/90">
                3 friends joined
              </p>
              <p className="text-xs md:text-sm text-white/35 mt-0.5">
                Thai Palace Order
              </p>
            </div>
          </motion.div>

          <motion.div
            className="absolute right-0 md:right-4 top-0 bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-xl shadow-black/20"
            initial={{ opacity: 0, x: 60, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, delay: DELAY + 0.75 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.3,
              }}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-green-500/20 ring-1 ring-green-500/20 flex items-center justify-center">
                <Receipt className="w-6 h-6 md:w-7 md:h-7 text-green-400" />
              </div>
            </motion.div>
            <div className="text-left">
              <p className="text-sm md:text-base font-semibold text-white/90">
                Receipt scanned
              </p>
              <p className="text-xs md:text-sm text-white/35 mt-0.5">
                12 items detected
              </p>
            </div>
          </motion.div>

          <motion.div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 md:p-6 flex items-center gap-4 shadow-xl shadow-black/20"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: DELAY + 0.9 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2.6,
              }}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/20 ring-1 ring-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />
              </div>
            </motion.div>
            <div className="text-left">
              <p className="text-sm md:text-base font-semibold text-white/90">
                Split: $12.50 each
              </p>
              <p className="text-xs md:text-sm text-white/35 mt-0.5">
                Tap to settle up
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
    </section>
  );
}
