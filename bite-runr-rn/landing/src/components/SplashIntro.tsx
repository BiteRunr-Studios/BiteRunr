import { motion } from "framer-motion";

interface SplashIntroProps {
  onComplete: () => void;
}

export default function SplashIntro({ onComplete }: SplashIntroProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      initial={{ opacity: 1, pointerEvents: "auto" as const }}
      animate={{ opacity: 0, pointerEvents: "none" as const }}
      transition={{ duration: 0.3, delay: 1.6, ease: "easeIn" }}
      onAnimationComplete={onComplete}
    >
      <motion.img
        src="/icon.png"
        alt=""
        className="w-auto"
        initial={{ height: "110vh", y: 0 }}
        animate={{ height: "8rem", y: "-30vh" }}
        transition={{
          height: { duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] },
          y: { duration: 0.5, delay: 1.1, ease: [0.22, 1, 0.36, 1] },
        }}
      />
    </motion.div>
  );
}
