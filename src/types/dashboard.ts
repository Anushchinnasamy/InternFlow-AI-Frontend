// Response shapes mirroring the backend's dashboard/notifications/copilot
// routes (src/routes/dashboard.ts, notifications.ts, copilot.ts).

export interface StageCountsResponse {
  counts: Record<string, number>;
}

export interface SlaBreachTask {
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
export interface SlaBreachesResponse {
  tasks: SlaBreachTask[];
  groupedByStageAndOwner: Record<string, Record<string, number>>;
}

export interface CycleTimeResponse {
  averageBusinessDays: number | null;
  sampleSize: number;
  windowDays: number;
}

export interface DashboardBottleneck {
  stage: string;
  candidateCount: number;
  avgDwellDays: number | null;
  explanation: string;
}
export interface DashboardNarrativeResponse {
  bottlenecks: DashboardBottleneck[];
  insights: string[];
  recommendations: string[];
}

export interface DuplicateAlert {
  aiActionId: string;
  entityId: string | null;
  candidateName: string | null;
  matchedName: string | null;
  matchedCandidateId: string | null;
  similarity: number | null;
  reviewed: boolean;
  createdAt: string;
}
export interface DuplicateAlertsResponse {
  alerts: DuplicateAlert[];
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface SlaRiskPrediction {
  aiActionId: string;
  taskId: string | null;
  stage: string | null;
  candidateName: string | null;
  elapsedPercent: number | null;
  riskLevel: RiskLevel;
  riskNote: string | null;
  recommendedAction: string | null;
  createdAt: string;
}
export interface SlaRiskPredictionsResponse {
  predictions: SlaRiskPrediction[];
}

export interface AuditEventRow {
  id: string;
  actorId: string | null;
  role: string | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
  actor: { name: string; role: string } | null;
}
export interface RecentActivityResponse {
  events: AuditEventRow[];
}

export interface UpcomingClosure {
  internshipId: string;
  candidateName: string;
  projectTitle: string;
  actualEnd: string;
}
export interface UpcomingClosuresResponse {
  closures: UpcomingClosure[];
}
