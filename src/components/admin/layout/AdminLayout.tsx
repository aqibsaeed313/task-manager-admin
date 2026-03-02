import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content - Responsive margin */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out pt-14 sm:pt-16",
          // Mobile: No margin, sidebar slides over
          "ml-0",
          // Tablet/Desktop: Margin based on sidebar state
          sidebarCollapsed 
            ? "md:ml-[72px] lg:ml-20"  // Collapsed: 72px on tablet, 80px on desktop
            : "md:ml-64",              // Expanded: 256px on tablet/desktop
          // When sidebar is open on mobile, prevent body scroll
          sidebarOpen && "fixed inset-0 overflow-hidden md:static md:inset-auto md:overflow-auto"
        )}
      >
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main Content Area - Responsive padding */}
        <main 
          className={cn(
            "p-3 sm:p-4 md:p-5 lg:p-6",  // Responsive padding
            "min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]", // Full height minus header
            "animate-fade-in",
            // Add blur effect when sidebar is open on mobile
            sidebarOpen && "md:blur-none blur-[2px] transition-all duration-300"
          )}
        >
          {/* Content Wrapper - Max width for large screens */}
          <div className={cn(
            "mx-auto",
            "w-full",
            // Optional: Max width for very large screens
            "xl:max-w-7xl 2xl:max-w-screen-2xl"
          )}>
            {children}
          </div>
        </main>

        {/* Mobile Footer - Quick actions */}
        <div className="block md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 z-30">
          <div className="flex items-center justify-around">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-accent"
            >
              <span className="text-xs">Menu</span>
            </button>
            <div className="text-xs text-muted-foreground">
              © TaskFlow
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Scroll Lock - Prevent background scroll when sidebar is open */}
      {sidebarOpen && (
        <style>
          {`
            body {
              overflow: hidden;
            }
          `}
        </style>
      )}
    </div>
  );
}