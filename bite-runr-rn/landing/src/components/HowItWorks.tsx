import { motion } from "framer-motion";
import { QrCode, ShoppingBag, ScanLine, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    title: "Create an Order",
    description:
      "Pick a restaurant and invite your friends with a QR code or link.",
    color: "text-primary",
    bg: "bg-primary/15",
    ring: "ring-primary/20",
  },
  {
    icon: ShoppingBag,
    title: "Add Your Items",
    description:
      "Friends join and add what they want in real-time.",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    ring: "ring-blue-500/20",
  },
  {
    icon: ScanLine,
    title: "Split & Settle",
    description:
      "AI scans the receipt. Everyone pays their fair share instantly.",
    color: "text-green-400",
    bg: "bg-green-500/15",
    ring: "ring-green-500/20",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center py-36 md:py-48 px-6 overflow-hidden snap-start">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20 md:mb-28"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block text-primary/80 text-sm font-semibold tracking-widest uppercase mb-5">
            How It Works
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Three steps. <span className="text-white/40">Zero headaches.</span>
          </h2>
          <p className="text-white/40 text-lg md:text-xl max-w-lg mx-auto">
            From restaurant to receipt, we handle the messy parts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="relative"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.2 }}
            >
              {/* Connector arrow (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 text-white/15">
                  <ChevronRight className="w-8 h-8" />
                </div>
              )}

              <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 md:p-10 h-full transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]">
                {/* Step pill */}
                <div className="inline-flex items-center gap-2 text-xs font-mono text-white/30 bg-white/[0.05] px-3 py-1.5 rounded-full mb-8">
                  <span className={`w-1.5 h-1.5 rounded-full ${step.bg}`} />
                  Step {i + 1}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center mb-8 ring-1 ${step.ring}`}>
                  <step.icon className={`w-8 h-8 ${step.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl md:text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-white/40 leading-relaxed text-base md:text-lg">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
}
