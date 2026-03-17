import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Logo from "./Logo";
import WaitlistForm from "./WaitlistForm";

type FooterProps = {
  waitlistEnabled: boolean;
};

export default function Footer({ waitlistEnabled }: FooterProps) {
  return (
    <footer className="relative overflow-hidden">
      {/* CTA Section */}
      <section className="relative py-36 md:py-48 px-6" id="early-access">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-black to-[#050505]" />

        {/* Accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/[0.06] rounded-full blur-[150px] pointer-events-none" />

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 text-primary/80 text-sm font-semibold tracking-widest uppercase mb-8">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </div>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
            Ready to simplify
            <br />
            <span className="bg-gradient-to-r from-[#FF8800] to-[#FFB347] bg-clip-text text-transparent">
              group orders?
            </span>
          </h2>

          <p className="text-white/40 text-lg md:text-xl mb-12 max-w-lg mx-auto leading-relaxed">
            Be the first to know when BiteRunr launches. Early access members
            get exclusive perks.
          </p>

          <WaitlistForm enabled={waitlistEnabled} />
        </motion.div>
      </section>

      {/* Footer bar */}
      <div className="relative bg-[#050505] border-t border-white/[0.06] px-6">
        <div className="max-w-6xl mx-auto py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo className="w-28 h-auto opacity-30" />
          <p className="text-sm text-white/25">
            &copy; 2026 RunrStudios. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
