import { NavLink } from "react-router-dom";
import { Layers } from "lucide-react";
import { NAV_ITEMS } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { user } = useAuth();
  const items = user ? NAV_ITEMS.filter((item) => item.allowedRoles.includes(user.role)) : [];

  return (
    <aside className="flex h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Layers className="size-5 text-sidebar-primary" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight">InternFlow</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
