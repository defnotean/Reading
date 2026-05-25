import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { LeftRail } from "../src/components/LeftRail";

test("LeftRail renders three labelled destinations", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LeftRail />
    </MemoryRouter>
  );
  expect(screen.getByLabelText(/browse/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/library/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
});

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

test("LeftRail icon links navigate between primary app tabs", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LeftRail />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByLabelText(/library/i).querySelector("svg")!);
  expect(screen.getByTestId("path")).toHaveTextContent("/library");

  fireEvent.click(screen.getByLabelText(/settings/i).querySelector("svg")!);
  expect(screen.getByTestId("path")).toHaveTextContent("/settings");

  fireEvent.click(screen.getByLabelText(/browse/i).querySelector("svg")!);
  expect(screen.getByTestId("path")).toHaveTextContent("/");
});
