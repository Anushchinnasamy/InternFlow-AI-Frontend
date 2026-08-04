import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderCard({ note = "Content coming Day F2–F5." }: { note?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Construction className="size-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
