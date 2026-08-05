export interface NotificationLog {
  id: string;
  templateId: string;
  recipient: string;
  status: string;
  sentAt: string;
  readAt: string | null;
  internshipId: string | null;
  providerId: string | null;
}

export interface PendingTask {
  id: string;
  internshipId: string | null;
  referralId: string | null;
  type: string;
  assigneeRole: string;
  dueAt: string;
  slaBreached: boolean;
  escalationTier: number;
  completedAt: string | null;
  createdAt: string;
}

export interface NotificationsMineResponse {
  notifications: NotificationLog[];
  pendingTasks: PendingTask[];
}
