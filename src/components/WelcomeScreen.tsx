import { useEffect } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";

interface WelcomeScreenProps {
  name: string;
  role: Role;
  onDone: () => void;
}

// Plays once, right after a successful login, before handing off to the
// dashboard redirect — local component state in LoginPage, not global, so
// it never replays on later navigations/refreshes.
export function WelcomeScreen({ name, role, onDone }: WelcomeScreenProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onDone, reduceMotion ? 900 : 2200);
    return () => clearTimeout(timer);
  }, [onDone, reduceMotion]);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.15, delayChildren: reduceMotion ? 0 : 0.1 } },
  };

  const item: Variants = reduceMotion
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, rotateX: -25, scale: 0.85, y: 20 },
        show: { opacity: 1, rotateX: 0, scale: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Dismiss welcome screen"
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-[oklch(0.16_0.05_280)]"
      style={{ perspective: 1000 }}
      onClick={onDone}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onDone()}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      {!reduceMotion && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-1/4 -top-1/4 size-[60vmax] rounded-full bg-[radial-gradient(circle,var(--ai-from)_0%,transparent_70%)] opacity-40 blur-3xl"
            animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -bottom-1/4 -right-1/4 size-[60vmax] rounded-full bg-[radial-gradient(circle,var(--ai-to)_0%,transparent_70%)] opacity-40 blur-3xl"
            animate={{ scale: [1.15, 1, 1.15], rotate: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-col items-center gap-4 px-6 text-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          variants={item}
          className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-ai-from to-ai-to text-white shadow-[0_0_40px_var(--ai-glow)]"
        >
          <Sparkles className="size-7" />
        </motion.div>
        <motion.h1 variants={item} className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Welcome back, {name}!
        </motion.h1>
        <motion.p
          variants={item}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm"
        >
          Signed in as {ROLE_LABELS[role]}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
