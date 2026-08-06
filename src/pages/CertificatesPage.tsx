import { useState } from "react";
import { toast } from "sonner";
import { Award, Download, Ban, FileText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useIssuedCertificates,
  usePendingCertificates,
  useRevokeCertificate,
  downloadCertificate,
} from "@/lib/certificatesApi";
import { useApproveCertificateRequest, useGenerateCertificate } from "@/lib/internshipsApi";
import { ApiError } from "@/lib/api";
import type { IssuedCertificate, PendingCertificate } from "@/types/certificates";

const CERTIFICATE_TEMPLATE_TEXT = `CERTIFICATE OF COMPLETION (Template)

This certifies that the named intern successfully completed the internship
project described on the generated certificate, under the mentorship listed,
between the stated start and end dates.

This is placeholder template text for the read-only preview — the actual
generated certificate (per candidate) is produced by generateCertificatePdf()
on the backend with real candidate/project/date/reference-number details.`;

export default function CertificatesPage() {
  const [tab, setTab] = useState<"issued" | "pending">("issued");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [revoking, setRevoking] = useState<IssuedCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const issuedQuery = useIssuedCertificates();
  const pendingQuery = usePendingCertificates();
  const revokeCertificate = useRevokeCertificate();
  const approveRequest = useApproveCertificateRequest();
  const generateCertificate = useGenerateCertificate();

  async function handleDownload(cert: IssuedCertificate) {
    setDownloadingId(cert.id);
    try {
      await downloadCertificate(cert.id, cert.referenceNumber);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download this certificate.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleRevoke() {
    if (!revoking) return;
    if (!revokeReason.trim()) {
      toast.error("A reason is required to revoke a certificate.");
      return;
    }
    try {
      await revokeCertificate.mutateAsync({ id: revoking.id, reason: revokeReason });
      toast.success("Certificate revoked.");
      setRevoking(null);
      setRevokeReason("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not revoke this certificate.");
    }
  }

  // Chains whichever of the Day 6 request/approve/generate steps hasn't
  // happened yet — checks status first rather than blindly calling both,
  // since approve 409s if it's already been approved.
  async function handleGenerate(item: PendingCertificate) {
    try {
      if (!item.certificateApprovedAt) {
        await approveRequest.mutateAsync(item.internshipId);
      }
      await generateCertificate.mutateAsync(item.internshipId);
      toast.success("Certificate generated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not generate this certificate.");
    }
  }

  const isGenerating = approveRequest.isPending || generateCertificate.isPending;

  return (
    <>
      <PageHeader title="Certificates" description="Request, approve, and issue internship completion certificates." />

      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
          <FileText />
          Templates
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "issued" | "pending")}>
        <TabsList className="mb-4">
          <TabsTrigger value="issued">Issued</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="issued">
          {issuedQuery.error ? (
            <EmptyState message="Couldn't load certificates — try refreshing the page." />
          ) : issuedQuery.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : (issuedQuery.data?.issued.length ?? 0) === 0 ? (
            <EmptyState message="No certificates issued yet." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {issuedQuery.data!.issued.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="size-4 text-status-good" />
                        <div>
                          <p className="font-medium">{cert.candidateName}</p>
                          <p className="text-xs text-muted-foreground">{cert.projectTitle}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{cert.referenceNumber}</Badge>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === cert.id}
                        onClick={() => void handleDownload(cert)}
                      >
                        {downloadingId === cert.id ? <Spinner /> : <Download />} {downloadingId === cert.id ? "Downloading…" : "Download"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRevoking(cert)}>
                        <Ban /> Revoke
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingQuery.error ? (
            <EmptyState message="Couldn't load pending certificate requests — try refreshing the page." />
          ) : pendingQuery.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : (pendingQuery.data?.pending.length ?? 0) === 0 ? (
            <EmptyState message="No certificate requests pending." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pendingQuery.data!.pending.map((item) => (
                <Card key={item.internshipId}>
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <p className="font-medium">{item.candidateName}</p>
                      <p className="text-xs text-muted-foreground">{item.projectTitle}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={item.certificateApprovedAt ? "w-fit border-status-good/30 bg-status-good/10 text-status-good" : "w-fit"}
                    >
                      {item.certificateApprovedAt ? "Approved — ready to generate" : "Awaiting HR approval"}
                    </Badge>
                    <div className="flex justify-end">
                      <Button size="sm" disabled={isGenerating} onClick={() => void handleGenerate(item)}>
                        {isGenerating ? <Spinner /> : <Sparkles />} {isGenerating ? "Working…" : "Generate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke certificate — {revoking?.candidateName}</DialogTitle>
            <DialogDescription>
              This marks {revoking?.referenceNumber} as revoked. The record itself is never deleted — it stays
              visible in the audit trail with the reason below.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for revocation..."
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={revokeCertificate.isPending} onClick={() => void handleRevoke()}>
              {revokeCertificate.isPending && <Spinner />}
              {revokeCertificate.isPending ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certificate Template</DialogTitle>
            <DialogDescription>Read-only preview of the current template text.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-y-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{CERTIFICATE_TEMPLATE_TEXT}</pre>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
