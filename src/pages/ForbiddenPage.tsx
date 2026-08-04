import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS } from "@/config/navigation";
import { ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  const { user } = useAuth();
  // "/" (Dashboard) is PROGRAM_OWNER/HR only — sending every role there would
  // just bounce some of them straight back here. Land on the first page
  // their own role actually has, per NAV_ITEMS (Settings/Notifications/
  // Copilot are open to all roles, so there's always at least one).
  const fallbackPath = user ? (NAV_ITEMS.find((item) => item.allowedRoles.includes(user.role))?.path ?? "/settings") : "/login";

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldAlert className="size-10 text-destructive" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">You don&apos;t have access to this page</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {user ? `Your role (${ROLE_LABELS[user.role]}) isn't permitted to view this page.` : "Please sign in to continue."}
        </p>
      </div>
      <Button asChild>
        <Link to={fallbackPath}>Back to safety</Link>
      </Button>
    </div>
  );
}
