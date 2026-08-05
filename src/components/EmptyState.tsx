import { Info } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed py-6 text-sm text-muted-foreground">
      <Info className="ml-4 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
