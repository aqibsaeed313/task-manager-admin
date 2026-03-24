import { Navigate, Route, Routes } from "react-router-dom";
import EmployeeDashboard from "../screens/Dashboard";
import { getEmployeeAuth } from "../lib/auth";

function EmployeeController() {
  const employeeAuth = getEmployeeAuth();
  
  // Redirect to employee login if not authenticated
  if (!employeeAuth) {
    return <Navigate to="/login/employee" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<EmployeeDashboard />} />
      <Route path="/dashboard" element={<EmployeeDashboard />} />
      <Route path="*" element={<Navigate to="/employee" replace />} />
    </Routes>
  );
}

export default EmployeeController;
