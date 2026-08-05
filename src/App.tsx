import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NAV_ITEMS } from "@/config/navigation";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForbiddenPage from "@/pages/ForbiddenPage";
import NotFoundPage from "@/pages/NotFoundPage";

const EVALUATION_NAV_ITEM = NAV_ITEMS.find((item) => item.path === "/evaluation")!;
const ONBOARDING_NAV_ITEM = NAV_ITEMS.find((item) => item.path === "/onboarding")!;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<AppShell />}>
              {NAV_ITEMS.map(({ path, allowedRoles, component: Page }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute allowedRoles={allowedRoles}>
                      <Page />
                    </ProtectedRoute>
                  }
                />
              ))}
              {/* Detail route reached from the Candidates table's "View"
                  action, not its own sidebar entry — same component and
                  role guard as the "/evaluation" nav item above. */}
              <Route
                path="/evaluation/:candidateId"
                element={
                  <ProtectedRoute allowedRoles={EVALUATION_NAV_ITEM.allowedRoles}>
                    <EVALUATION_NAV_ITEM.component />
                  </ProtectedRoute>
                }
              />
              {/* Detail route reached from the Candidates table's "View"
                  action (HR) — a CANDIDATE visiting the bare "/onboarding"
                  nav item resolves to their own record client-side instead. */}
              <Route
                path="/onboarding/:candidateId"
                element={
                  <ProtectedRoute allowedRoles={ONBOARDING_NAV_ITEM.allowedRoles}>
                    <ONBOARDING_NAV_ITEM.component />
                  </ProtectedRoute>
                }
              />
              <Route path="/403" element={<ForbiddenPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
