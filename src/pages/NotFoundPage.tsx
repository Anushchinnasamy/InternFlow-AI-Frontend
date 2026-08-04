import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <Compass className="size-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">That route doesn&apos;t exist.</p>
      </div>
      <Button asChild>
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
