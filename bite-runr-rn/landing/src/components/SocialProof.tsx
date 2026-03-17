import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function SocialProof() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center py-36 md:py-48 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[2rem] p-12 md:p-20">
          {/* Quote icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-10">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>

          <p className="text-3xl md:text-5xl font-bold leading-tight mb-10">
            "Built for friend groups who are{" "}
            <span className="bg-gradient-to-r from-[#FF8800] to-[#FFB347] bg-clip-text text-transparent">
              tired of Venmo requests.
            </span>
            "
          </p>

          <div className="flex items-center justify-center gap-4">
            <div className="flex -space-x-3">
              {["#FF8800", "#60A5FA", "#C084FC", "#34D399"].map((color, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-[3px] border-[#111] flex items-center justify-center text-xs font-bold"
                  style={{ background: `${color}25`, color }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="h-6 w-px bg-white/10" />
            <span className="text-sm text-white/40 font-medium">
              Join the waitlist
            </span>
          </div>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
}
