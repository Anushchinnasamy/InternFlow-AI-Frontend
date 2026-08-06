import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useInternshipsList,
  useUpdateChecklist,
  useAdProvision,
  useSiteAccess,
  useReadyCheck,
} from "@/lib/internshipsApi";
import { ApiError } from "@/lib/api";
import type { InternshipListItem } from "@/types/internshipsList";
import { cn } from "@/lib/utils";

const CHECKLIST_ITEMS = [
  { key: "email", label: "Email" },
  { key: "vpn", label: "VPN" },
  { key: "repository", label: "Repository" },
  { key: "internalTools", label: "Internal Tools" },
] as const;

const NEXT_STATUS: Record<string, "pending" | "in_progress" | "provisioned"> = {
  pending: "in_progress",
  in_progress: "provisioned",
  provisioned: "pending",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-muted-foreground/30 text-muted-foreground",
  in_progress: "border-status-warning/40 bg-status-warning/10 text-status-warning",
  provisioned: "border-status-good/30 bg-status-good/10 text-status-good",
};

export default function AccessProvisioningPage() {
  const { data, isPending, error } = useInternshipsList(["NDA_SIGNED", "ACCESS_PROVISIONED", "READY_TO_START"]);
  const updateChecklist = useUpdateChecklist();
  const adProvision = useAdProvision();
  const siteAccess = useSiteAccess();
  const readyCheck = useReadyCheck();

  const [siteAccessTarget, setSiteAccessTarget] = useState<InternshipListItem | null>(null);
  const [badgeNumber, setBadgeNumber] = useState("");
  const [accessZones, setAccessZones] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [provisioningRow, setProvisioningRow] = useState<string | null>(null);

  const rows = data?.internships ?? [];

  async function cycleChecklistItem(row: InternshipListItem, item: string) {
    if (!row.adProvisionTask) return;
    const current = row.adProvisionTask.checklist?.[item] ?? "pending";
    try {
      await updateChecklist.mutateAsync({ taskId: row.adProvisionTask.id, item, status: NEXT_STATUS[current] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update checklist item.");
    }
  }

  async function finalizeSiteAccess(row: InternshipListItem) {
    if (!badgeNumber.trim() || !accessZones.trim()) {
      toast.error("Badge number and at least one access zone are required.");
      return;
    }
    const zones = accessZones.split(",").map((z) => z.trim()).filter(Boolean);

    try {
      if (bulkMode) {
        // "Provision all": tick every checklist item, finalize AD
        // provisioning for real, then site access, then check readiness —
        // three real backend calls chained, not just a UI state flip. The
        // checklist+AD steps are IT_ADMIN's job; site access is
        // ADMIN_SECURITY-only (unchanged from Day 5) — a caller who only
        // holds one of those roles will get partway through and 403 on
        // the other, which is correct, not a bug, so it's reported
        // distinctly below rather than as a blanket failure.
        const unprovisionedItems = row.adProvisionTask
          ? CHECKLIST_ITEMS.filter(({ key }) => row.adProvisionTask!.checklist?.[key] !== "provisioned")
          : [];
        if (unprovisionedItems.length > 0) {
          await Promise.all(
            unprovisionedItems.map(({ key }) =>
              updateChecklist.mutateAsync({ taskId: row.adProvisionTask!.id, item: key, status: "provisioned" })
            )
          );
        }
        if (!row.adAccountActive) {
          await adProvision.mutateAsync(row.id);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.warning("Your role can't tick the checklist or finalize AD provisioning — that's IT Admin's action.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not finish AD provisioning.");
      }
      setProvisioningRow(null);
      return;
    }

    try {
      if (!row.badgeNumber) {
        await siteAccess.mutateAsync({ internshipId: row.id, badgeNumber, accessZones: zones });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.warning(
          bulkMode
            ? "Checklist and AD provisioning are done — granting site access needs an Admin Security account."
            : "Your role can't grant site access — that's Admin Security's action."
        );
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not grant site access.");
      }
      setSiteAccessTarget(null);
      setBadgeNumber("");
      setAccessZones("");
      setBulkMode(false);
      setProvisioningRow(null);
      return;
    }

    try {
      await readyCheck.mutateAsync(row.id).catch(() => {
        // ready-check 409s if something else is still missing — that's
        // expected/fine, not every row is meant to reach READY_TO_START
        // the moment this dialog closes.
      });
      toast.success(bulkMode ? "Provisioned and site access granted." : "Site access granted.");
      setSiteAccessTarget(null);
      setBadgeNumber("");
      setAccessZones("");
      setBulkMode(false);
      setProvisioningRow(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Provisioning failed.");
      setProvisioningRow(null);
    }
  }

  const isBusy = updateChecklist.isPending || adProvision.isPending || siteAccess.isPending || readyCheck.isPending;

  return (
    <>
      <PageHeader title="Access Provisioning" description="Provision system accounts and site badges before an internship goes live." />

      <Card>
        <CardContent>
          {error ? (
            <EmptyState message="Couldn't load candidate data — try refreshing the page." />
          ) : isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <EmptyState message="No candidates awaiting access provisioning." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  {CHECKLIST_ITEMS.map((item) => (
                    <TableHead key={item.key}>{item.label}</TableHead>
                  ))}
                  <TableHead>Site Access</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const siteAccessDone = !!row.badgeNumber;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.candidateName}</TableCell>
                      {CHECKLIST_ITEMS.map((item) => {
                        const status = row.adProvisionTask?.checklist?.[item.key] ?? "pending";
                        return (
                          <TableCell key={item.key}>
                            <button
                              type="button"
                              disabled={!row.adProvisionTask || row.adAccountActive}
                              onClick={() => void cycleChecklistItem(row, item.key)}
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-xs capitalize disabled:cursor-not-allowed disabled:opacity-60",
                                STATUS_CLASSES[status]
                              )}
                            >
                              {status.replace("_", " ")}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("cursor-pointer", siteAccessDone ? STATUS_CLASSES.provisioned : STATUS_CLASSES.pending)}
                          onClick={() => {
                            if (!siteAccessDone) {
                              setBulkMode(false);
                              setSiteAccessTarget(row);
                            }
                          }}
                        >
                          {siteAccessDone ? "Provisioned" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={row.adAccountActive && siteAccessDone}
                          onClick={() => {
                            setBulkMode(true);
                            setProvisioningRow(row.id);
                            setSiteAccessTarget(row);
                          }}
                        >
                          {row.adAccountActive && siteAccessDone ? (
                            <>
                              <ShieldCheck /> Ready
                            </>
                          ) : (
                            <>
                              <KeyRound /> Provision all
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!siteAccessTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSiteAccessTarget(null);
            setBulkMode(false);
            setProvisioningRow(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkMode ? "Provision all access" : "Grant site access"}</DialogTitle>
            <DialogDescription>
              For {siteAccessTarget?.candidateName}.
              {bulkMode && " This will mark all 4 checklist items provisioned, finalize AD provisioning, then grant site access."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <Label htmlFor="badgeNumber">Badge Number</Label>
              <Input id="badgeNumber" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessZones">Access Zones (comma-separated)</Label>
              <Input id="accessZones" value={accessZones} onChange={(e) => setAccessZones(e.target.value)} placeholder="e.g. Main Building, Lab 2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteAccessTarget(null)}>
              Cancel
            </Button>
            <Button disabled={isBusy} onClick={() => siteAccessTarget && void finalizeSiteAccess(siteAccessTarget)}>
              {isBusy && provisioningRow === siteAccessTarget?.id && <Spinner />}
              {isBusy && provisioningRow === siteAccessTarget?.id ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
