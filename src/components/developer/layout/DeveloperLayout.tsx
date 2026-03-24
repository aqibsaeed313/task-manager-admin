import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DeveloperLayoutProps {
  children: ReactNode;
}

export function DeveloperLayout({ children }: DeveloperLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#e6f0ff] pt-20 sm:pt-24 md:pt-36">
      <Header onMenuClick={() => setMobileSidebarOpen(true)} />

      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <main className={cn("flex-1 min-h-[calc(100vh-9rem)]", "md:ml-56")}>
          <div className="w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-3 animate-fade-in">{children}</div>
        </main>
      </div>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar mode="mobile" onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
