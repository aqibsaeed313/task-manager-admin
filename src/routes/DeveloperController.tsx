import { useMemo } from "react";
import { Navigate, useLocation, useRoutes } from "react-router-dom";
import { DeveloperLayout } from "@/components/developer/layout/DeveloperLayout";
import { getAuthState } from "@/lib/auth";

import Bugs from "@/pages/developer/Bugs";
import NotFound from "@/pages/manger/NotFound";

export default function DeveloperController() {
  const location = useLocation();
  const auth = getAuthState();

  const routes = useMemo(
    () => [
      { index: true, element: <Bugs /> },
      { path: "bugs", element: <Bugs /> },
      { path: "*", element: <NotFound /> },
    ],
    [],
  );

  const element = useRoutes(routes);

  if (!auth.isAuthenticated || auth.role !== "developer") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <DeveloperLayout>{element}</DeveloperLayout>;
}
