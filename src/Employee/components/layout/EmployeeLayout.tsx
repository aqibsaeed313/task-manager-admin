import { ReactNode } from "react";
import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { clearEmployeeAuth } from "@/Employee/lib/auth";

interface EmployeeLayoutProps {
  children: ReactNode;
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearEmployeeAuth();
    navigate("/login/employee");
  };

  return (
    <div className="min-h-screen bg-[#e6f0ff]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 shadow-floating">
        <div className="w-full bg-gradient-to-r from-[#133767] via-[#133767] to-[#133767]">
          <div className="relative flex h-20 items-center justify-between px-4 sm:px-6 lg:px-10 py-2">
            {/* Left: Logo */}
            <div className="flex items-center z-10">
              <img
                src="/seven logo.png"
                alt="SE7EN Inc. logo"
                className="h-12 w-auto object-contain"
              />
            </div>

            {/* Center: Title */}
            <div className="absolute left-1/2 -translate-x-1/2 text-white font-semibold text-lg">
              Employee Portal
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 text-white z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </Button>

              <Avatar className="h-9 w-9 border border-white/70">
                <AvatarFallback className="bg-white/20 text-sm font-semibold text-white">
                  EP
                </AvatarFallback>
              </Avatar>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
