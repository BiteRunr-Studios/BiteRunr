import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

const joinWaitlistReference = makeFunctionReference<
  "action",
  { email: string },
  { alreadyJoined: boolean }
>("waitlist:join");

export default function WaitlistForm() {
  const joinWaitlist = useAction(joinWaitlistReference);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already" | "error"
  >(() => (localStorage.getItem("biterunr_waitlist") ? "success" : "idle"));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const result = await joinWaitlist({ email: email.trim().toLowerCase() });
      localStorage.setItem("biterunr_waitlist", "true");
      setStatus(result.alreadyJoined ? "already" : "success");
    } catch {
      setStatus("error");
    }
  };

  const submitted = status === "success" || status === "already";

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
            <p className="text-lg font-semibold text-white">
              {status === "already"
                ? "You're already on the list!"
                : "You're on the list!"}
            </p>
            <p className="text-sm text-white/40">
              We'll notify you when BiteRunr launches.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-5 py-4 rounded-full bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-base"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-8 py-4 rounded-full bg-primary hover:bg-primary-dark text-black font-bold text-base transition-all shadow-[0_0_40px_rgba(255,136,0,0.3)] hover:shadow-[0_0_60px_rgba(255,136,0,0.45)] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === "loading" ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Join Waitlist"
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {status === "error" && (
        <p className="text-red-400 text-sm text-center mt-3">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
