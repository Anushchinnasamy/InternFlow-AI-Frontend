// Turns a NotificationLog.templateId (e.g. "T02_MENTOR_CONFIRM_REQUEST") or
// a Task.type (e.g. "AD_PROVISION") into a human-readable label, generically
// — there are dozens of template IDs across the build plan and no single
// lookup table for all of them, so this strips the "T##_" prefix and
// title-cases the rest rather than hardcoding each one.
export function humanizeTemplateId(templateId: string): string {
  const withoutPrefix = templateId.replace(/^T\d+_/, "");
  return withoutPrefix
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function humanizeTaskType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
