import { ReactNode, useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Context to share header height across components
const HeaderHeightContext = createContext<number>(144);

export function useHeaderHeight() {
  return useContext(HeaderHeightContext);
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(144);

  // Listen for header height updates
  useEffect(() => {
    const handleHeightUpdate = (e: CustomEvent) => {
      setHeaderHeight(e.detail?.height || 144);
    };
    window.addEventListener("header-height-changed", handleHeightUpdate as EventListener);
    return () => window.removeEventListener("header-height-changed", handleHeightUpdate as EventListener);
  }, []);

  return (
    <HeaderHeightContext.Provider value={headerHeight}>
      <div className="min-h-screen bg-[#e6f0ff]" style={{ paddingTop: `${headerHeight}px` }}>
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        <div className="flex items-start">
          <div className="hidden md:block fixed left-0 z-50 bg-gradient-to-b from-[#0b2f6b] via-[#10428b] to-[#0a2a5c] h-[calc(100vh-var(--header-height,144px))] w-56" style={{ top: `${headerHeight}px`, '--header-height': `${headerHeight}px` } as React.CSSProperties}>
            <Sidebar />
          </div>

          <main className={cn("flex-1 min-h-[calc(100vh-var(--header-height,144px))]", "md:ml-56")} style={{ '--header-height': `${headerHeight}px` } as React.CSSProperties}>
            <div className="w-full pr-4 py-2 sm:py-3 animate-fade-in">
              {children}
            </div>
          </main>
        </div>

        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar mode="mobile" onNavigate={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </HeaderHeightContext.Provider>
  );
}