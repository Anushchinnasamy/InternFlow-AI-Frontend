import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Consistent "this came from an AI action" marker for every AI-sourced
// card/table across the app — the audit story only holds together if a
// reader can always tell which numbers are model output vs a direct query.
export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 border-transparent bg-gradient-to-r from-ai-from to-ai-to text-[10px] uppercase tracking-wide text-white",
        className
      )}
    >
      <Sparkles className="size-3" />
      AI generated
    </Badge>
  );
}
