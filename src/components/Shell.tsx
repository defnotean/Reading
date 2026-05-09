import { Outlet } from "react-router-dom";
import { LeftRail } from "./LeftRail";

export function Shell() {
  return (
    <div className="h-full w-full flex bg-ink-950 text-ink-100">
      <LeftRail />
      <main className="flex-1 h-full overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}
