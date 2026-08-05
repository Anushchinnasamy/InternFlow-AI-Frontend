import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  label: string;
  done: boolean;
  active: boolean;
}

// Onboarding's 4-step tracker. Deliberately renders steps in whatever
// order the caller passes — the backend's real status order is Joining
// Form -> Non-Worker ID -> NDA -> Access, which differs from the
// reference design's Joining Form -> NDA -> Non-Worker ID -> Access. This
// component just draws what it's given; getting the order right is the
// caller's job (see OnboardingPage's ONBOARDING_STEPS).
export function ProgressTracker({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                step.done
                  ? "border-status-good bg-status-good text-white"
                  : step.active
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.done ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "max-w-24 text-center text-xs",
                step.done || step.active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("mx-2 h-0.5 flex-1", step.done ? "bg-status-good" : "bg-muted-foreground/30")} />
          )}
        </div>
      ))}
    </div>
  );
}
