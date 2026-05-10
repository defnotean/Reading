import { Outlet } from "react-router-dom";
import { LeftRail } from "./LeftRail";
import { Toaster } from "./Toast";
import { Titlebar } from "./Titlebar";

export function Shell() {
  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <LeftRail />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
