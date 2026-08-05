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
    <Card className={cn(className)}>
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
