import { motion } from "framer-motion";
import { QrCode, ScanLine, Radio, CheckCircle } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Code Invites",
    description:
      "Share orders instantly. Friends scan a code and jump right into the order.",
    color: "text-primary",
    bg: "bg-primary/15",
    ring: "ring-primary/20",
    accent: "#FF8800",
  },
  {
    icon: ScanLine,
    title: "AI Receipt Scanning",
    description:
      "Snap a photo of the receipt and items are auto-extracted. No more manual entry or guessing who ordered what.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/20",
    accent: "#34D399",
  },
  {
    icon: Radio,
    title: "Real-time Sync",
    description:
      "Everyone sees updates live as items are added. No refresh needed. The order builds itself.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    ring: "ring-blue-500/20",
    accent: "#60A5FA",
  },
  {
    icon: CheckCircle,
    title: "Settlement Tracking",
    description:
      "Know exactly who's paid and who hasn't. Send gentle nudges with one tap.",
    color: "text-purple-400",
    bg: "bg-purple-500/15",
    ring: "ring-purple-500/20",
    accent: "#C084FC",
  },
];

export default function Features() {
  return (
    <section className="relative py-36 md:py-48 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20 md:mb-28"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block text-primary/80 text-sm font-semibold tracking-widest uppercase mb-5">
            Features
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Built for the way
            <br />
            <span className="text-white/40">you actually order</span>
          </h2>
          <p className="text-white/40 text-lg md:text-xl max-w-xl mx-auto">
            Every feature designed to make group food ordering effortless.
          </p>
        </motion.div>

        <div className="space-y-20 md:space-y-32">
          {features.map((feature, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.div
                key={feature.title}
                className={`flex flex-col md:flex-row items-center gap-12 md:gap-20 ${
                  isEven ? "" : "md:flex-row-reverse"
                }`}
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8 }}
              >
                {/* Illustration */}
                <div className="flex-1 flex justify-center">
                  <div className="relative">
                    {/* Glow behind */}
                    <div
                      className="absolute inset-0 rounded-3xl blur-[60px] opacity-[0.08] pointer-events-none"
                      style={{ background: feature.accent }}
                    />
                    <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-3xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                      <div
                        className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl ${feature.bg} flex items-center justify-center ring-1 ${feature.ring}`}
                      >
                        <feature.icon
                          className={`w-12 h-12 md:w-16 md:h-16 ${feature.color}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 text-center md:text-left">
                  <div className={`inline-flex items-center gap-2 text-xs font-mono bg-white/[0.05] px-3 py-1.5 rounded-full mb-6 ${feature.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${feature.bg}`} />
                    0{i + 1}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold mb-5">
                    {feature.title}
                  </h3>
                  <p className="text-white/40 text-lg md:text-xl leading-relaxed max-w-md">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
}
