import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { setEmployeeAuth } from "../lib/auth";
import { employeeApiFetch } from "../lib/api";
import { Eye, EyeOff, User, Lock, ArrowLeft } from "lucide-react";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);

    try {
      // Use dedicated employee login endpoint
      const res = await employeeApiFetch<{ 
        item: { 
          token: string; 
          role: string;
          username: string;
          name: string;
        } 
      }>("/api/auth/employee-login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      // Store auth state
      setEmployeeAuth({
        token: res.item.token,
        username: res.item.username,
        name: res.item.name,
        role: "employee",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      // Store token in localStorage for API calls
      localStorage.setItem("token", res.item.token);

      // Navigate to employee dashboard
      navigate("/employee");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const goToAdminLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#133767] via-blue-900 to-[#133767] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={goToAdminLogin}
          className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Admin/Manager Login</span>
        </button>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex justify-center mb-4">
              <img
                src="/seven logo.png"
                alt="SE7EN Inc. logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-[#133767]">
              Employee Portal
            </CardTitle>
            <p className="text-center text-muted-foreground text-sm">
              Login with your employee credentials
            </p>
          </CardHeader>

          <CardContent className="pt-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#133767] hover:bg-[#1a4585]"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login as Employee"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-center text-xs text-muted-foreground">
                Are you an Admin or Manager?{" "}
                <button
                  onClick={goToAdminLogin}
                  className="text-[#133767] hover:underline font-medium"
                >
                  Login here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/60 text-xs mt-8">
          © {new Date().getFullYear()} SE7EN Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
