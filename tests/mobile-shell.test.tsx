import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav } from "../src/components/BottomNav";
import { LeftRail } from "../src/components/LeftRail";
import { Shell } from "../src/components/Shell";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

test("BottomNav renders touch primary destinations", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <BottomNav />
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/mobile primary/i)).toHaveClass("md:hidden");
  expect(screen.getByLabelText(/browse/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/library/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
});

test("BottomNav links navigate between primary app tabs", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <BottomNav />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByLabelText(/library/i));
  expect(screen.getByTestId("path")).toHaveTextContent("/library");

  fireEvent.click(screen.getByLabelText(/settings/i));
  expect(screen.getByTestId("path")).toHaveTextContent("/settings");

  fireEvent.click(screen.getByLabelText(/browse/i));
  expect(screen.getByTestId("path")).toHaveTextContent("/");
});

test("LeftRail is labelled and hidden on mobile widths", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LeftRail />
    </MemoryRouter>
  );

  expect(screen.getByLabelText(/desktop primary/i)).toHaveClass("hidden", "md:flex");
});

test("Shell mounts mobile navigation, desktop chrome wrapper, and safe-area content padding", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<p>Browse content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  const mobileNav = screen.getByLabelText(/mobile primary/i);
  const desktopNav = screen.getByLabelText(/desktop primary/i);
  const titlebarWrapper = screen.getByTestId("desktop-titlebar-wrapper");
  const contentFrame = screen.getByTestId("shell-content-frame");

  expect(within(mobileNav).getByLabelText(/browse/i)).toBeInTheDocument();
  expect(desktopNav).toHaveClass("hidden", "md:flex");
  expect(titlebarWrapper).toHaveClass("hidden", "md:block");
  expect(contentFrame).toHaveClass(
    "pb-[calc(4.25rem+env(safe-area-inset-bottom))]",
    "md:pb-0"
  );
});
