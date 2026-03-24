import { useMemo } from "react";
import { Navigate, useLocation, useRoutes } from "react-router-dom";
import { MainLayout } from "@/components/manger/layout/MainLayout";
import { getAuthState } from "@/lib/auth";

import Dashboard from "@/pages/manger/Dashboard";
import Tasks from "@/pages/manger/Tasks";
import Employees from "@/pages/manger/Employees";
import Scheduling from "@/pages/manger/Scheduling";
import TimeTracking from "@/pages/manger/TimeTracking";
import EmployeeTimeHistory from "@/pages/manger/EmployeeTimeHistory";
import Vehicles from "@/pages/manger/Vehicles";
import Appliances from "@/pages/manger/Appliances";
import Locations from "@/pages/manger/Locations";
import Vendors from "@/pages/manger/Vendors";
import Messages from "@/pages/manger/Messages";
import Notifications from "@/pages/manger/Notifications";
import Settings from "@/pages/manger/Settings";
import DoNotHire from "@/pages/manger/DoNotHire";
import OnboardingMonitoring from "@/pages/manger/OnboardingMonitoring";
import Reports from "@/pages/manger/Reports";
import NotFound from "@/pages/manger/NotFound";

export default function ManagerController() {
  const location = useLocation();
  const auth = getAuthState();

  const routes = useMemo(
    () => [
      { index: true, element: <Dashboard /> },
      { path: "tasks", element: <Tasks /> },
      { path: "employees", element: <Employees /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "time-tracking", element: <TimeTracking /> },
      { path: "time-tracking/history/:employee", element: <EmployeeTimeHistory /> },
      { path: "vehicles", element: <Vehicles /> },
      { path: "appliances", element: <Appliances /> },
      { path: "locations", element: <Locations /> },
      { path: "vendors", element: <Vendors /> },
      { path: "do-not-hire", element: <DoNotHire /> },
      { path: "onboarding", element: <OnboardingMonitoring /> },
      { path: "reports", element: <Reports /> },
      { path: "messages", element: <Messages /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
    [],
  );

  const element = useRoutes(routes);

  if (!auth.isAuthenticated || auth.role !== "manager") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <MainLayout>{element}</MainLayout>;
}
