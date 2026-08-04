import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_ABBREVIATIONS, ROLE_LABELS } from "@/lib/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-base font-semibold leading-tight">InternFlow AI</h1>
        <p className="text-xs text-muted-foreground">Intelligent Internship Platform</p>
      </div>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {ROLE_LABELS[user.role]}
            </Badge>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user.email}</p>
            </div>
            <Avatar className="size-9">
              <AvatarFallback className="text-xs font-semibold">{ROLE_ABBREVIATIONS[user.role]}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
