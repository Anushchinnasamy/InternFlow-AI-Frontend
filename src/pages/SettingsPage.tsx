import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useUpdateMe, useChangePassword } from "@/lib/settingsApi";
import { ApiError } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";

const TIMEZONES = ["UTC", "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore"];

type ThemePref = "light" | "dark" | "system";

function applyTheme(pref: ThemePref) {
  const isDark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export default function SettingsPage() {
  const { user } = useAuth();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();

  // ProtectedRoute guarantees a user here, but keep the fallback key so this
  // never throws if that ever changes.
  const storageKey = (name: string) => `${name}:${user?.id ?? "anon"}`;

  const [name, setName] = useState(user?.name ?? "");
  const [timezone, setTimezone] = useState(user?.preferences?.timezone ?? "UTC");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Purely client-side per the build plan — no backend field for these.
  // Keyed per-user-id: this is a shared-machine app (multiple seeded role
  // accounts logging in/out of the same browser during manual testing), and
  // an un-namespaced key meant whichever account last touched Settings
  // silently set the theme for whoever logged in next — a real bug found
  // during the F1 (Referrer) manual test pass, not a "missing toggle."
  const [theme, setTheme] = useState<ThemePref>(() => (localStorage.getItem(storageKey("themePreference")) as ThemePref) || "system");
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem(storageKey("prefEmailNotifications")) !== "false");
  const [inAppNotifications, setInAppNotifications] = useState(() => localStorage.getItem(storageKey("prefInAppNotifications")) !== "false");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Name can't be empty.");
      return;
    }
    try {
      await updateMe.mutateAsync({ name, timezone });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update your profile.");
    }
  }

  async function submitPasswordChange() {
    if (!currentPassword || !newPassword) {
      toast.error("Both current and new password are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation don't match.");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not change your password.");
    }
  }

  function updateTheme(value: ThemePref) {
    setTheme(value);
    localStorage.setItem(storageKey("themePreference"), value);
  }

  function updateEmailNotifications(checked: boolean) {
    setEmailNotifications(checked);
    localStorage.setItem(storageKey("prefEmailNotifications"), String(checked));
  }

  function updateInAppNotifications(checked: boolean) {
    setInAppNotifications(checked);
    localStorage.setItem(storageKey("prefInAppNotifications"), String(checked));
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and platform preferences." />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="flex max-w-md flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="settingsName">Full Name</Label>
                <Input id="settingsName" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={user ? ROLE_LABELS[user.role] : ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button disabled={updateMe.isPending} onClick={() => void saveProfile()}>
                  {updateMe.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardContent className="flex max-w-md flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div>
                <Button disabled={changePassword.isPending} onClick={() => void submitPasswordChange()}>
                  {changePassword.isPending ? "Changing…" : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardContent className="flex max-w-md flex-col gap-4">
              <div className="space-y-1.5">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={(v) => updateTheme(v as ThemePref)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={(c) => updateEmailNotifications(c === true)}
                />
                <Label htmlFor="emailNotifications">Email notifications</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="inAppNotifications"
                  checked={inAppNotifications}
                  onCheckedChange={(c) => updateInAppNotifications(c === true)}
                />
                <Label htmlFor="inAppNotifications">In-app notifications</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Saved on this device only — theme and notification preferences aren't synced across devices yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
