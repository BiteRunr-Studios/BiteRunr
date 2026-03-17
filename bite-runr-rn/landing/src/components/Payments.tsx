import { motion } from "framer-motion";
import { Lock, ShieldCheck, CreditCard } from "lucide-react";

const points = [
  {
    icon: Lock,
    title: "End-to-end encryption",
    description: "Card details never touch our servers. Stripe handles everything securely.",
  },
  {
    icon: ShieldCheck,
    title: "PCI Level 1 certified",
    description: "Stripe meets the highest level of payment security standards in the industry.",
  },
  {
    icon: CreditCard,
    title: "Fraud protection built in",
    description: "Machine-learning fraud detection on every transaction, powered by Stripe Radar.",
  },
];

export default function Payments() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center py-36 md:py-48 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a]" />

      {/* Subtle purple glow for trust vibe */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#635BFF]/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20 md:mb-28"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block text-[#635BFF] text-sm font-semibold tracking-widest uppercase mb-5">
            Secure Payments
          </span>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Payments powered by
            <br />
            <span className="text-[#635BFF]">Stripe</span>
          </h2>
          <p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto">
            Your money is in safe hands. Every payment is processed through Stripe,
            the same platform trusted by Amazon, Google, and millions of businesses worldwide.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
          {points.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
            >
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 md:p-10 h-full transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]">
                <div className="w-16 h-16 rounded-2xl bg-[#635BFF]/15 flex items-center justify-center mb-8 ring-1 ring-[#635BFF]/20">
                  <point.icon className="w-8 h-8 text-[#635BFF]" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">{point.title}</h3>
                <p className="text-white/40 leading-relaxed text-base md:text-lg">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stripe badge */}
        <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-5 py-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.846 1.573-2.344 1.573-1.91 0-4.898-.93-6.849-2.135l-.897 5.56C5.326 23.196 8.216 24 11.346 24c2.605 0 4.735-.635 6.275-1.837 1.677-1.309 2.522-3.248 2.522-5.627 0-4.118-2.502-5.834-6.167-7.386z"
                fill="#635BFF"
              />
            </svg>
            <span className="text-sm font-medium text-white/50">
              Secured by Stripe
            </span>
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#635BFF]/20 to-transparent" />
    </section>
  );
}
