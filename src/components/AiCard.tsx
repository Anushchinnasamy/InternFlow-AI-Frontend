import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import { AiBadge } from "@/components/AiBadge";
import { cn } from "@/lib/utils";

interface AiCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

// Shared shell for every AI-sourced widget (Workflow Bottlenecks, AI
// Insights, AI Risk Predictions, etc.) so the "this is AI output" badge is
// never something a page author has to remember to add individually.
export function AiCard({ title, description, children, className }: AiCardProps) {
  return (
    <Card
      className={cn(
        // Gradient border + soft glow so AI-sourced content reads as
        // visually distinct at a glance, not just via the badge text.
        "relative border-ai-from/30 shadow-[0_0_0_1px_var(--ai-glow),0_8px_24px_-12px_var(--ai-glow)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-br before:from-ai-from/5 before:to-ai-to/5",
        className
      )}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <AiBadge />
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
