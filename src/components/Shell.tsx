import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { LeftRail } from "./LeftRail";
import { Toaster } from "./Toast";
import { Titlebar } from "./Titlebar";
import clsx from "clsx";
import { isMobileRuntime } from "../utils/platform";

export function Shell() {
  const mobileRuntime = isMobileRuntime();

  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <div
        data-testid="desktop-titlebar-wrapper"
        className={clsx("hidden", !mobileRuntime && "md:block")}
      >
        <Titlebar />
      </div>
      <div
        data-testid="shell-content-frame"
        className={clsx(
          "flex flex-1 overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))]",
          !mobileRuntime && "md:pb-0"
        )}
      >
        <LeftRail forceHidden={mobileRuntime} />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
      <BottomNav forceVisible={mobileRuntime} />
      <Toaster />
    </div>
  );
}
