import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAdminUsers, useCreateUser, useUpdateUser, useAuditLogs } from "@/lib/adminApi";
import { queryProblem } from "@/lib/dashboardApi";
import { ApiError } from "@/lib/api";
import { ALL_ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import type { AuditLogFilters } from "@/types/admin";

const SLA_CLOCKS = [
  { label: "Mentor confirm", value: "2 business days" },
  { label: "HR screening", value: "3 business days" },
  { label: "Joining form", value: "5 calendar days" },
  { label: "Non-Worker ID issuance", value: "1 day" },
  { label: "NDA signature", value: "signed ≥1 day before start" },
  { label: "AD provisioning", value: "2 business days" },
  { label: "AD deactivation", value: "≤24h post-end" },
];

const INTEGRATIONS = [
  { label: "Active Directory", value: "ADAdapter — manual/mock implementation" },
  { label: "E-Signature", value: "ESignAdapter — manual/mock implementation" },
  { label: "Non-Worker ID Provider", value: "NonWorkerIdAdapter — manual/mock implementation" },
  { label: "Email", value: "EmailAdapter — mock, logs to NotificationLog" },
];

function ReadOnlyConfigCard({ title, rows, note }: { title: string; rows: { label: string; value: string }[]; note: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          {note}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title}</TableHead>
              <TableHead>Current Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-muted-foreground">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const usersQuery = useAdminUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("HR");

  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1 });
  const auditLogsQuery = useAuditLogs(filters);

  async function handleCreateUser() {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) {
      toast.error("Email, password, and name are all required.");
      return;
    }
    try {
      await createUser.mutateAsync({ email: newEmail, password: newPassword, name: newName, role: newRole });
      toast.success("User created.");
      setAddOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("HR");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create user.");
    }
  }

  async function handleRoleChange(userId: string, role: Role) {
    try {
      await updateUser.mutateAsync({ id: userId, role });
      toast.success("Role updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update role.");
    }
  }

  async function handleToggleActive(userId: string, active: boolean) {
    try {
      await updateUser.mutateAsync({ id: userId, active: !active });
      toast.success(!active ? "User activated." : "User deactivated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update user.");
    }
  }

  const totalPages = auditLogsQuery.data ? Math.max(1, Math.ceil(auditLogsQuery.data.total / auditLogsQuery.data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Admin" description="User management, compliance audit trail, and system configuration." />

      <Tabs defaultValue="users">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="workflow-config">Workflow Config</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus /> Add User
            </Button>
          </div>
          <Card>
            <CardContent>
              {usersQuery.error ? (
                <EmptyState message={queryProblem(usersQuery, "Your role can view Audit Logs but not manage Users.")!} />
              ) : usersQuery.isPending ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.data!.users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => void handleRoleChange(u.id, v as Role)}>
                            <SelectTrigger size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={u.active ? "border-status-good/30 bg-status-good/10 text-status-good" : "border-muted-foreground/30 text-muted-foreground"}
                          >
                            {u.active ? "Active" : "Deactivated"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => void handleToggleActive(u.id, u.active)}>
                            {u.active ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs">
          <Card className="mb-3">
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="filterEntity">Entity</Label>
                <Input
                  id="filterEntity"
                  placeholder="e.g. Internship"
                  className="w-40"
                  value={filters.entity ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filterActor">Actor ID</Label>
                <Input
                  id="filterActor"
                  placeholder="user id"
                  className="w-40"
                  value={filters.actorId ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value || undefined, page: 1 }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filterFrom">From</Label>
                <Input
                  id="filterFrom"
                  type="date"
                  className="w-40"
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value ? new Date(e.target.value).toISOString() : undefined, page: 1 }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filterTo">To</Label>
                <Input
                  id="filterTo"
                  type="date"
                  className="w-40"
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? new Date(e.target.value).toISOString() : undefined, page: 1 }))}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setFilters({ page: 1 })}>
                Clear filters
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {auditLogsQuery.error ? (
                <EmptyState message={queryProblem(auditLogsQuery, "Your role doesn't have access to the audit trail.")!} />
              ) : auditLogsQuery.isPending ? (
                <Skeleton className="h-64 w-full" />
              ) : auditLogsQuery.data!.events.length === 0 ? (
                <EmptyState message="No audit events match these filters." />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Actor Role</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Entity ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogsQuery.data!.events.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{e.role ?? "system"}</TableCell>
                          <TableCell className="font-medium">{e.action}</TableCell>
                          <TableCell>{e.entity}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{e.entityId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page {auditLogsQuery.data!.page} of {totalPages} — {auditLogsQuery.data!.total} total events
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(filters.page ?? 1) <= 1}
                        onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(filters.page ?? 1) >= totalPages}
                        onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow-config">
          <ReadOnlyConfigCard
            title="SLA Clock"
            rows={SLA_CLOCKS}
            note="Configuration editing not yet available — these are hardcoded values in the backend, not editable records."
          />
        </TabsContent>

        <TabsContent value="integrations">
          <ReadOnlyConfigCard
            title="Integration"
            rows={INTEGRATIONS}
            note="Configuration editing not yet available — every integration is a mock adapter behind a stable interface, ready to swap for a real provider later."
          />
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardContent>
              <EmptyState message="No department configuration exists yet — department is a free-text field on each user record, not a managed list." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new account and assign one of the 9 roles.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newName">Name</Label>
              <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newEmail">Email</Label>
              <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createUser.isPending} onClick={() => void handleCreateUser()}>
              {createUser.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
