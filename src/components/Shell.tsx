import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { LeftRail } from "./LeftRail";
import { Toaster } from "./Toast";
import { Titlebar } from "./Titlebar";

export function Shell() {
  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <div data-testid="desktop-titlebar-wrapper" className="hidden md:block">
        <Titlebar />
      </div>
      <div
        data-testid="shell-content-frame"
        className="flex flex-1 overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        <LeftRail />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
