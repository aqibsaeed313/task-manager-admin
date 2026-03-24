import { Toaster } from "@/components/manger/ui/toaster";
import { Toaster as Sonner } from "@/components/manger/ui/sonner";
import { TooltipProvider } from "@/components/manger/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/admin/Login";
import EmployeeLogin from "./Employee/screens/Login";
import AdminRoutes from "./routes/AdminRoutes";
import ManagerController from "./routes/ManagerController";
import DeveloperController from "./routes/DeveloperController";
import EmployeeController from "./Employee/routes/EmployeeController";
import { getAuthState } from "./lib/auth";
import { getEmployeeAuth } from "./Employee/lib/auth";

const queryClient = new QueryClient();

function IndexRedirect() {
  const auth = getAuthState();
  const employeeAuth = getEmployeeAuth();
  
  if (employeeAuth) return <Navigate to="/employee" replace />;
  if (!auth.isAuthenticated || !auth.role) return <Navigate to="/login" replace />;
  if (auth.role === "developer") return <Navigate to="/developer" replace />;
  return <Navigate to={auth.role === "admin" || auth.role === "super-admin" ? "/admin" : "/manager"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/employee" element={<EmployeeLogin />} />
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/manager/*" element={<ManagerController />} />
          <Route path="/developer/*" element={<DeveloperController />} />
          <Route path="/employee/*" element={<EmployeeController />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
