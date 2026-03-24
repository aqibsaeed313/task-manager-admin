const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function employeeApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Employee specific API functions
export async function employeeLogin(username: string, password: string) {
  const res = await employeeApiFetch<{ token: string; user: { username: string; role: string } }>(
    "/api/auth/employee-login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }
  );
  return res;
}

export async function getEmployeeProfile() {
  return employeeApiFetch<{ item: { id: string; name: string; email: string; role: string } }>("/api/employees/profile");
}

export async function getEmployeeTasks() {
  return employeeApiFetch<{ items: Array<{ id: string; title: string; status: string; priority: string; dueDate: string }> }>("/api/employees/tasks");
}
