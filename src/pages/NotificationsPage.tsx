import { formatDistanceToNow } from "date-fns";
import { Mail, AlertTriangle, BellRing, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useNotificationsMine,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/notificationsApi";
import { humanizeTemplateId, humanizeTaskType } from "@/lib/notificationFormat";

type FeedItem =
  | { kind: "email"; id: string; label: string; timestamp: string; status: string; readAt: string | null }
  | { kind: "escalation" | "reminder"; id: string; label: string; timestamp: string; status: "Pending" };

export default function NotificationsPage() {
  const { data, isPending } = useNotificationsMine();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const emailItems: FeedItem[] = (data?.notifications ?? []).map((n) => ({
    kind: "email",
    id: n.id,
    label: humanizeTemplateId(n.templateId),
    timestamp: n.sentAt,
    status: n.status,
    readAt: n.readAt,
  }));

  const taskItems: FeedItem[] = (data?.pendingTasks ?? []).map((t) => ({
    kind: t.slaBreached ? "escalation" : "reminder",
    id: t.id,
    label: humanizeTaskType(t.type),
    timestamp: t.dueAt,
    status: "Pending",
  }));

  const feed = [...emailItems, ...taskItems].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const unreadCount = emailItems.filter((i) => i.kind === "email" && !i.readAt).length;

  return (
    <>
      <PageHeader title="Notifications" description="Delivery status for every email sent by the platform." />

      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck />
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : feed.length === 0 ? (
            <EmptyState message="No notifications yet." />
          ) : (
            <ul className="flex flex-col gap-1">
              {feed.map((item) => {
                const isUnread = item.kind === "email" && !item.readAt;
                const Icon = item.kind === "email" ? Mail : item.kind === "escalation" ? AlertTriangle : BellRing;
                return (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className={cn(
                      "flex cursor-default items-center gap-3 rounded-lg border-b p-3 last:border-0",
                      isUnread && "bg-accent/40"
                    )}
                    onClick={() => {
                      if (item.kind === "email" && !item.readAt) markRead.mutate(item.id);
                    }}
                    role={item.kind === "email" ? "button" : undefined}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        item.kind === "escalation" ? "text-status-critical" : "text-muted-foreground"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", isUnread && "font-medium")}>{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.kind === "email" ? "Email" : item.kind === "escalation" ? "Escalation" : "Reminder"}
                        {" · "}
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={item.status === "sent" || item.status === "Sent" ? "secondary" : "outline"}>
                      {item.status === "sent" ? "Sent" : item.status}
                    </Badge>
                    {isUnread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
