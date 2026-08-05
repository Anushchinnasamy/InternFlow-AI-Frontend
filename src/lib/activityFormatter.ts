import type { AuditEventRow } from "@/types/dashboard";
import { statusLabel } from "@/lib/statusMapping";

// Maps an AuditEvent's action+entity combination to a human-readable
// sentence for the Dashboard's "Recent Activities" feed. AuditEvent only
// carries actor/action/entity/before/after — no candidate name (most
// entities aren't Candidate itself) — so sentences name the actor and
// entity, not "who it was done to", except where `after.status` gives a
// readable destination state.
export function formatActivity(event: AuditEventRow): string {
  const actorName = event.actor?.name ?? "System";
  const after = (event.after ?? {}) as Record<string, unknown>;

  if (event.action === "TRANSITION" && typeof after.status === "string") {
    return `${actorName} moved ${event.entity} to ${statusLabel(after.status)}`;
  }

  switch (event.action) {
    case "MARK_READ":
      return `${actorName} read a notification`;
    case "MARK_ALL_READ":
      return `${actorName} cleared all notifications`;
    case "SLA_BREACH_FLAGGED":
      return `A ${event.entity.toLowerCase()} breached its SLA`;
    case "SLA_ESCALATION":
      return `An SLA escalation fired for a ${event.entity.toLowerCase()}`;
    case "SLA_RISK_FLAGGED":
      return `AI flagged an SLA risk on a ${event.entity.toLowerCase()}`;
    case "PII_REVEAL":
      return `${actorName} unmasked PII on a ${event.entity.toLowerCase()}`;
    case "CREATE":
      return `${actorName} created a ${event.entity.toLowerCase()}`;
    case "UPDATE_USER_ACTIVE":
      return `${actorName} changed a user's active status`;
    default:
      return `${actorName} performed ${event.action.toLowerCase().replaceAll("_", " ")} on a ${event.entity.toLowerCase()}`;
  }
}
