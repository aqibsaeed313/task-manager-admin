import { useMemo } from "react";
import { Navigate, useLocation, useRoutes } from "react-router-dom";
import { getAuthState } from "@/lib/auth";

import Dashboard from "@/pages/admin/Dashboard";
import Users from "@/pages/admin/Users";
import Tasks from "@/pages/admin/Tasks";
import Employees from "@/pages/admin/Employees";
import Appliances from "@/pages/admin/Appliances";
import Vehicles from "@/pages/admin/Vehicles";
import Locations from "@/pages/admin/Locations";
import Vendors from "@/pages/admin/Vendors";
import Scheduling from "@/pages/admin/Scheduling";
import TimeTracking from "@/pages/admin/TimeTracking";
import EmployeeTimeHistory from "@/pages/admin/EmployeeTimeHistory";
import Messaging from "@/pages/admin/Messaging";
import DoNotHire from "@/pages/admin/DoNotHire";
import Onboarding from "@/pages/admin/Onboarding";
import Reports from "@/pages/admin/Reports";
import Settings from "@/pages/admin/Settings";
import Profile from "@/pages/admin/Profile";
import RolesPermissions from "@/pages/admin/RolesPermissions";
import NotFound from "@/pages/admin/NotFound";

export default function AdminRoutes() {
  const location = useLocation();
  const auth = getAuthState();

  const routes = useMemo(
    () => [
      { index: true, element: <Dashboard /> },
      { path: "users", element: <Users /> },
      { path: "roles", element: <RolesPermissions /> },
      { path: "tasks", element: <Tasks /> },
      { path: "employees", element: <Employees /> },
      { path: "appliances", element: <Appliances /> },
      { path: "vehicles", element: <Vehicles /> },
      { path: "locations", element: <Locations /> },
      { path: "vendors", element: <Vendors /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "time-tracking", element: <TimeTracking /> },
      { path: "time-tracking/history/:employee", element: <EmployeeTimeHistory /> },
      { path: "messaging", element: <Messaging /> },
      { path: "do-not-hire", element: <DoNotHire /> },
      { path: "onboarding", element: <Onboarding /> },
      { path: "reports", element: <Reports /> },
      { path: "settings", element: <Settings /> },
      { path: "profile", element: <Profile /> },
      { path: "*", element: <NotFound /> },
    ],
    [],
  );

  const element = useRoutes(routes);

  if (!auth.isAuthenticated || auth.role !== "admin") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return element;
}
