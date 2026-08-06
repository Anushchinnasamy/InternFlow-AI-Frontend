import {
  LayoutDashboard,
  UserPlus,
  ScanSearch,
  Users,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  IdCard,
  KeyRound,
  GitBranch,
  Archive,
  Award,
  Kanban,
  Timer,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { ALL_ROLES, type Role } from "@/lib/roles";

import DashboardPage from "@/pages/DashboardPage";
import ReferralIntakePage from "@/pages/ReferralIntakePage";
import ResumeAnalyzerPage from "@/pages/ResumeAnalyzerPage";
import CandidatesPage from "@/pages/CandidatesPage";
import CandidateEvaluationPage from "@/pages/CandidateEvaluationPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NdaManagementPage from "@/pages/NdaManagementPage";
import NonWorkerIdPage from "@/pages/NonWorkerIdPage";
import AccessProvisioningPage from "@/pages/AccessProvisioningPage";
import InternLifecyclePage from "@/pages/InternLifecyclePage";
import ClosurePage from "@/pages/ClosurePage";
import CertificatesPage from "@/pages/CertificatesPage";
import WorkflowTrackingPage from "@/pages/WorkflowTrackingPage";
import SlaMonitoringPage from "@/pages/SlaMonitoringPage";
import InsightsPage from "@/pages/InsightsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/SettingsPage";
import CopilotPage from "@/pages/CopilotPage";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: readonly Role[];
  component: ComponentType;
}

// Single source of truth for the sidebar, the router, AND route guarding
// (ProtectedRoute reads `allowedRoles` straight from here) — the backend's
// actual permission matrix (src/middleware/rbac.ts) is what's authoritative;
// this only controls what the UI offers to click, per CLAUDE.md rule 2.
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, allowedRoles: ["PROGRAM_OWNER", "HR"], component: DashboardPage },
  {
    path: "/referral-intake",
    label: "Referral Intake",
    icon: UserPlus,
    allowedRoles: ["REFERRER", "HR"],
    component: ReferralIntakePage,
  },
  {
    path: "/resume-analyzer",
    label: "AI Resume Analyzer",
    icon: ScanSearch,
    allowedRoles: ["REFERRER", "HR"],
    component: ResumeAnalyzerPage,
  },
  {
    path: "/candidates",
    label: "Candidates",
    icon: Users,
    // LEGAL added during manual role testing — candidate.search/view360 on
    // the backend now include LEGAL so they have a way to reach a specific
    // candidate's joining record (see /onboarding below).
    allowedRoles: ["HR", "PROGRAM_OWNER", "MENTOR", "REFERRER", "LEGAL"],
    component: CandidatesPage,
  },
  {
    path: "/evaluation",
    label: "Candidate Evaluation",
    icon: ClipboardCheck,
    allowedRoles: ["HR"],
    component: CandidateEvaluationPage,
  },
  {
    path: "/onboarding",
    label: "Onboarding",
    icon: ClipboardList,
    allowedRoles: ["CANDIDATE", "HR", "LEGAL"],
    component: OnboardingPage,
  },
  { path: "/nda", label: "NDA Management", icon: FileSignature, allowedRoles: ["HR", "LEGAL"], component: NdaManagementPage },
  { path: "/non-worker-id", label: "Non-Worker ID", icon: IdCard, allowedRoles: ["HR"], component: NonWorkerIdPage },
  {
    path: "/access",
    label: "Access Provisioning",
    icon: KeyRound,
    allowedRoles: ["IT_ADMIN", "ADMIN_SECURITY"],
    component: AccessProvisioningPage,
  },
  {
    path: "/lifecycle",
    label: "Intern Lifecycle",
    icon: GitBranch,
    // PROGRAM_OWNER added alongside MENTOR/HR — extension.decide (backend
    // rbac.ts) requires both HR and PROGRAM_OWNER, but this page was never
    // reachable for PROGRAM_OWNER, so they had no way to act on their half
    // of the approval. See useDecideExtension.
    allowedRoles: ["MENTOR", "HR", "PROGRAM_OWNER"],
    component: InternLifecyclePage,
  },
  {
    path: "/closure",
    label: "Closure",
    icon: Archive,
    allowedRoles: ["HR", "IT_ADMIN", "ADMIN_SECURITY"],
    component: ClosurePage,
  },
  {
    path: "/certificates",
    label: "Certificates",
    icon: Award,
    // Matches backend PERMISSION_MATRIX.certificate.list exactly — this is
    // the internal management page (Revoke, Generate, Templates), not a
    // candidate-facing download view, so CANDIDATE (the placeholder guess
    // from before this page existed) doesn't belong here.
    allowedRoles: ["HR", "PROGRAM_OWNER"],
    component: CertificatesPage,
  },
  {
    path: "/workflow",
    label: "Workflow Tracking",
    icon: Kanban,
    allowedRoles: ["PROGRAM_OWNER", "HR"],
    component: WorkflowTrackingPage,
  },
  {
    path: "/sla",
    label: "SLA Monitoring",
    icon: Timer,
    allowedRoles: ["PROGRAM_OWNER", "HR", "IT_ADMIN", "ADMIN_SECURITY"],
    component: SlaMonitoringPage,
  },
  { path: "/insights", label: "Insights", icon: BarChart3, allowedRoles: ["PROGRAM_OWNER"], component: InsightsPage },
  { path: "/notifications", label: "Notifications", icon: Bell, allowedRoles: ALL_ROLES, component: NotificationsPage },
  {
    path: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    // Union of admin.usersManage ([SYSADMIN]) and admin.auditLog
    // ([SYSADMIN, PROGRAM_OWNER, LEGAL]) — LEGAL only has real backend
    // access to the Audit Logs tab, not Users, but the page is the only
    // route to either, so LEGAL needs to reach it at all.
    allowedRoles: ["SYSADMIN", "PROGRAM_OWNER", "LEGAL"],
    component: AdminPage,
  },
  { path: "/settings", label: "Settings", icon: Settings, allowedRoles: ALL_ROLES, component: SettingsPage },
  {
    path: "/copilot",
    label: "AI Copilot",
    icon: Sparkles,
    // Union of chatbot.ask ([REFERRER, CANDIDATE, MENTOR]) and
    // copilot.analyze ([HR, PROGRAM_OWNER, MENTOR, IT_ADMIN, ADMIN_SECURITY])
    // — LEGAL and SYSADMIN are in neither, so this page would be a
    // guaranteed dead end for them no matter what they asked.
    allowedRoles: ["REFERRER", "CANDIDATE", "MENTOR", "HR", "PROGRAM_OWNER", "IT_ADMIN", "ADMIN_SECURITY"],
    component: CopilotPage,
  },
];
